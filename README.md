# bluedot 2048

A single-page 2048 game built with **React + TypeScript** and Vite, styled to match the Bluedot design. No external runtime libraries — only React for the UI layer.

## Live demo

[https://bluedot-2048.vercel.app](https://bluedot-2048.vercel.app)

## Run locally

```bash
npm install
npm run dev
```

TypeScript is enforced via `tsconfig.json` with strict mode enabled.

Open [http://localhost:5173](http://localhost:5173).

### Other scripts

```bash
npm run build    # production build to dist/
npm run preview  # preview production build
npm test         # run tests (engine, reducer, persistence, swipe, App)
npm run lint     # ESLint
npm run format   # Prettier
```

## Approach

The game is split into two layers:

1. **Pure game engine** (`src/game/engine.ts`) — board state, tile spawning, move/merge logic, win/game-over detection. Deterministic when `idGen` and `rng` are injected; covered by Vitest unit tests.
2. **Pure reducer** (`src/game/reducer.ts`) — all state transitions (`MOVE` / `UNDO` / `NEW_GAME` / `CONTINUE`) as a side-effect-free `useReducer`, plus a single `canAcceptInput` guard shared with the input layer.
3. **React UI layer** (`src/hooks/useGame.ts` + components) — wires the reducer to keyboard and swipe input, exposes unlimited in-memory undo history, and persists best score / resumable games to a validated `localStorage` schema.

### Key decisions

- **Tile identity model** — each tile has a stable `id` so React can animate slides by reusing DOM nodes and updating `transform: translate(...)`.
- **Flat tile array** — only occupied cells are stored; the background grid is static CSS driven by `GRID_SIZE`.
- **Undo** — full move history stored as `{ tiles, score }` snapshots before every valid move (unlimited in memory for the current session).
- **Persistence** — `localStorage` keys `bluedot2048:best` and `bluedot2048:game` survive page reloads. Saved game payloads include a schema version and are validated at load time; invalid data falls back to a fresh game.
- **History cap on disk** — only the most recent 50 undo snapshots are written to `localStorage` to avoid storage limits; in-session undo remains unlimited.

## Features

- 4×4 grid with arrow-key / WASD controls
- Score tracking with best score across sessions
- Win detection at 2048 with "Keep going" option
- Game over detection
- New Game reset
- **Bonus:** swipe gestures on touch devices
- **Bonus:** unlimited undo

## Known limitations

- Font is Manrope/Poppins via Google Fonts; swap for the exact brand font if available.
- Merge animation shows a brief pop on the survivor tile; absorbed-tile ghost rendering is simplified.
- Undo history persisted to `localStorage` is capped at 50 snapshots; older undo steps are lost after a page reload, but remain available during the current session.
- Saved games from older schema versions are ignored until a migration is added.
