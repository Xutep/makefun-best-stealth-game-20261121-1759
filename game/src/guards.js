// Moonlit Vault — guard patrols and the detection system.
// One job: move each guard along its patrol, keep its vision cone honest
// (range, angle, line of sight, cover and darkness all matter), and turn
// what a guard sees into a detection meter, an alert, a chase, or a catch.

import {
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_HEAR_RANGE,
  DETECT_RATE_BASE,
  DETECT_DECAY,
  BUSH_DETECT_FACTOR,
  DARK_DETECT_FACTOR,
  SNEAK_DETECT_FACTOR,
  ALERT_MEMORY_SECONDS,
  CATCH_DISTANCE,
} from './config.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
  INVESTIGATE: 'investigate',
};

export class Guard {
  constructor(def) {
    this.x = def.x + 0.5;
    this.y = def.y + 0.5;
    this.speed = def.speed;
    this.pause = def.pause;
    this.waypoints = def.waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    this.wpIndex = 0;
    this.waitTimer = 0;
    this.facing = -Math.PI / 2; // start looking up
    this.scanPhase = Math.random() * Math.PI * 2;
    this.state = GUARD_STATE.PATROL;
    this.detection = 0; // 0..100, fills while the player is seen
    this.lastSeen = null; // {x, y} of the player's last seen position
    this.memoryTimer = 0; // counts down while chasing without sight
    this.investigateTarget = null; // {x, y} a noise sent this guard to
    this.stepPhase = 0; // footstep timing while walking
    this.justSpotted = false; // set once when detection crosses 100
    this.justSuspicious = false; // set once when detection crosses 35
  }

  // True when the player stands inside this guard's cone and a wall,
  // crate or bush does not block the line of sight.
  canSeePlayer(world, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return false;
    if (dist < 0.45) return true; // too close to miss
    const angleTo = Math.atan2(dy, dx);
    let diff = angleTo - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return false;
    return world.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  // How fast the detection meter grows right now, 0 when the player is
  // not visible. Closer is worse; sneaking, bushes and dark floor help.
  detectionRate(world, player, dist) {
    const closeness = 1 - dist / (GUARD_VIEW_RANGE + 1.2);
    let rate = DETECT_RATE_BASE * (0.35 + 0.65 * Math.max(0, closeness));
    const tile = world.tileOf(player.x, player.y);
    if (world.isBush(tile.tx, tile.ty)) rate *= BUSH_DETECT_FACTOR;
    else if (world.isDark(tile.tx, tile.ty)) rate *= DARK_DETECT_FACTOR;
    if (player.sneaking) rate *= SNEAK_DETECT_FACTOR;
    if (player.moving) rate *= 1.15;
    return rate;
  }

  hearNoise(world, tx, ty) {
    const dist = Math.hypot(tx + 0.5 - this.x, ty + 0.5 - this.y);
    if (dist > GUARD_HEAR_RANGE) return false;
    if (this.state === GUARD_STATE.ALERT) return false; // already chasing
    this.investigateTarget = { x: tx + 0.5, y: ty + 0.5 };
    this.state = GUARD_STATE.INVESTIGATE;
    this.waitTimer = 0;
    return true;
  }

  update(dt, world, player, sound) {
    this.justSpotted = false;
    this.justSuspicious = false;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const sees = this.canSeePlayer(world, player);

    if (sees) {
      const before = this.detection;
      this.detection = Math.min(100, this.detection + this.detectionRate(world, player, dist) * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.memoryTimer = ALERT_MEMORY_SECONDS;
      if (before < 35 && this.detection >= 35 && this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.SUSPICIOUS;
        this.justSuspicious = true;
      }
      if (before < 100 && this.detection >= 100) {
        this.state = GUARD_STATE.ALERT;
        this.justSpotted = true;
        if (sound) sound.alertSting();
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY * dt);
      if (this.state === GUARD_STATE.SUSPICIOUS && this.detection < 12) {
        this.state = GUARD_STATE.PATROL;
      }
      if (this.state === GUARD_STATE.ALERT) {
        this.memoryTimer -= dt;
        if (this.memoryTimer <= 0) {
          this.state = this.investigateTarget ? GUARD_STATE.INVESTIGATE : GUARD_STATE.PATROL;
          this.lastSeen = null;
        }
      }
    }

    // Movement by state.
    if (this.state === GUARD_STATE.ALERT && this.lastSeen) {
      this.moveToward(world, this.lastSeen.x, this.lastSeen.y, this.speed * 1.45, dt);
      this.facePoint(this.lastSeen.x, this.lastSeen.y);
    } else if (this.state === GUARD_STATE.INVESTIGATE && this.investigateTarget) {
      const arrived = this.moveToward(
        world, this.investigateTarget.x, this.investigateTarget.y, this.speed * 1.15, dt,
      );
      if (arrived) {
        this.waitTimer += dt;
        this.scan(dt);
        if (this.waitTimer > 2.2) {
          this.investigateTarget = null;
          this.state = GUARD_STATE.PATROL;
          this.waitTimer = 0;
        }
      }
    } else {
      this.patrol(world, dt, sound);
    }

    // Caught: the guard reached the player (distance recomputed after moving).
    const nowDist = Math.hypot(player.x - this.x, player.y - this.y);
    if (nowDist < CATCH_DISTANCE && this.state === GUARD_STATE.ALERT) return 'caught';
    if (nowDist < CATCH_DISTANCE * 0.8) return 'caught';
    return null;
  }

  moveToward(world, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const moved = world.moveCircle(this.x, this.y, nx - this.x, ny - this.y, 0.3);
    this.x = moved.x;
    this.y = moved.y;
    this.facePoint(tx, ty);
    this.stepPhase += step;
    return dist - step < 0.08;
  }

  facePoint(tx, ty) {
    this.facing = Math.atan2(ty - this.y, tx - this.x);
  }

  // Slowly sweep the cone left and right while standing still.
  scan(dt) {
    this.scanPhase += dt * 1.4;
    this.facing += Math.sin(this.scanPhase) * dt * 0.9;
  }

  patrol(world, dt, sound) {
    const target = this.waypoints[this.wpIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) {
      this.waitTimer += dt;
      this.scan(dt);
      if (this.waitTimer >= this.pause) {
        this.waitTimer = 0;
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      }
      return;
    }
    const step = Math.min(dist, this.speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const moved = world.moveCircle(this.x, this.y, nx - this.x, ny - this.y, 0.3);
    this.x = moved.x;
    this.y = moved.y;
    this.facePoint(target.x, target.y);
    this.stepPhase += step;
    if (sound && this.stepPhase > 1.6) {
      this.stepPhase = 0;
      sound.footstep(false);
    }
  }
}
