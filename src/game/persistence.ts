import {
  GRID_SIZE,
  HISTORY_PERSIST_LIMIT,
  STORAGE_KEYS,
} from './constants';
import type { GameSnapshot, GameState, GameStatus, Tile } from '../types/game';

export const SCHEMA_VERSION = 1;

export interface PersistedGame {
  version: number;
  tiles: Tile[];
  score: number;
  status: GameStatus;
  keepPlaying: boolean;
  history: GameSnapshot[];
}

const VALID_STATUSES: GameStatus[] = ['playing', 'won', 'over'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidTile(value: unknown): value is Tile {
  if (!value || typeof value !== 'object') return false;

  const tile = value as Partial<Tile>;

  if (!isFiniteNumber(tile.id) || !isFiniteNumber(tile.value)) return false;
  if (!isFiniteNumber(tile.row) || !isFiniteNumber(tile.col)) return false;
  if (tile.row < 0 || tile.row >= GRID_SIZE || tile.col < 0 || tile.col >= GRID_SIZE) {
    return false;
  }
  if (typeof tile.isNew !== 'boolean') return false;
  if (tile.mergedFrom !== null && !Array.isArray(tile.mergedFrom)) return false;
  if (
    tile.mergedFrom !== null &&
    !tile.mergedFrom.every((id) => isFiniteNumber(id))
  ) {
    return false;
  }

  return true;
}

function isValidSnapshot(value: unknown): value is GameSnapshot {
  if (!value || typeof value !== 'object') return false;

  const snapshot = value as Partial<GameSnapshot>;
  if (!Array.isArray(snapshot.tiles) || !isFiniteNumber(snapshot.score)) return false;

  return snapshot.tiles.every(isValidTile);
}

function clearAnimationFlags(tiles: Tile[]): Tile[] {
  return tiles.map((tile) => ({
    ...tile,
    isNew: false,
    mergedFrom: null,
  }));
}

export function validateSavedGame(raw: unknown): PersistedGame | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<PersistedGame>;

  if (data.version !== SCHEMA_VERSION) return null;
  if (!Array.isArray(data.tiles) || !data.tiles.every(isValidTile)) return null;
  if (!isFiniteNumber(data.score) || data.score < 0) return null;
  if (!VALID_STATUSES.includes(data.status as GameStatus)) return null;
  if (typeof data.keepPlaying !== 'boolean') return null;
  if (!Array.isArray(data.history) || !data.history.every(isValidSnapshot)) return null;

  return {
    version: SCHEMA_VERSION,
    tiles: clearAnimationFlags(data.tiles),
    score: data.score,
    status: data.status as GameStatus,
    keepPlaying: data.keepPlaying,
    history: data.history.map((snapshot) => ({
      tiles: clearAnimationFlags(snapshot.tiles),
      score: snapshot.score,
    })),
  };
}

export function readBestScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.best);
    if (!raw) return 0;

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function readSavedGame(): PersistedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.game);
    if (!raw) return null;

    return validateSavedGame(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistGame(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEYS.best, String(state.best));

    const payload: PersistedGame = {
      version: SCHEMA_VERSION,
      tiles: state.tiles,
      score: state.score,
      status: state.status,
      keepPlaying: state.keepPlaying,
      history: state.history.slice(-HISTORY_PERSIST_LIMIT),
    };

    localStorage.setItem(STORAGE_KEYS.game, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export function hydrateState(saved: PersistedGame, best: number): GameState {
  const maxId = saved.tiles.reduce((max, tile) => Math.max(max, tile.id), 0);
  const historyMaxId = saved.history.reduce((max, snapshot) => {
    const snapshotMax = snapshot.tiles.reduce(
      (innerMax, tile) => Math.max(innerMax, tile.id),
      0,
    );
    return Math.max(max, snapshotMax);
  }, 0);

  return {
    tiles: saved.tiles,
    score: saved.score,
    best: Math.max(best, saved.score),
    status: saved.status,
    keepPlaying: saved.keepPlaying,
    history: saved.history,
    nextId: Math.max(maxId, historyMaxId) + 1,
  };
}
