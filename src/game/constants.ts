import type { Direction } from '../types/game';

export const GRID_SIZE = 4;
export const WIN_VALUE = 2048;
export const START_TILES = 2;
export const SPAWN_4_PROBABILITY = 0.1;
export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export const HISTORY_PERSIST_LIMIT = 50;

export const STORAGE_KEYS = {
  best: 'bluedot2048:best',
  game: 'bluedot2048:game',
} as const;
