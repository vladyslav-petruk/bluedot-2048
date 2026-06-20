import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_PERSIST_LIMIT, STORAGE_KEYS } from './constants';
import {
  SCHEMA_VERSION,
  hydrateState,
  persistGame,
  readBestScore,
  readSavedGame,
  validateSavedGame,
} from './persistence';
import type { GameState, Tile } from '../types/game';

function makeTile(id: number, value: number, row: number, col: number, isNew = false): Tile {
  return { id, value, row, col, isNew, mergedFrom: null };
}

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: SCHEMA_VERSION,
    tiles: [makeTile(1, 2, 0, 0, true)],
    score: 42,
    status: 'playing',
    keepPlaying: false,
    history: [{ tiles: [makeTile(2, 4, 1, 1)], score: 10 }],
    ...overrides,
  };
}

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts valid saved game payloads', () => {
    const result = validateSavedGame(makeValidPayload());

    expect(result).not.toBeNull();
    expect(result?.score).toBe(42);
    expect(result?.tiles[0].isNew).toBe(false);
    expect(result?.history[0].tiles[0].mergedFrom).toBeNull();
  });

  it('rejects payloads with schema version mismatch', () => {
    expect(validateSavedGame(makeValidPayload({ version: 999 }))).toBeNull();
  });

  it('rejects invalid tile coordinates', () => {
    expect(
      validateSavedGame(
        makeValidPayload({
          tiles: [makeTile(1, 2, 99, 0)],
        }),
      ),
    ).toBeNull();
  });

  it('rejects invalid status values', () => {
    expect(
      validateSavedGame(
        makeValidPayload({
          status: 'paused',
        }),
      ),
    ).toBeNull();
  });

  it('reads and writes best score safely', () => {
    localStorage.setItem(STORAGE_KEYS.best, '128');

    expect(readBestScore()).toBe(128);
  });

  it('returns zero for corrupted best score', () => {
    localStorage.setItem(STORAGE_KEYS.best, 'not-a-number');

    expect(readBestScore()).toBe(0);
  });

  it('persists and reloads game state with capped history', () => {
    const history = Array.from({ length: HISTORY_PERSIST_LIMIT + 5 }, (_, index) => ({
      tiles: [makeTile(index + 10, 2, 0, 0)],
      score: index,
    }));

    const state: GameState = {
      tiles: [makeTile(1, 2, 0, 0)],
      score: 99,
      best: 200,
      status: 'playing',
      keepPlaying: false,
      history,
      nextId: 100,
    };

    persistGame(state);

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.game)!);
    expect(raw.version).toBe(SCHEMA_VERSION);
    expect(raw.history).toHaveLength(HISTORY_PERSIST_LIMIT);
    expect(raw.history[0].score).toBe(5);

    const saved = readSavedGame();
    expect(saved?.score).toBe(99);
    expect(saved?.history).toHaveLength(HISTORY_PERSIST_LIMIT);
  });

  it('hydrates game state with next id derived from tiles and history', () => {
    const saved = validateSavedGame(
      makeValidPayload({
        tiles: [makeTile(7, 8, 0, 0)],
        history: [{ tiles: [makeTile(12, 16, 1, 1)], score: 10 }],
      }),
    )!;

    const state = hydrateState(saved, 50);

    expect(state.nextId).toBe(13);
    expect(state.best).toBe(50);
    expect(state.score).toBe(42);
  });

  it('returns null for corrupted saved game json', () => {
    localStorage.setItem(STORAGE_KEYS.game, '{not-json');

    expect(readSavedGame()).toBeNull();
  });
});
