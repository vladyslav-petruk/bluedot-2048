import {
  GRID_SIZE,
  SPAWN_4_PROBABILITY,
  START_TILES,
  WIN_VALUE,
} from './constants';
import type { Direction, IdGenerator, MoveResult, RandomFn, Tile } from '../types/game';

type Grid = Array<Array<Tile | null>>;

export function cloneTile(tile: Tile): Tile {
  return {
    id: tile.id,
    value: tile.value,
    row: tile.row,
    col: tile.col,
    isNew: tile.isNew,
    mergedFrom: tile.mergedFrom ? [...tile.mergedFrom] : null,
  };
}

function cloneTiles(tiles: Tile[]): Tile[] {
  return tiles.map(cloneTile);
}

function getEmptyCells(tiles: Tile[]) {
  const occupied = new Set(tiles.map((t) => `${t.row},${t.col}`));
  const empty: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!occupied.has(`${row},${col}`)) {
        empty.push({ row, col });
      }
    }
  }

  return empty;
}

function randomSpawnValue(rng: RandomFn) {
  return rng() < SPAWN_4_PROBABILITY ? 4 : 2;
}

function pickRandomCell(cells: Array<{ row: number; col: number }>, rng: RandomFn) {
  return cells[Math.floor(rng() * cells.length)];
}

function buildGrid(tiles: Tile[]): Grid {
  const grid: Grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );

  tiles.forEach((tile) => {
    grid[tile.row][tile.col] = tile;
  });

  return grid;
}

function clearAnimationFlags(tiles: Tile[]): Tile[] {
  return tiles.map((tile) => ({
    ...tile,
    isNew: false,
    mergedFrom: null,
  }));
}

function slideAndMergeLine(line: Tile[], mergedIds: Set<number>) {
  const result: Tile[] = [];
  let gained = 0;
  let won = false;
  let lineMoved = false;

  for (const tile of line) {
    const last = result[result.length - 1];

    if (last && last.value === tile.value && !mergedIds.has(last.id)) {
      last.value *= 2;
      last.mergedFrom = [last.id, tile.id];
      mergedIds.add(last.id);
      gained += last.value;
      if (last.value >= WIN_VALUE) won = true;
      lineMoved = true;
    } else {
      result.push(tile);
    }
  }

  return { result, gained, won, lineMoved };
}

/**
 * Process one row (axis='row') or column (axis='col') of the grid in place.
 * `reverse=true` processes right-to-left or bottom-to-top so the merge
 * direction always matches the slide direction.
 */
function processLine(
  grid: Grid,
  lineIndex: number,
  axis: 'row' | 'col',
  reverse: boolean,
  mergedIds: Set<number>,
) {
  const indices = [...Array(GRID_SIZE).keys()];
  if (reverse) indices.reverse();

  const getCell = (i: number): Tile | null =>
    axis === 'row' ? grid[lineIndex][i] : grid[i][lineIndex];

  const setCell = (i: number, tile: Tile | null) => {
    if (axis === 'row') {
      grid[lineIndex][i] = tile;
    } else {
      grid[i][lineIndex] = tile;
    }
  };

  const getPos = (tile: Tile) => (axis === 'row' ? tile.col : tile.row);

  const line = indices.map(getCell).filter((tile): tile is Tile => Boolean(tile));
  if (line.length === 0) return { gained: 0, won: false, moved: false };

  const before = new Map(line.map((tile) => [tile.id, getPos(tile)]));
  const { result, gained, won, lineMoved } = slideAndMergeLine(line, mergedIds);

  indices.forEach((i) => setCell(i, null));

  result.forEach((tile, resultIndex) => {
    const newPos = indices[resultIndex];
    if (axis === 'row') {
      tile.row = lineIndex;
      tile.col = newPos;
    } else {
      tile.row = newPos;
      tile.col = lineIndex;
    }
    setCell(newPos, tile);
  });

  const moved =
    lineMoved ||
    result.length !== line.length ||
    result.some((tile) => {
      const prev = before.get(tile.id);
      return prev === undefined || prev !== getPos(tile);
    });

  return { gained, won, moved };
}

function collectTiles(grid: Grid): Tile[] {
  const tiles: Tile[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = grid[row][col];
      if (tile) tiles.push(tile);
    }
  }

  return tiles;
}

export function createInitialTiles(
  idGen: IdGenerator,
  rng: RandomFn = Math.random,
): Tile[] {
  let tiles: Tile[] = [];

  for (let i = 0; i < START_TILES; i += 1) {
    const result = spawnTile(tiles, idGen, rng);
    tiles = result.tiles;
  }

  return tiles;
}

export function spawnTile(
  tiles: Tile[],
  idGen: IdGenerator,
  rng: RandomFn = Math.random,
) {
  const emptyCells = getEmptyCells(tiles);

  if (emptyCells.length === 0) {
    return { tiles, tile: null as Tile | null };
  }

  const { row, col } = pickRandomCell(emptyCells, rng);
  const tile: Tile = {
    id: idGen(),
    value: randomSpawnValue(rng),
    row,
    col,
    isNew: true,
    mergedFrom: null,
  };

  return {
    tiles: [...tiles, tile],
    tile,
  };
}

export function move(
  tiles: Tile[],
  direction: Direction,
  idGen: IdGenerator,
  rng: RandomFn = Math.random,
): MoveResult {
  const workingTiles = clearAnimationFlags(cloneTiles(tiles));
  const grid = buildGrid(workingTiles);
  const mergedIds = new Set<number>();
  let gained = 0;
  let moved = false;
  let won = false;

  const isHorizontal = direction === 'left' || direction === 'right';
  const reverse = direction === 'right' || direction === 'down';
  const axis = isHorizontal ? 'row' : 'col';

  for (let lineIndex = 0; lineIndex < GRID_SIZE; lineIndex += 1) {
    const lineResult = processLine(grid, lineIndex, axis, reverse, mergedIds);
    gained += lineResult.gained;
    moved = moved || lineResult.moved;
    won = won || lineResult.won;
  }

  if (!moved) {
    return { tiles, gained: 0, moved: false, won: false };
  }

  const nextTiles = collectTiles(grid);
  const spawnResult = spawnTile(nextTiles, idGen, rng);

  return { tiles: spawnResult.tiles, gained, moved: true, won };
}

export function canMove(tiles: Tile[]): boolean {
  if (getEmptyCells(tiles).length > 0) return true;

  const grid = buildGrid(tiles);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = grid[row][col];
      if (!tile) continue;

      const right = col + 1 < GRID_SIZE ? grid[row][col + 1] : null;
      const down = row + 1 < GRID_SIZE ? grid[row + 1][col] : null;

      if ((right && right.value === tile.value) || (down && down.value === tile.value)) {
        return true;
      }
    }
  }

  return false;
}

export function hasWon(tiles: Tile[]): boolean {
  return tiles.some((tile) => tile.value >= WIN_VALUE);
}

export function cloneTilesForHistory(tiles: Tile[]): Tile[] {
  return cloneTiles(tiles);
}
