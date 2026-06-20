import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  canAcceptInput,
  createInitialGameState,
  gameReducer,
} from '../game/reducer';
import { persistGame } from '../game/persistence';
import type { Direction } from '../types/game';

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
      if (!canAcceptInput(stateRef.current)) return;

      event.preventDefault();
      dispatch({ type: 'MOVE', payload: direction });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSwipe = useCallback(
    (direction: Direction) => {
      if (!canAcceptInput(stateRef.current)) return;
      handleMove(direction);
    },
    [handleMove],
  );

  return {
    tiles: state.tiles,
    score: state.score,
    best: state.best,
    status: state.status,
    canUndo: state.history.length > 0,
    gameKey,
    newGame: handleNewGame,
    undo: handleUndo,
    continueGame: handleContinue,
    onSwipe: handleSwipe,
  };
}
