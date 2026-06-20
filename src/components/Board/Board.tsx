import { useEffect, useRef, useState } from 'react';
import { GRID_SIZE } from '../../game/constants';
import { cloneTile } from '../../game/engine';
import { useSwipe } from '../../hooks/useSwipe';
import type { Direction, GameStatus, Tile } from '../../types/game';
import TileComponent from './Tile';
import styles from './Board.module.css';

interface BoardProps {
  tiles: Tile[];
  onSwipe: (direction: Direction) => void;
  status: GameStatus;
}

export default function Board({ tiles, onSwipe, status }: BoardProps) {
  const prevTilesRef = useRef(tiles);
  const [ghostTiles, setGhostTiles] = useState<Tile[]>([]);

  useEffect(() => {
    const prevTiles = prevTilesRef.current;
    const currentIds = new Set(tiles.map((tile) => tile.id));
    const ghosts: Tile[] = [];

    prevTiles.forEach((prevTile) => {
      if (currentIds.has(prevTile.id)) return;

      const survivor = tiles.find(
        (tile) => tile.mergedFrom && tile.mergedFrom.includes(prevTile.id),
      );

      if (survivor) {
        ghosts.push({
          ...cloneTile(prevTile),
          row: survivor.row,
          col: survivor.col,
        });
      }
    });

    if (ghosts.length > 0) {
      setGhostTiles(ghosts);
      const timer = window.setTimeout(() => setGhostTiles([]), 140);
      prevTilesRef.current = tiles;
      return () => window.clearTimeout(timer);
    }

    setGhostTiles([]);
    prevTilesRef.current = tiles;
    return undefined;
  }, [tiles]);

  const { elementRef, onTouchStart, onTouchEnd, onTouchCancel } = useSwipe(onSwipe);

  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
    id: index,
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE,
  }));

  return (
    <div
      ref={elementRef}
      className={styles.boardWrapper}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div className={styles.board} aria-label="2048 game board">
        {cells.map(({ id, row, col }) => (
          <div
            key={id}
            className={styles.cell}
            style={{
              transform: `translate(calc(${col} * (var(--cell-size) + var(--cell-gap))), calc(${row} * (var(--cell-size) + var(--cell-gap))))`,
            }}
          />
        ))}

        <div className={styles.shadowLayer} aria-hidden="true">
          {tiles.map((tile) => (
            <span
              key={`shadow-${tile.id}`}
              className={styles.tileShadowSlot}
              style={{
                transform: `translate(calc(${tile.col} * (var(--cell-size) + var(--cell-gap))), calc(${tile.row} * (var(--cell-size) + var(--cell-gap))))`,
              }}
            >
              <span className={styles.tileShadow} data-value={tile.value} />
            </span>
          ))}
        </div>

        {ghostTiles.map((tile) => (
          <TileComponent key={`ghost-${tile.id}`} tile={tile} />
        ))}

        {tiles.map((tile) => (
          <TileComponent key={tile.id} tile={tile} />
        ))}

        {(status === 'won' || status === 'over') && (
          <div className={styles.blocker} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
