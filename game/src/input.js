// Moonlit Vault — keyboard and mouse input.
// One job: remember which keys are held and where the mouse clicked,
// and hand the game clean questions (move direction, sneak held, a pebble
// was thrown at this tile) instead of raw DOM events.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.sneak = false;
    this.clickQueue = []; // {tx, ty} tile clicks, consumed by the game loop
    this.anyKeyPressed = false;
    this.onFirstGesture = null; // called once, to unlock audio

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        this.anyKeyPressed = true;
        this.unlockAudio();
        if (e.key === 'Shift') this.sneak = true;
      }
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.sneak = false;
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.sneak = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.unlockAudio();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      this.clickQueue.push({ px, py });
    });
  }

  unlockAudio() {
    if (this.onFirstGesture) {
      const fn = this.onFirstGesture;
      this.onFirstGesture = null;
      fn();
    }
  }

  // Normalised WASD / arrow movement vector, {x, y} in -1..1.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  consumeClick() {
    return this.clickQueue.shift() ?? null;
  }

  wasPressed(key) {
    return this.keys.has(key.toLowerCase());
  }
}
