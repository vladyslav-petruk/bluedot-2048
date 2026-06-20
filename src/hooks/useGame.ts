import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  canMove,
  cloneTilesForHistory,
  createInitialTiles,
  move,
} from '../game/engine';
import { STORAGE_KEYS } from '../game/constants';
import type { Direction, GameSnapshot, GameState, GameStatus } from '../types/game';

type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'MOVE'; payload: Direction }
  | { type: 'UNDO' }
  | { type: 'CONTINUE' };

function createIdGenerator(start = 1) {
  let nextId = start;
  return () => nextId++;
}

function readBestScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.best);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function readSavedGame(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.game);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistGame(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEYS.best, String(state.best));
    localStorage.setItem(
      STORAGE_KEYS.game,
      JSON.stringify({
        tiles: state.tiles,
        score: state.score,
        status: state.status,
        keepPlaying: state.keepPlaying,
        history: state.history,
      }),
    );
  } catch {
    // ignore storage failures
  }
}

function createFreshState(best: number): GameState {
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

function hydrateState(saved: Partial<GameState>, best: number): GameState {
  const tiles = saved.tiles ?? [];
  const maxId = tiles.reduce((max, tile) => Math.max(max, tile.id), 0);

  return {
    tiles,
    score: saved.score ?? 0,
    best: Math.max(best, saved.score ?? 0),
    status: (saved.status as GameStatus) ?? 'playing',
    keepPlaying: saved.keepPlaying ?? false,
    history: (saved.history as GameSnapshot[]) ?? [],
    nextId: maxId + 1,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const fresh = createFreshState(state.best);
      persistGame(fresh);
      return fresh;
    }

    case 'MOVE': {
      if (state.status === 'over' || (state.status === 'won' && !state.keepPlaying)) {
        return state;
      }

      let nextId = state.nextId;
      const idGen = () => nextId++;
      const result = move(state.tiles, action.payload, idGen);

      if (!result.moved) return state;

      const score = state.score + result.gained;
      const best = Math.max(state.best, score);
      let status: GameStatus = state.status;

      if (result.won && !state.keepPlaying) {
        status = 'won';
      } else if (!canMove(result.tiles)) {
        status = 'over';
      } else {
        status = 'playing';
      }

      return {
        ...state,
        tiles: result.tiles,
        score,
        best,
        status,
        nextId,
        history: [
          ...state.history,
          { tiles: cloneTilesForHistory(state.tiles), score: state.score },
        ],
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;

      const previous = state.history[state.history.length - 1];

      return {
        ...state,
        tiles: cloneTilesForHistory(previous.tiles),
        score: previous.score,
        status: 'playing',
        history: state.history.slice(0, -1),
      };
    }

    case 'CONTINUE': {
      return {
        ...state,
        keepPlaying: true,
        status: 'playing',
      };
    }

    default:
      return state;
  }
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

export function useGame() {
  const [gameKey, setGameKey] = useState(0);
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const best = readBestScore();
    const saved = readSavedGame();
    return saved ? hydrateState(saved, best) : createFreshState(best);
  });

  // Ref used to read current state inside event listeners without stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    persistGame(state);
  }, [state]);

  const handleMove = useCallback((direction: Direction) => {
    dispatch({ type: 'MOVE', payload: direction });
  }, []);

  const handleNewGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' });
    // Bump key to remount Board and reset ghost-tile animation state.
    setGameKey((key) => key + 1);
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE' });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[event.key];
      if (!direction) return;

      const current = stateRef.current;
      if (current.status === 'over') return;
      if (current.status === 'won' && !current.keepPlaying) return;

      event.preventDefault();
      dispatch({ type: 'MOVE', payload: direction });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSwipe = useCallback(
    (direction: Direction) => {
      const current = stateRef.current;
      if (current.status === 'over') return;
      if (current.status === 'won' && !current.keepPlaying) return;
      handleMove(direction);
    },
    [handleMove],
  );

  return {
    tiles: state.tiles,
    score: state.score,
    best: state.best,
    status: state.status,
    keepPlaying: state.keepPlaying,
    canUndo: state.history.length > 0,
    gameKey,
    move: handleMove,
    newGame: handleNewGame,
    undo: handleUndo,
    continueGame: handleContinue,
    onSwipe: handleSwipe,
  };
}
