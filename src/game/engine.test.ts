import { describe, expect, it } from 'vitest';
import {
  canMove,
  createInitialTiles,
  hasWon,
  move,
  spawnTile,
} from './engine';
import { GRID_SIZE } from './constants';
import type { Tile } from '../types/game';

function createIdGen(start = 1) {
  let id = start;
  return () => id++;
}

function makeTile(id: number, value: number, row: number, col: number): Tile {
  return { id, value, row, col, isNew: false, mergedFrom: null };
}

describe('engine', () => {
  it('creates the initial board with two tiles', () => {
    const tiles = createInitialTiles(createIdGen());
    expect(tiles).toHaveLength(2);
    expect(tiles.every((tile) => tile.value === 2 || tile.value === 4)).toBe(true);
  });

  // ── Horizontal movement ───────────────────────────────────────────────────

  it('compresses tiles toward the left wall', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 4, 0, 3),
    ];

    const result = move(tiles, 'left', createIdGen(3));

    expect(result.moved).toBe(true);
    expect(result.tiles.find((t) => t.id === 1)?.col).toBe(0);
    expect(result.tiles.find((t) => t.id === 2)?.col).toBe(1);
  });

  it('merges adjacent equal tiles once per move (left)', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 2, 0, 1),
      makeTile(3, 2, 0, 2),
      makeTile(4, 2, 0, 3),
    ];

    const result = move(tiles, 'left', createIdGen(5));

    const rowTiles = result.tiles
      .filter((t) => t.row === 0 && !t.isNew)
      .sort((a, b) => a.col - b.col);

    expect(rowTiles).toHaveLength(2);
    expect(rowTiles[0].value).toBe(4);
    expect(rowTiles[1].value).toBe(4);
    expect(result.gained).toBe(8);
  });

  it('does not merge more than once per tile per move', () => {
    const tiles = [
      makeTile(1, 4, 0, 0),
      makeTile(2, 4, 0, 1),
      makeTile(3, 8, 0, 2),
    ];

    const result = move(tiles, 'left', createIdGen(4));
    const rowTiles = result.tiles
      .filter((t) => t.row === 0 && !t.isNew)
      .sort((a, b) => a.col - b.col);

    expect(rowTiles.map((t) => t.value)).toEqual([8, 8]);
    expect(result.gained).toBe(8);
  });

  it('returns moved false when nothing changes', () => {
    const tiles = [makeTile(1, 2, 0, 0)];

    const result = move(tiles, 'left', createIdGen(2));

    expect(result.moved).toBe(false);
    expect(result.tiles).toBe(tiles);
    expect(result.tiles).toHaveLength(1);
  });

  it('merges a full row correctly when moving right', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 2, 0, 1),
      makeTile(3, 4, 0, 2),
      makeTile(4, 8, 0, 3),
    ];

    const result = move(tiles, 'right', createIdGen(5));
    const rowTiles = result.tiles
      .filter((t) => t.row === 0 && !t.isNew)
      .sort((a, b) => a.col - b.col);

    expect(result.moved).toBe(true);
    expect(rowTiles.map((t) => t.value)).toEqual([4, 4, 8]);
    expect(rowTiles.map((t) => t.col)).toEqual([1, 2, 3]);
    expect(result.gained).toBe(4);
  });

  // ── Vertical movement ─────────────────────────────────────────────────────

  it('compresses tiles toward the top wall', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 4, 3, 0),
    ];

    const result = move(tiles, 'up', createIdGen(3));

    expect(result.moved).toBe(true);
    expect(result.tiles.find((t) => t.id === 1)?.row).toBe(0);
    expect(result.tiles.find((t) => t.id === 2)?.row).toBe(1);
  });

  it('merges equal tiles when moving down', () => {
    const tiles = [
      makeTile(1, 4, 0, 0),
      makeTile(2, 4, 1, 0),
    ];

    const result = move(tiles, 'down', createIdGen(3));
    const colTiles = result.tiles
      .filter((t) => t.col === 0 && !t.isNew)
      .sort((a, b) => a.row - b.row);

    expect(colTiles).toHaveLength(1);
    expect(colTiles[0].value).toBe(8);
    expect(colTiles[0].row).toBe(GRID_SIZE - 1);
    expect(result.gained).toBe(8);
  });

  it('does not merge more than once per tile when moving up', () => {
    const tiles = [
      makeTile(1, 2, 0, 0),
      makeTile(2, 2, 1, 0),
      makeTile(3, 4, 2, 0),
    ];

    const result = move(tiles, 'up', createIdGen(4));
    const colTiles = result.tiles
      .filter((t) => t.col === 0 && !t.isNew)
      .sort((a, b) => a.row - b.row);

    expect(colTiles.map((t) => t.value)).toEqual([4, 4]);
    expect(result.gained).toBe(4);
  });

  // ── Win / game-over detection ─────────────────────────────────────────────

  it('detects game over when no moves remain', () => {
    const values = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];

    const tiles = values.flatMap((row, rowIndex) =>
      row.map((value, colIndex) =>
        makeTile(rowIndex * GRID_SIZE + colIndex + 1, value, rowIndex, colIndex),
      ),
    );

    expect(canMove(tiles)).toBe(false);
  });

  it('detects that moves remain when adjacent equal tiles exist', () => {
    const values = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 2, 8],
    ];

    const tiles = values.flatMap((row, rowIndex) =>
      row.map((value, colIndex) =>
        makeTile(rowIndex * GRID_SIZE + colIndex + 1, value, rowIndex, colIndex),
      ),
    );

    expect(canMove(tiles)).toBe(true);
  });

  it('detects win when 2048 tile exists', () => {
    const tiles = [makeTile(1, 2048, 0, 0)];
    expect(hasWon(tiles)).toBe(true);
  });

  it('does not detect win before reaching 2048', () => {
    const tiles = [makeTile(1, 1024, 0, 0)];
    expect(hasWon(tiles)).toBe(false);
  });

  // ── Spawn ─────────────────────────────────────────────────────────────────

  it('spawns a tile in an empty cell', () => {
    const tiles = [makeTile(1, 2, 0, 0)];
    const result = spawnTile(tiles, createIdGen(2));

    expect(result.tiles).toHaveLength(2);
    expect(result.tile?.isNew).toBe(true);

    const spawned = result.tile!;
    expect(tiles.some((t) => t.row === spawned.row && t.col === spawned.col)).toBe(false);
  });

  it('does not spawn when board is full', () => {
    const tiles: Tile[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        tiles.push(makeTile(row * GRID_SIZE + col + 1, 2, row, col));
      }
    }

    const result = spawnTile(tiles, createIdGen(17));
    expect(result.tile).toBeNull();
    expect(result.tiles).toHaveLength(16);
  });

  it('spawns deterministically with injected rng', () => {
    const tiles = [makeTile(1, 2, 0, 0)];
    let call = 0;
    const rng = () => {
      const values = [0, 0.5];
      return values[call++ % values.length];
    };

    const result = spawnTile(tiles, createIdGen(2), rng);

    expect(result.tile).toMatchObject({ row: 0, col: 1, value: 2 });
  });

  it('spawns a 4 when rng is below spawn threshold', () => {
    const tiles = [makeTile(1, 2, 0, 0)];
    let call = 0;
    const rng = () => {
      const values = [0, 0.05];
      return values[call++ % values.length];
    };

    const result = spawnTile(tiles, createIdGen(2), rng);

    expect(result.tile?.value).toBe(4);
  });

  it('follows the 90/10 spawn value distribution', () => {
    const tiles = [makeTile(1, 2, 0, 0)];
    const values: number[] = [];

    for (let i = 0; i < 100; i += 1) {
      const rng = () => i / 100;
      const result = spawnTile(tiles, createIdGen(2 + i), rng);
      values.push(result.tile!.value);
    }

    const fours = values.filter((value) => value === 4).length;
    expect(fours).toBe(10);
  });
});
