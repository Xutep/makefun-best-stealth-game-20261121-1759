// Moonlit Vault — the player.
// One job: Wren the night courier. Walk, sneak, throw pebbles to lure
// guards away, pick up moonstone relics, and slip out of the exit.

import {
  PLAYER_SPEED,
  PLAYER_SNEAK_SPEED,
  PEBBLE_MAX,
  PEBBLE_RANGE_TILES,
} from './config.js';

export class Player {
  constructor(world) {
    this.reset(world);
  }

  reset(world) {
    this.x = world.playerStart.x;
    this.y = world.playerStart.y;
    this.sneaking = false;
    this.moving = false;
    this.pebbles = PEBBLE_MAX;
    this.stepPhase = 0;
    this.facing = 1; // 1 = right, -1 = left, for the drawn figure
    this.pebbleFlight = null; // {x0, y0, x1, y1, t} while a pebble flies
  }

  update(dt, world, input, sound) {
    const mv = input.moveVector();
    this.moving = mv.x !== 0 || mv.y !== 0;
    this.sneaking = input.sneak;
    if (mv.x !== 0) this.facing = mv.x > 0 ? 1 : -1;

    if (this.moving) {
      const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
      const moved = world.moveCircle(this.x, this.y, mv.x * speed * dt, mv.y * speed * dt, 0.3);
      const stepped = Math.hypot(moved.x - this.x, moved.y - this.y);
      this.x = moved.x;
      this.y = moved.y;
      this.stepPhase += stepped;
      if (sound && this.stepPhase > 1.1) {
        this.stepPhase = 0;
        sound.footstep(this.sneaking);
      }
    }

    // A flying pebble: advance it, land it, and tell the caller where.
    if (this.pebbleFlight) {
      this.pebbleFlight.t += dt / 0.45;
      if (this.pebbleFlight.t >= 1) {
        const landed = { x: this.pebbleFlight.x1, y: this.pebbleFlight.y1 };
        this.pebbleFlight = null;
        if (sound) sound.pebbleLand();
        return { pebbleLanded: landed };
      }
    }
    return null;
  }

  // Throw a pebble toward a tile the player clicked. Returns the target
  // tile, or null when out of pebbles or out of range.
  throwPebble(tx, ty, sound) {
    if (this.pebbles <= 0 || this.pebbleFlight) return null;
    const dist = Math.hypot(tx + 0.5 - this.x, ty + 0.5 - this.y);
    if (dist > PEBBLE_RANGE_TILES) return null;
    this.pebbles -= 1;
    this.pebbleFlight = {
      x0: this.x, y0: this.y,
      x1: tx + 0.5, y1: ty + 0.5,
      t: 0,
    };
    if (sound) sound.pebbleThrow();
    return { x: tx + 0.5, y: ty + 0.5 };
  }

  // Current pebble position while it flies, for the renderer.
  pebblePosition() {
    if (!this.pebbleFlight) return null;
    const f = this.pebbleFlight;
    const t = Math.min(1, f.t);
    const arc = Math.sin(t * Math.PI) * 0.6; // height of the throw, in tiles
    return {
      x: f.x0 + (f.x1 - f.x0) * t,
      y: f.y0 + (f.y1 - f.y0) * t,
      z: arc,
    };
  }
}
