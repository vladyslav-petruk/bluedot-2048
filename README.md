# bluedot 2048

A single-page 2048 game built with **React + TypeScript** and Vite, styled to match the Bluedot design. No external runtime libraries — only React for the UI layer.

## Live demo

Deploy the `dist` folder to Vercel, Netlify, or any static host. After deploying, add your live URL here.

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
npm test         # run game engine unit tests
```

## Approach

The game is split into two layers:

1. **Pure game engine** (`src/game/engine.js`) — board state, tile spawning, move/merge logic, win/game-over detection. Fully side-effect free and covered by Vitest unit tests.
2. **React UI layer** (`src/hooks/useGame.js` + components) — state orchestration via `useReducer`, keyboard and swipe input, unlimited undo history, and `localStorage` persistence for best score and resumable games.

### Key decisions

- **Tile identity model** — each tile has a stable `id` so React can animate slides by reusing DOM nodes and updating `transform: translate(...)`.
- **Flat tile array** — only occupied cells are stored; the 16-cell background grid is static CSS.
- **Undo** — full move history stored as `{ tiles, score }` snapshots before every valid move.
- **Persistence** — `localStorage` keys `bluedot2048:best` and `bluedot2048:game` survive page reloads.

## Features

- 4×4 grid with arrow-key / WASD controls
- Score tracking with best score across sessions
- Win detection at 2048 with "Keep going" option
- Game over detection
- New Game reset
- **Bonus:** swipe gestures on touch devices
- **Bonus:** unlimited undo

## Known limitations

- Font is Poppins (Google Fonts) as an approximation of the design wordmark; swap if the exact brand font is available.
- Merge animation shows a brief pop on the survivor tile; absorbed-tile ghost rendering is simplified.
- Deploy URL must be added after hosting setup.

## Deploy

### Vercel / Netlify

1. Push this repo to GitHub.
2. Import the project in Vercel or Netlify.
3. Build command: `npm run build`
4. Output directory: `dist`

No extra configuration required — Vite's default output works out of the box.
