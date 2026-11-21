// Moonlit Vault — everything the player sees.
// One job: draw the night museum on a canvas — moonlit floor, walls,
// bushes and crates you can read at a glance, guards with their vision
// cones, the courier, the relics, the exit — plus the HUD and every
// screen (title, pause, caught, level clear, win).

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE } from './config.js';
import { GUARD_STATE } from './guards.js';

const FLOOR_A = '#2a2f45';
const FLOOR_B = '#262b40';
const DARK_FLOOR = '#1a1e30';
const WALL_TOP = '#4a4f6e';
const WALL_FACE = '#333752';
const WALL_TRIM = '#c9a86a';
const BUSH = '#2e5d3a';
const BUSH_LIGHT = '#3f7d4e';
const CRATE = '#6b4a2f';
const CRATE_LIGHT = '#8a623c';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(ctx, game.world);
    this.drawExit(ctx, game.world, game.exitOpen);
    this.drawRelics(ctx, game.world);
    this.drawCover(ctx, game.world);
    this.drawWalls(ctx, game.world);
    this.drawVisionCones(ctx, game.guards, game.world);
    this.drawPebble(ctx, game.player);
    this.drawGuards(ctx, game.guards);
    this.drawPlayer(ctx, game.player, game.world);
    this.drawMoonlight(ctx);
    this.drawHud(ctx, game);
    this.drawOverlays(ctx, game);
  }

  drawFloor(ctx, world) {
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const dark = world.isDark(tx, ty);
        ctx.fillStyle = dark ? DARK_FLOOR : (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        // faint stone seams
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
        if (dark) {
          ctx.fillStyle = 'rgba(120,140,255,0.05)';
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }
  }

  drawCover(ctx, world) {
    for (const key of world.bushes) {
      const [tx, ty] = key.split(',').map(Number);
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      ctx.fillStyle = BUSH;
      ctx.beginPath();
      ctx.arc(cx - 9, cy + 4, 12, 0, Math.PI * 2);
      ctx.arc(cx + 9, cy + 5, 12, 0, Math.PI * 2);
      ctx.arc(cx, cy - 8, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BUSH_LIGHT;
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 4, 5, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const key of world.crates) {
      const [tx, ty] = key.split(',').map(Number);
      const x = tx * TILE + 4;
      const y = ty * TILE + 4;
      ctx.fillStyle = CRATE;
      ctx.fillRect(x, y, TILE - 8, TILE - 8);
      ctx.fillStyle = CRATE_LIGHT;
      ctx.fillRect(x, y, TILE - 8, 6);
      ctx.strokeStyle = '#4a3018';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE - 10, TILE - 10);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + TILE - 8, y + TILE - 8);
      ctx.moveTo(x + TILE - 8, y);
      ctx.lineTo(x, y + TILE - 8);
      ctx.stroke();
    }
  }

  drawWalls(ctx, world) {
    for (const key of world.walls) {
      const [tx, ty] = key.split(',').map(Number);
      const x = tx * TILE;
      const y = ty * TILE;
      ctx.fillStyle = WALL_FACE;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(x, y, TILE, 8);
      ctx.fillStyle = WALL_TRIM;
      ctx.fillRect(x, y + 8, TILE, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }

  drawExit(ctx, world, open) {
    if (!world.exit) return;
    const cx = world.exit.x * TILE;
    const cy = world.exit.y * TILE;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = open ? '#1f7a4d' : '#3a3f5c';
    ctx.fillRect(-16, -18, 32, 36);
    ctx.strokeStyle = open ? '#7dffb0' : '#c9a86a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -18, 32, 36);
    ctx.fillStyle = open ? '#b8ffd4' : '#8a8fa8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'LOCK', 0, 4);
    if (open) {
      ctx.fillStyle = 'rgba(125,255,176,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(Date.now() / 300) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRelics(ctx, world) {
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const cx = relic.x * TILE;
      const cy = relic.y * TILE;
      const pulse = 1 + Math.sin(Date.now() / 250) * 0.12;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(120,220,255,0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9fe8ff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // A guard's vision cone: a wedge that stops at walls, drawn as a fan of
  // short rays so cover really does cut the cone short.
  drawVisionCones(ctx, guards, world) {
    for (const guard of guards) {
      const gx = guard.x * TILE;
      const gy = guard.y * TILE;
      const rangePx = GUARD_VIEW_RANGE * TILE;
      const rays = 26;
      const color =
        guard.state === GUARD_STATE.ALERT
          ? '255,70,70'
          : guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.INVESTIGATE
            ? '255,200,80'
            : '255,230,130';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      for (let i = 0; i <= rays; i++) {
        const a = guard.facing - GUARD_VIEW_HALF_ANGLE + (2 * GUARD_VIEW_HALF_ANGLE * i) / rays;
        const hit = this.castRay(world, guard, a, rangePx);
        ctx.lineTo(gx + Math.cos(a) * hit, gy + Math.sin(a) * hit);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(gx, gy, 8, gx, gy, rangePx);
      grad.addColorStop(0, `rgba(${color},0.34)`);
      grad.addColorStop(1, `rgba(${color},0.05)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // March along a ray in small steps; stop at the first sight-blocking tile.
  castRay(world, guard, angle, maxPx) {
    const step = 4;
    let d = 8;
    while (d < maxPx) {
      const px = (guard.x * TILE + Math.cos(angle) * d) / TILE;
      const py = (guard.y * TILE + Math.sin(angle) * d) / TILE;
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (world.blocksSight(tx, ty)) return d;
      d += step;
    }
    return maxPx;
  }

  drawGuards(ctx, guards) {
    for (const guard of guards) {
      const cx = guard.x * TILE;
      const cy = guard.y * TILE;
      ctx.save();
      ctx.translate(cx, cy);
      // body: a lantern guard in a dark blue coat
      ctx.fillStyle = '#2c3468';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8c877';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // helmet brim facing the patrol direction
      ctx.fillStyle = '#c9a86a';
      ctx.beginPath();
      ctx.arc(Math.cos(guard.facing) * 6, Math.sin(guard.facing) * 6, 5, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      const ex = Math.cos(guard.facing) * 4;
      const ey = Math.sin(guard.facing) * 4;
      ctx.beginPath();
      ctx.arc(ex - 3, ey - 3, 1.6, 0, Math.PI * 2);
      ctx.arc(ex + 3, ey - 3, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // detection meter above the guard's head
      if (guard.detection > 4) {
        const w = 34;
        const x = cx - w / 2;
        const y = cy - 26;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, 6);
        ctx.fillStyle = guard.detection >= 100 ? '#ff5252' : guard.detection >= 35 ? '#ffb020' : '#ffe082';
        ctx.fillRect(x + 1, y + 1, (w - 2) * (guard.detection / 100), 4);
      }
      // "?" while suspicious, "!" while alerted
      if (guard.state === GUARD_STATE.ALERT) {
        this.drawMark(ctx, cx, cy - 34, '!', '#ff5252');
      } else if (guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.INVESTIGATE) {
        this.drawMark(ctx, cx, cy - 34, '?', '#ffb020');
      }
    }
  }

  drawMark(ctx, x, y, text, color) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  drawPlayer(ctx, player, world) {
    const cx = player.x * TILE;
    const cy = player.y * TILE;
    const tile = world.tileOf(player.x, player.y);
    const hidden = world.isBush(tile.tx, tile.ty);
    ctx.save();
    ctx.globalAlpha = hidden ? 0.55 : 1;
    ctx.translate(cx, cy);
    // soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // hooded cloak
    ctx.fillStyle = player.sneaking ? '#5a3d7a' : '#7a4a9e';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(11, -4, 10, 9);
    ctx.lineTo(-10, 9);
    ctx.quadraticCurveTo(-11, -4, 0, -13);
    ctx.fill();
    // face in shadow, eyes glinting
    ctx.fillStyle = '#1c1426';
    ctx.beginPath();
    ctx.arc(player.facing * 2, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(player.facing * 2 - 2, -4, 1.2, 0, Math.PI * 2);
    ctx.arc(player.facing * 2 + 2, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // pebble count pips under the player while sneaking
    if (player.sneaking) {
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c9c9c9';
      ctx.fillText('sneaking', cx, cy + 26);
    }
  }

  drawPebble(ctx, player) {
    const p = player.pebblePosition();
    if (!p) return;
    const cx = p.x * TILE;
    const cy = p.y * TILE - p.z * TILE;
    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawMoonlight(ctx) {
    // A gentle vignette and two moonlight pools so the night reads.
    const grad = ctx.createRadialGradient(
      VIEW_W * 0.72, VIEW_H * 0.2, 40, VIEW_W * 0.72, VIEW_H * 0.2, 520,
    );
    grad.addColorStop(0, 'rgba(180,200,255,0.07)');
    grad.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const vig = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHud(ctx, game) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,24,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`MOONLIT VAULT  ·  ${game.levelName}`, 12, 22);
    ctx.textAlign = 'right';
    const relics = `◆ ${game.relicsTaken} / ${game.relicsTotal}`;
    const pebbles = `● pebbles ${game.pebbles}`;
    const lives = '♥'.repeat(game.lives) + '·'.repeat(Math.max(0, 3 - game.lives));
    ctx.fillText(`${relics}    ${pebbles}    ${lives}    ${game.timeText}`, VIEW_W - 12, 22);
    ctx.restore();

    // alarm banner while any guard is alerted
    if (game.anyAlerted) {
      ctx.save();
      ctx.fillStyle = 'rgba(160,20,20,0.85)';
      ctx.fillRect(VIEW_W / 2 - 130, 44, 260, 26);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('! SPOTTED — BREAK LINE OF SIGHT !', VIEW_W / 2, 62);
      ctx.restore();
    }

    // bottom hint line
    ctx.save();
    ctx.fillStyle = 'rgba(232,228,216,0.75)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'WASD / arrows move · Shift sneak · Click throws a pebble · M mute · P pause',
      VIEW_W / 2, VIEW_H - 10,
    );
    ctx.restore();
  }

  drawOverlays(ctx, game) {
    if (game.screen === 'title') this.drawTitle(ctx, game);
    else if (game.screen === 'paused') this.drawPanel(ctx, 'PAUSED', 'Press P to keep sneaking.');
    else if (game.screen === 'caught') {
      this.drawPanel(
        ctx, 'CAUGHT!',
        `A lantern guard caught Wren. ${game.lives > 0 ? 'Press R to try this hall again.' : 'No lives left — press R to start over.'}`,
      );
    } else if (game.screen === 'levelClear') {
      this.drawPanel(ctx, 'HALL CLEARED', 'Every moonstone is yours. Press Enter for the next hall.');
    } else if (game.screen === 'win') {
      this.drawPanel(
        ctx, 'THE VAULT IS YOURS',
        `Wren slipped out with all ${game.relicsTotalAll} moonstones, unseen. Press R to play again.`,
      );
    } else if (game.screen === 'gameover') {
      this.drawPanel(ctx, 'THE NIGHT WINS', 'Out of lives. Press R to try again from the first hall.');
    }
  }

  drawPanel(ctx, title, sub) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,6,16,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#f4ead2';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = '#cfc8b0';
    ctx.font = '16px sans-serif';
    ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 26);
    ctx.restore();
  }

  drawTitle(ctx, game) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,6,16,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('MOONLIT VAULT', VIEW_W / 2, 150);
    ctx.fillStyle = '#9fe8ff';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('a night courier’s quiet heist', VIEW_W / 2, 188);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '16px sans-serif';
    const lines = [
      'You are Wren, a courier who works after midnight.',
      'Slip through three halls of the Gilded Lantern museum,',
      'take every moonstone, and reach the green exit — unseen.',
      '',
      'Guards patrol with lantern cones. Bushes hide you, crates block',
      'their sight, dark floor slows their eyes. Shift sneaks quietly.',
      'Click anywhere to throw a pebble and pull a guard off your trail.',
      'If a guard’s meter fills, run — and break line of sight.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 240 + i * 24));
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Press ENTER to begin the heist', VIEW_W / 2, 470);
    ctx.fillStyle = '#8a8fa8';
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD / arrows move · Shift sneak · Click throws a pebble · M mute · P pause', VIEW_W / 2, 505);
    ctx.restore();
  }
}
