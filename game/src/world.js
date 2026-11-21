// Moonlit Vault — the level world.
// One job: turn a level's grid strings into walls, cover, relics and the
// exit, and answer the questions the rest of the game asks about tiles:
// is this tile solid, does it block sight, is the player hidden here, and
// is there a clear line of sight between two points?

import { COLS, ROWS } from './config.js';

export class World {
  constructor(levelDef) {
    this.walls = new Set(); // "x,y" of solid tiles
    this.bushes = new Set(); // "x,y" of hiding cover
    this.crates = new Set(); // "x,y" of sight-blocking cover
    this.dark = new Set(); // "x,y" of shadow floor
    this.relics = []; // {x, y, taken}
    this.exit = null; // {x, y}
    this.playerStart = { x: 1.5, y: 1.5 };

    levelDef.grid.forEach((row, y) => {
      for (let x = 0; x < COLS; x++) {
        const ch = row[x];
        const key = `${x},${y}`;
        if (ch === '#') this.walls.add(key);
        else if (ch === 'B') this.bushes.add(key);
        else if (ch === 'C') this.crates.add(key);
        else if (ch === 'D') this.dark.add(key);
        else if (ch === 'R') this.relics.push({ x: x + 0.5, y: y + 0.5, taken: false });
        else if (ch === 'E') this.exit = { x: x + 0.5, y: y + 0.5 };
        else if (ch === 'P') this.playerStart = { x: x + 0.5, y: y + 0.5 };
        // 'G' and '.' are plain floor: guards spawn from the level's own list.
      }
    });
  }

  inBounds(tx, ty) {
    return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS;
  }

  isWall(tx, ty) {
    return !this.inBounds(tx, ty) || this.walls.has(`${tx},${ty}`);
  }

  isSolid(tx, ty) {
    return this.isWall(tx, ty) || this.crates.has(`${tx},${ty}`);
  }

  blocksSight(tx, ty) {
    return this.isWall(tx, ty) || this.crates.has(`${tx},${ty}`) || this.bushes.has(`${tx},${ty}`);
  }

  isBush(tx, ty) {
    return this.bushes.has(`${tx},${ty}`);
  }

  isDark(tx, ty) {
    return this.dark.has(`${tx},${ty}`);
  }

  tileOf(px, py) {
    return { tx: Math.floor(px), ty: Math.floor(py) };
  }

  // Can a circle of the given radius stand at (px, py) without touching a
  // solid tile? Checked tile by tile around the circle's bounding box.
  canStand(px, py, radius) {
    const x0 = Math.floor(px - radius);
    const x1 = Math.floor(px + radius);
    const y0 = Math.floor(py - radius);
    const y1 = Math.floor(py + radius);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        const cx = Math.max(tx, Math.min(px, tx + 1));
        const cy = Math.max(ty, Math.min(py, ty + 1));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < radius * radius) return false;
      }
    }
    return true;
  }

  // Slide-aware movement: try the full step, then each axis on its own,
  // so the player and the guards slide along walls instead of sticking.
  moveCircle(px, py, dx, dy, radius) {
    if (this.canStand(px + dx, py + dy, radius)) return { x: px + dx, y: py + dy };
    if (this.canStand(px + dx, py, radius)) return { x: px + dx, y: py };
    if (this.canStand(px, py + dy, radius)) return { x: px, y: py + dy };
    return { x: px, y: py };
  }

  // Line of sight between two points in tile units, sampled finely enough
  // that no wall or crate between them is missed.
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist * 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor(x0 + dx * t);
      const ty = Math.floor(y0 + dy * t);
      if (this.blocksSight(tx, ty)) return false;
    }
    return true;
  }

  get relicsLeft() {
    return this.relics.filter((r) => !r.taken).length;
  }
}
