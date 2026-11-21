// Moonlit Vault — the game itself.
// One job: own the loop and the screens. It builds a level, steps the
// player and the guards, settles relics, pebbles, catches and exits, and
// hands the renderer one plain state object to draw. It also reads the
// ?shot= start|play|alert|win hook the maker uses to take real screenshots
// of the game's own code, and exposes window.__moonlitVault for playtests.

import { TILE, LEVELS, PLAYER_LIVES, validateLevels } from './config.js';
import { World } from './world.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sound = new SoundEngine();
input.onFirstGesture = () => sound.unlock();

class Game {
  constructor() {
    this.screen = 'title'; // title | playing | paused | caught | levelClear | win | gameover
    this.levelIndex = 0;
    this.lives = PLAYER_LIVES;
    this.elapsed = 0;
    this.exitOpen = false;
    this.anyAlerted = false;
    this.levelName = LEVELS[0].name;
    this.relicsTaken = 0;
    this.relicsTotal = 0;
    this.relicsTotalAll = LEVELS.reduce((n, l) => n + (l.grid.join('').match(/R/g) || []).length, 0);
    this.pebbles = 0;
    this.timeText = '0:00';
    this.loadLevel(0);
    this.applyShotParam();
  }

  get world() {
    return this._world;
  }

  get guards() {
    return this._guards;
  }

  get player() {
    return this._player;
  }

  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.levelName = def.name;
    this._world = new World(def);
    this._guards = def.guards.map((g) => new Guard(g));
    this._player = new Player(this._world);
    this.exitOpen = false;
    this.anyAlerted = false;
    this.relicsTaken = 0;
    this.relicsTotal = this._world.relics.length;
    this.pebbles = this._player.pebbles;
    this.elapsed = 0;
  }

  // Screenshot hook: ?shot=play drops Wren mid-hall with a patrol in
  // view; ?shot=alert shows a guard mid-chase; ?shot=win shows the win
  // screen. All three are the same code paths the player reaches.
  applyShotParam() {
    const shot = new URLSearchParams(window.location.search).get('shot');
    if (!shot) return;
    if (shot === 'play') {
      this.screen = 'playing';
      this._player.x = 10.5;
      this._player.y = 9.5;
      this._player.sneaking = true;
      this._world.relics[0].taken = true;
      this.relicsTaken = 1;
      const guard = this._guards[0];
      guard.x = 12.5;
      guard.y = 9.5;
      guard.facing = Math.PI;
      guard.detection = 55;
      guard.state = GUARD_STATE.SUSPICIOUS;
    } else if (shot === 'alert') {
      this.loadLevel(1);
      this.screen = 'playing';
      // Same open room, clear line of sight: the guard chases down at Wren.
      this._player.x = 19.5;
      this._player.y = 11.5;
      const guard = this._guards[0];
      guard.x = 19.5;
      guard.y = 7.5;
      guard.facing = Math.PI / 2;
      guard.detection = 100;
      guard.state = GUARD_STATE.ALERT;
      guard.lastSeen = { x: this._player.x, y: this._player.y };
      guard.memoryTimer = 4;
      this.anyAlerted = true;
    } else if (shot === 'win') {
      this.screen = 'win';
    } else if (shot === 'start') {
      this.screen = 'playing';
    }
  }

  startGame() {
    this.lives = PLAYER_LIVES;
    this.loadLevel(0);
    this.screen = 'playing';
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = 'playing';
  }

  update(dt) {
    if (this.screen !== 'playing') return;
    this.elapsed += dt;
    const mins = Math.floor(this.elapsed / 60);
    const secs = Math.floor(this.elapsed % 60);
    this.timeText = `${mins}:${secs.toString().padStart(2, '0')}`;

    const thrown = this.handleClicks();
    const result = this._player.update(dt, this._world, input, sound);
    if (result && result.pebbleLanded) this.noiseAt(result.pebbleLanded);

    // Relic pickup.
    for (const relic of this._world.relics) {
      if (relic.taken) continue;
      if (Math.hypot(relic.x - this._player.x, relic.y - this._player.y) < 0.7) {
        relic.taken = true;
        this.relicsTaken += 1;
        sound.relicPickup();
        if (this._world.relicsLeft === 0) {
          this.exitOpen = true;
          sound.exitOpen();
        }
      }
    }

    // Guards.
    this.anyAlerted = false;
    for (const guard of this._guards) {
      const outcome = guard.update(dt, this._world, this._player, sound);
      if (guard.justSuspicious) sound.suspicious();
      if (guard.state === GUARD_STATE.ALERT) this.anyAlerted = true;
      if (outcome === 'caught') {
        this.onCaught();
        return;
      }
    }

    // Exit: open only once every relic is taken.
    if (this.exitOpen && this._world.exit) {
      const d = Math.hypot(this._world.exit.x - this._player.x, this._world.exit.y - this._player.y);
      if (d < 0.8) {
        if (this.levelIndex + 1 < LEVELS.length) {
          this.screen = 'levelClear';
        } else {
          this.screen = 'win';
          sound.winFanfare();
        }
      }
    }
    this.pebbles = this._player.pebbles;
    void thrown;
  }

  handleClicks() {
    let threw = false;
    let click;
    while ((click = input.consumeClick())) {
      if (this.screen !== 'playing') continue;
      const tx = Math.floor(click.px / TILE);
      const ty = Math.floor(click.py / TILE);
      const target = this._player.throwPebble(tx, ty, sound);
      if (target) threw = true;
    }
    return threw;
  }

  noiseAt(point) {
    const tx = Math.floor(point.x);
    const ty = Math.floor(point.y);
    for (const guard of this._guards) guard.hearNoise(this._world, tx, ty);
  }

  onCaught() {
    sound.caught();
    this.lives -= 1;
    this.screen = this.lives > 0 ? 'caught' : 'gameover';
  }

  onKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      if (this.screen === 'title') this.startGame();
      else if (this.screen === 'levelClear') {
        this.loadLevel(this.levelIndex + 1);
        this.screen = 'playing';
      }
    } else if (key === 'r') {
      if (this.screen === 'caught') this.restartLevel();
      else if (this.screen === 'gameover' || this.screen === 'win') this.startGame();
    } else if (key === 'p') {
      if (this.screen === 'playing') this.screen = 'paused';
      else if (this.screen === 'paused') this.screen = 'playing';
    } else if (key === 'm') {
      sound.toggleMute();
    }
  }
}

const game = new Game();
window.addEventListener('keydown', (e) => game.onKeyDown(e));

// Debug handle for playtests: the real live state, nothing staged.
window.__moonlitVault = game;

const configError = validateLevels();
if (configError) {
  document.getElementById('error').textContent = `Level error: ${configError}`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  renderer.draw(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
