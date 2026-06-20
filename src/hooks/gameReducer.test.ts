import { describe, expect, it } from 'vitest';
import { WIN_VALUE } from '../game/constants';
import { createFreshState, gameReducer } from './useGame';
import type { GameState, Tile } from '../types/game';

function makeTile(id: number, value: number, row: number, col: number): Tile {
  return { id, value, row, col, isNew: false, mergedFrom: null };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createFreshState(100),
    ...overrides,
  };
}

describe('gameReducer', () => {
  it('starts a fresh game while preserving best score', () => {
    const state = makeState({ best: 512, score: 128, status: 'over' });

    const next = gameReducer(state, { type: 'NEW_GAME' });

    expect(next.score).toBe(0);
    expect(next.best).toBe(512);
    expect(next.status).toBe('playing');
    expect(next.tiles).toHaveLength(2);
    expect(next.history).toEqual([]);
  });

  it('ignores invalid moves', () => {
    const tiles = [makeTile(1, 2, 0, 0)];
    const state = makeState({ tiles, score: 10, history: [] });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next).toBe(state);
  });

  it('updates score and history on valid move', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 2, 0, 1),
    ];
    const state = makeState({ tiles, score: 10, nextId: 3, history: [] });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next.score).toBeGreaterThan(10);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].score).toBe(10);
    expect(next.history[0].tiles).toHaveLength(2);
  });

  it('sets won status when 2048 is created', () => {
    const tiles = [
      makeTile(1, 1024, 0, 0),
      makeTile(2, 1024, 0, 1),
    ];
    const state = makeState({
      tiles,
      score: 0,
      nextId: 3,
      status: 'playing',
      keepPlaying: false,
    });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next.status).toBe('won');
    expect(next.tiles.some((tile) => tile.value >= WIN_VALUE)).toBe(true);
  });

  it('sets over status when no moves remain', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [0, 2, 4, 8],
    ];
    const tiles = values.flatMap((row, rowIndex) =>
      row.flatMap((value, colIndex) =>
        value === 0 ? [] : [makeTile(rowIndex * 4 + colIndex + 1, value, rowIndex, colIndex)],
      ),
    );
    const state = makeState({ tiles, score: 0, nextId: 17, status: 'playing' });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next.status).toBe('over');
    expect(next.tiles).toHaveLength(16);
  });

  it('restores previous snapshot on undo', () => {
    const previousTiles = [makeTile(1, 2, 0, 0)];
    const currentTiles = [makeTile(1, 2, 0, 0), makeTile(2, 4, 0, 1)];
    const state = makeState({
      tiles: currentTiles,
      score: 20,
      status: 'over',
      history: [{ tiles: previousTiles, score: 10 }],
    });

    const next = gameReducer(state, { type: 'UNDO' });

    expect(next.score).toBe(10);
    expect(next.tiles).toHaveLength(1);
    expect(next.status).toBe('playing');
    expect(next.history).toHaveLength(0);
  });

  it('allows continue after win', () => {
    const state = makeState({ status: 'won', keepPlaying: false });

    const next = gameReducer(state, { type: 'CONTINUE' });

    expect(next.status).toBe('playing');
    expect(next.keepPlaying).toBe(true);
  });

  it('blocks moves after game over', () => {
    const tiles = [makeTile(1, 2, 0, 0), makeTile(2, 4, 0, 1)];
    const state = makeState({ tiles, status: 'over' });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next).toBe(state);
  });

  it('blocks moves after win until continue', () => {
    const tiles = [makeTile(1, 2, 0, 0), makeTile(2, 4, 0, 1)];
    const state = makeState({ tiles, status: 'won', keepPlaying: false });

    const next = gameReducer(state, { type: 'MOVE', payload: 'left' });

    expect(next).toBe(state);
  });
});
