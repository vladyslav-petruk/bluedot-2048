import {
  GRID_SIZE,
  SPAWN_4_PROBABILITY,
  START_TILES,
  WIN_VALUE,
} from './constants';
import type { Direction, IdGenerator, MoveResult, Tile } from '../types/game';

function cloneTile(tile: Tile): Tile {
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

function randomSpawnValue() {
  return Math.random() < SPAWN_4_PROBABILITY ? 4 : 2;
}

function pickRandomCell(cells: Array<{ row: number; col: number }>) {
  return cells[Math.floor(Math.random() * cells.length)];
}

function buildGrid(tiles: Tile[]): Array<Array<Tile | null>> {
  const grid: Array<Array<Tile | null>> = Array.from({ length: GRID_SIZE }, () =>
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

function processHorizontalLine(
  grid: Array<Array<Tile | null>>,
  row: number,
  direction: 'left' | 'right',
  mergedIds: Set<number>,
) {
  const cols =
    direction === 'left'
      ? [...Array(GRID_SIZE).keys()]
      : [...Array(GRID_SIZE).keys()].reverse();

  const line = cols.map((col) => grid[row][col]).filter((tile): tile is Tile => Boolean(tile));
  if (line.length === 0) {
    return { gained: 0, won: false, moved: false };
  }

  const before = new Map(line.map((tile) => [tile.id, { row: tile.row, col: tile.col, value: tile.value }]));
  const { result, gained, won, lineMoved } = slideAndMergeLine(line, mergedIds);

  cols.forEach((col) => {
    grid[row][col] = null;
  });

  result.forEach((tile, index) => {
    const newCol = direction === 'left' ? index : GRID_SIZE - 1 - index;
    tile.row = row;
    tile.col = newCol;
    grid[row][newCol] = tile;
  });

  const moved =
    lineMoved ||
    result.length !== line.length ||
    result.some((tile) => {
      const prev = before.get(tile.id);
      return !prev || prev.col !== tile.col || prev.value !== tile.value;
    });

  return { gained, won, moved };
}

function processVerticalLine(
  grid: Array<Array<Tile | null>>,
  col: number,
  direction: 'up' | 'down',
  mergedIds: Set<number>,
) {
  const rows =
    direction === 'up'
      ? [...Array(GRID_SIZE).keys()]
      : [...Array(GRID_SIZE).keys()].reverse();

  const line = rows.map((row) => grid[row][col]).filter((tile): tile is Tile => Boolean(tile));
  if (line.length === 0) {
    return { gained: 0, won: false, moved: false };
  }

  const before = new Map(line.map((tile) => [tile.id, { row: tile.row, col: tile.col, value: tile.value }]));
  const { result, gained, won, lineMoved } = slideAndMergeLine(line, mergedIds);

  rows.forEach((row) => {
    grid[row][col] = null;
  });

  result.forEach((tile, index) => {
    const newRow = direction === 'up' ? index : GRID_SIZE - 1 - index;
    tile.row = newRow;
    tile.col = col;
    grid[newRow][col] = tile;
  });

  const moved =
    lineMoved ||
    result.length !== line.length ||
    result.some((tile) => {
      const prev = before.get(tile.id);
      return !prev || prev.row !== tile.row || prev.value !== tile.value;
    });

  return { gained, won, moved };
}

function collectTiles(grid: Array<Array<Tile | null>>): Tile[] {
  const tiles: Tile[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = grid[row][col];
      if (tile) tiles.push(tile);
    }
  }

  return tiles;
}

export function createInitialTiles(idGen: IdGenerator): Tile[] {
  let tiles: Tile[] = [];

  for (let i = 0; i < START_TILES; i += 1) {
    const result = spawnTile(tiles, idGen);
    tiles = result.tiles;
  }

  return tiles;
}

export function spawnTile(tiles: Tile[], idGen: IdGenerator) {
  const emptyCells = getEmptyCells(tiles);

  if (emptyCells.length === 0) {
    return { tiles, tile: null as Tile | null };
  }

  const { row, col } = pickRandomCell(emptyCells);
  const tile: Tile = {
    id: idGen(),
    value: randomSpawnValue(),
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

export function move(tiles: Tile[], direction: Direction, idGen: IdGenerator): MoveResult {
  const workingTiles = clearAnimationFlags(cloneTiles(tiles));
  const grid = buildGrid(workingTiles);
  const mergedIds = new Set<number>();
  let gained = 0;
  let moved = false;
  let won = false;

  if (direction === 'left' || direction === 'right') {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const lineResult = processHorizontalLine(grid, row, direction, mergedIds);
      gained += lineResult.gained;
      moved = moved || lineResult.moved;
      won = won || lineResult.won;
    }
  } else {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const lineResult = processVerticalLine(grid, col, direction, mergedIds);
      gained += lineResult.gained;
      moved = moved || lineResult.moved;
      won = won || lineResult.won;
    }
  }

  if (!moved) {
    return {
      tiles: cloneTiles(tiles),
      gained: 0,
      moved: false,
      won: false,
    };
  }

  const nextTiles = collectTiles(grid);
  const spawnResult = spawnTile(nextTiles, idGen);

  return {
    tiles: spawnResult.tiles,
    gained,
    moved: true,
    won,
  };
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
