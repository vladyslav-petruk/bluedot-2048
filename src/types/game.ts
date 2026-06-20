export type Direction = 'up' | 'down' | 'left' | 'right';

export type GameStatus = 'playing' | 'won' | 'over';

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  mergedFrom: number[] | null;
}

export interface MoveResult {
  tiles: Tile[];
  gained: number;
  moved: boolean;
  won: boolean;
}

export interface GameSnapshot {
  tiles: Tile[];
  score: number;
}

export interface GameState {
  tiles: Tile[];
  score: number;
  best: number;
  status: GameStatus;
  keepPlaying: boolean;
  history: GameSnapshot[];
  nextId: number;
}

export type IdGenerator = () => number;

export type RandomFn = () => number;

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'MOVE'; payload: Direction }
  | { type: 'UNDO' }
  | { type: 'CONTINUE' };
