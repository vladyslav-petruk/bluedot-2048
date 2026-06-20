import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  canMove,
  cloneTilesForHistory,
  createInitialTiles,
  move,
} from '../game/engine';
import {
  hydrateState,
  persistGame,
  readBestScore,
  readSavedGame,
} from '../game/persistence';
import type { Direction, GameAction, GameState, GameStatus } from '../types/game';

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

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createFreshState(state.best);

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

    case 'CONTINUE':
      return {
        ...state,
        keepPlaying: true,
        status: 'playing',
      };

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
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);

  // Ref used to read current state inside event listeners without stale closures.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
