# makefun-best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Xutep/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Xutep/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Moonlit Vault** — an original top-down stealth game. You are Wren, a night courier
who slips through three halls of the Gilded Lantern museum after midnight, takes
every moonstone relic, and reaches the green exit — unseen.

Guards patrol with lantern vision cones. Bushes hide you, crates block their
sight, dark floor slows their eyes. Sneak with Shift, throw pebbles (click) to
lure guards off your trail, and break line of sight when a guard's meter fills.
Three levels, three lives, a detection system that gives you a chance to recover,
and fully synthesised sound (footsteps, alert stings, relic chimes) made with
WebAudio — no audio files, no network requests. The whole game is plain static
files under `game/`: open `game/index.html` in a desktop browser and play.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or serve `game/` with any static HTTP server
and open `index.html` directly.

## Controls

- **WASD / arrows** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Click** — throw a pebble to distract a guard
- **P** — pause · **M** — mute · **R** — retry after being caught · **Enter** — start / next hall

## Layout

- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `game/index.html`, `game/style.css` — the page
- `game/src/config.js` — constants and the three level layouts
- `game/src/world.js` — level parsing, walls, cover, line of sight
- `game/src/guards.js` — patrol AI, vision cones, detection meter, alerts
- `game/src/player.js` — Wren: movement, sneaking, pebble throws
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/render.js` — canvas drawing, HUD, screens
- `game/src/main.js` — game loop, screens, level flow
- `screenshots/` — real renders of the game in a browser
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=ws5xj46w&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
