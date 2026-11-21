// Moonlit Vault — configuration and level data.
// One job: every number and every level layout lives here, nowhere else.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 600

export const PLAYER_SPEED = 3.4; // tiles per second, walking
export const PLAYER_SNEAK_SPEED = 1.9; // tiles per second, sneaking
export const PEBBLE_MAX = 5;
export const PEBBLE_RANGE_TILES = 7;
export const PLAYER_LIVES = 3;

export const GUARD_VIEW_RANGE = 5.6; // tiles
export const GUARD_VIEW_HALF_ANGLE = 0.62; // radians (~35 degrees each side)
export const GUARD_HEAR_RANGE = 6.5; // tiles
export const DETECT_RATE_BASE = 55; // meter points per second at point blank
export const DETECT_DECAY = 26; // meter points per second while unseen
export const BUSH_DETECT_FACTOR = 0.18; // how much slower detection is inside a bush
export const DARK_DETECT_FACTOR = 0.55; // how much slower detection is in a dark zone
export const SNEAK_DETECT_FACTOR = 0.6; // how much slower detection is while sneaking
export const ALERT_MEMORY_SECONDS = 4; // how long a guard keeps chasing after losing sight
export const CATCH_DISTANCE = 0.62; // tiles

// Tile legend for the level strings below:
//   #  wall (blocks movement and sight)
//   .  floor
//   B  bush (cover: hides the player, blocks sight, walkable)
//   C  crate (cover: blocks movement and sight)
//   D  dark floor (shadow: detection grows slower here)
//   R  moonstone relic (collect all to open the exit)
//   E  exit door (opens once every relic is taken)
//   P  player start
//   G  guard spawn (patrol waypoints are listed per level)

export const LEVELS = [
  {
    name: 'I — Hall of Echoes',
    hint: 'Learn the patrols. Bushes hide you, crates block sight.',
    grid: [
      '########################',
      '#P....#......B....R....#',
      '#.....#...........#....#',
      '#..C..#..B....#........#',
      '#.....#.......#..C.....#',
      '#..B..#...G...#........#',
      '#.....#.......#........#',
      '###.#####.#####.###....#',
      '#......................#',
      '#..C.....B....#...R....#',
      '#.......#.....#........#',
      '#..G....#..B..#..##....#',
      '#.......#.....#........#',
      '#..B....#..R.....E.....#',
      '########################',
    ],
    guards: [
      {
        x: 11, y: 5, speed: 1.5, pause: 1.2,
        waypoints: [[11, 5], [11, 2], [15, 2], [15, 5]],
      },
      {
        x: 3, y: 11, speed: 1.4, pause: 1.6,
        waypoints: [[3, 11], [7, 11], [7, 13], [3, 13]],
      },
    ],
  },
  {
    name: 'II — The Sunken Gallery',
    hint: 'Dark floor slows their eyes. Pebbles pull guards away.',
    grid: [
      '########################',
      '#P...D....#.....B..R...#',
      '#.......D.#............#',
      '#..C....D.#..C....#....#',
      '#.......D.#.......#....#',
      '#..B....D....G....#....#',
      '#.......D.#.......#....#',
      '####.######.####.##....#',
      '#....D..........D......#',
      '#.B..D..C....#..D.R....#',
      '#....D.......#..D......#',
      '#.G..D....B..#..D......#',
      '#....D.......#..D.##...#',
      '#....D..R....#..D.E....#',
      '########################',
    ],
    guards: [
      {
        x: 13, y: 5, speed: 1.7, pause: 1.0,
        waypoints: [[13, 5], [13, 2], [18, 2], [18, 5]],
      },
      {
        x: 2, y: 11, speed: 1.6, pause: 1.4,
        waypoints: [[2, 11], [6, 11], [6, 13], [2, 13]],
      },
      {
        x: 12, y: 9, speed: 1.8, pause: 0.8,
        waypoints: [[12, 9], [16, 9], [16, 12], [12, 12]],
      },
    ],
  },
  {
    name: 'III — The Vault of Moons',
    hint: 'Four guards, tight patrols. Patience wins the vault.',
    grid: [
      '########################',
      '#P...#....B...#...R....#',
      '#....#........#........#',
      '#.C..#..G.....#..C.....#',
      '#....#........#........#',
      '#.B..#....D...#...G....#',
      '#....#....D...#........#',
      '###.####.#######.##....#',
      '#......D.........D.....#',
      '#..C...D..B..#..D.R....#',
      '#......D.....#..D......#',
      '#..G...D..C..#..D......#',
      '#......D.....#..D.##...#',
      '#..B...D..R..#..D.E....#',
      '########################',
    ],
    guards: [
      {
        x: 9, y: 3, speed: 1.9, pause: 0.9,
        waypoints: [[9, 3], [9, 5], [13, 5], [13, 3]],
      },
      {
        x: 19, y: 5, speed: 1.8, pause: 1.0,
        waypoints: [[19, 5], [19, 2], [21, 2], [21, 5]],
      },
      {
        x: 3, y: 11, speed: 1.9, pause: 0.8,
        waypoints: [[3, 11], [6, 11], [6, 13], [3, 13]],
      },
      {
        x: 14, y: 10, speed: 2.0, pause: 0.7,
        waypoints: [[14, 10], [18, 10], [18, 12], [14, 12]],
      },
    ],
  },
];

// Sanity: every level grid must be exactly ROWS rows of COLS characters.
export function validateLevels() {
  for (const level of LEVELS) {
    if (level.grid.length !== ROWS) return `level ${level.name}: ${level.grid.length} rows, want ${ROWS}`;
    for (let r = 0; r < ROWS; r++) {
      if (level.grid[r].length !== COLS) {
        return `level ${level.name} row ${r}: ${level.grid[r].length} chars, want ${COLS}`;
      }
    }
  }
  return null;
}
