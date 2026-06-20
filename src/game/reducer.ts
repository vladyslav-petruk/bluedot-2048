import {
  canMove,
  clearAnimationFlags,
  createInitialTiles,
  move,
} from './engine';
import {
  hydrateState,
  readBestScore,
  readSavedGame,
} from './persistence';
import type { GameAction, GameState, GameStatus } from '../types/game';

function createIdGenerator(start = 1) {
  let nextId = start;
  return () => nextId++;
}

export function createFreshState(best: number): GameState {
  const idGen = createIdGenerator();
  const tiles = createInitialTiles(idGen);
  const maxId = tiles.reduce((max, t) => Math.max(max, t.id), 0);

  return {
    tiles,
    score: 0,
    best,
    status: 'playing',
    keepPlaying: false,
    history: [],
    nextId: maxId + 1,
  };
}

export function createInitialGameState(): GameState {
  const best = readBestScore();
  const saved = readSavedGame();
  return saved ? hydrateState(saved, best) : createFreshState(best);
}

/**
 * Single guard shared by the reducer and the input layer: a move is only
 * accepted while the game is playable.
 */
export function canAcceptInput(state: GameState): boolean {
  if (state.status === 'over') return false;
  if (state.status === 'won' && !state.keepPlaying) return false;
  return true;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createFreshState(state.best);

    case 'MOVE': {
      if (!canAcceptInput(state)) return state;

      let nextId = state.nextId;
      const idGen = () => nextId++;
      const result = move(state.tiles, action.payload, idGen);

      if (!result.moved) return state;

      const score = state.score + result.gained;
      const best = Math.max(state.best, score);
      const status: GameStatus =
        result.won && !state.keepPlaying
          ? 'won'
          : !canMove(result.tiles)
            ? 'over'
            : 'playing';

      return {
        ...state,
        tiles: result.tiles,
        score,
        best,
        status,
        nextId,
        history: [
          ...state.history,
          // Snapshot the pre-move board with animation flags cleared so an undo
          // never replays a stale spawn/merge pop.
          { tiles: clearAnimationFlags(state.tiles), score: state.score },
        ],
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;

      const previous = state.history[state.history.length - 1];

      return {
        ...state,
        tiles: clearAnimationFlags(previous.tiles),
        score: previous.score,
        status: 'playing',
        history: state.history.slice(0, -1),
      };
    }

    case 'CONTINUE':
      return {
        ...state,
        keepPlaying: true,
        // A winning move can fill the board with no moves left. Re-check so
        // dismissing the win overlay surfaces game over instead of a stuck
        // "playing" board that silently rejects every input.
        status: canMove(state.tiles) ? 'playing' : 'over',
      };

    default:
      return state;
  }
}
