# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Build:**
```bash
npm run build   # runs tsc, compiles bot/**/*.ts → dist/
```

**Run the bot:**
```bash
npm run bot     # build + node bot/bot.js
```

**Debug mode (opens Playwright inspector):**
```bash
PWDEBUG=1 node bot/bot.js
```

**Required prerequisite — Chrome must be running with remote debugging enabled:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/colonist-chrome-debug
```

**Optional Docker environment:**
```bash
docker-compose up
```

There is no test framework configured.

## Architecture

This is a Playwright bot that plays [Colonist.io](https://colonist.io) (a web Catan implementation) by automating Chrome via the Chrome DevTools Protocol (CDP).

**Key design decision:** The bot connects to an *already-running* Chrome instance (`chromium.connectOverCDP('http://127.0.0.1:9222')`) rather than launching its own. This keeps the user logged in and lets them supervise the bot.

### Execution flow

```
bot.js (entry)
  └─ startGame.ts         → clicks through lobby UI to create a 1v1 ranked match
  └─ resolveColonistGamePage() → finds the game tab after lobby opens a new tab
  └─ decideMove.ts        → polling game loop (every 500ms): read → decide → act
        ├─ readGameState.ts   → parses Colonist.io DOM into a GameState object [STUB]
        └─ performAction.ts   → executes the chosen move via Playwright clicks [STUB]
  └─ gameStateLog.ts      → writes state snapshots to logs/game-state.log (text + JSON, overwrite)
```

### Type system (`bot/types/gameState.ts`)

`GameState` is the central data structure:
- **Board**: HexTiles (terrain, dice number, robber), Edges (roads), Vertices (settlements/cities), Ports, BoardGraph (adjacency list)
- **Players / Hand / Deck**: resource counts, dev cards, knights, VP
- **Phase / Dice**: current game phase, last dice roll

### Current development status

- **Complete**: Chrome CDP setup, lobby automation (`startGame.ts`), full type system, logging
- **TODO**: DOM parsing in `readGameState.ts`, strategy logic in `decideMove.ts`, action execution in `performAction.ts`

### `misc/` directory

Contains standalone reference implementations (`diceAlgo.ts`, `raceProbabilities.ts`) for a balanced/anti-cheating dice model and player-color enums. These are *not* imported by the main bot yet — they are reference algorithms for future integration.

### Colonist.io WebSocket protocol

Game state is delivered over `wss://socket.svr.colonist.io/` using MessagePack binary framing (first two messages are plain JSON). Key message types on channel `id:"130"`:

- `type:4` — full game state on match start (parsed by `wsGameState.handleFullState`)
- `type:91` — incremental diff after every move (parsed by `wsGameState.handleDiff`)
- `type:59`, `type:78`, `type:30` — bookkeeping, ignore for game state

### Board coordinate system

Tiles use 2D axial hex coordinates `(x, y)`. The board is a 3-4-5-4-3 arrangement:

| Row (y) | x range | width |
|---|---|---|
| y=-2 | 0 → 2 | 3 tiles (top row) |
| y=-1 | -1 → 2 | 4 tiles |
| y=0 | -2 → 2 | 5 tiles (middle) |
| y=1 | -2 → 1 | 4 tiles |
| y=2 | -2 → 0 | 3 tiles (bottom row) |

Each row shifts one step left as y increases. x increases rightward within a row.

**Terrain type mapping** (from WS `tileHexStates[i].type`):
`0=desert, 1=wood, 2=brick, 3=sheep, 4=wheat, 5=ore`

**Resource card type mapping** (from WS `resourceCards.cards` array values):
`1=wood, 2=brick, 3=sheep, 4=wheat, 5=ore`

**Port type mapping** (from WS `portEdgeStates[i].type`):
`1=any(3:1), 2=wood, 3=brick, 4=sheep, 5=wheat, 6=ore`

**Vertices** use `(x, y, z)` with `z ∈ {0,1}`. Each tile `(x,y)` owns exactly 2 vertices. 16 phantom positions (outside the tile grid) handle the outer boundary, giving 19×2 + 16 = 54 total.

The phantom positions reveal which direction each z points:
- `z=0` phantoms are on the **SW/south** boundary → z=0 is the SW-facing corner
- `z=1` phantoms are on the **NE/north** boundary → z=1 is the NE-facing corner

The other 4 corners of each tile are owned by adjacent tiles.

**Edges** use `(x, y, z)` with `z ∈ {0,1,2}`. Each tile owns exactly 3 edges. 15 phantom positions handle the outer boundary, giving 19×3 + 15 = 72 total.

Phantom positions split cleanly by z:
- `z=0` phantoms: **south** boundary
- `z=1` phantoms: **east/SE** boundary
- `z=2` phantoms: **NE** boundary

The complementary 3 directions (N, NW, SW-facing edges) are owned by adjacent tiles.

Exact physical corner/edge positions within a hex are inferred from the phantom boundary pattern — empirical verification (place a settlement, check which vertex ID appears in the diff) needed before building the adjacency graph.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GAME_STATE_POLL_MS` | `2500` | How often to log the game state snapshot |
