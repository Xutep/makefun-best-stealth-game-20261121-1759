// Moonlit Vault — synthesised sound.
// One job: every sound the game makes, built from WebAudio oscillators
// and noise, with no audio files at all. Nothing here loads over the
// network; the engine stays silent until the player first presses a key
// or clicks, as browsers require.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbientHum();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseBurst(dur, vol, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // A soft, low room tone that runs under the whole game.
  startAmbientHum() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
  }

  footstep(sneaking) {
    // A short filtered thud; quieter and softer while sneaking.
    this.noiseBurst(0.07, sneaking ? 0.05 : 0.14, sneaking ? 300 : 700);
  }

  pebbleThrow() {
    this.noiseBurst(0.12, 0.2, 2400);
    this.tone(1400, 0.09, 'sine', 0.06, 0, 900);
  }

  pebbleLand() {
    this.noiseBurst(0.09, 0.25, 1200);
    this.tone(320, 0.08, 'triangle', 0.12, 0, 180);
  }

  relicPickup() {
    this.tone(880, 0.14, 'sine', 0.16);
    this.tone(1318, 0.2, 'sine', 0.14, 0.09);
    this.tone(1760, 0.28, 'sine', 0.1, 0.18);
  }

  suspicious() {
    // A guard noticed something: a short rising two-note cue.
    this.tone(392, 0.12, 'triangle', 0.14);
    this.tone(523, 0.16, 'triangle', 0.14, 0.11);
  }

  alertSting() {
    // Spotted: a sharp dissonant sting.
    this.tone(233, 0.5, 'sawtooth', 0.12, 0, 466);
    this.tone(247, 0.5, 'sawtooth', 0.12, 0, 494);
    this.noiseBurst(0.3, 0.1, 900);
  }

  caught() {
    this.tone(330, 0.3, 'sawtooth', 0.14, 0, 110);
    this.tone(165, 0.6, 'sawtooth', 0.14, 0.25, 55);
  }

  exitOpen() {
    this.tone(523, 0.16, 'sine', 0.14);
    this.tone(659, 0.16, 'sine', 0.14, 0.12);
    this.tone(784, 0.3, 'sine', 0.14, 0.24);
  }

  winFanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.13, i * 0.13));
  }
}
