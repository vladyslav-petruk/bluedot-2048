import type { Tile } from '../../types/game';
import styles from './Tile.module.css';

interface TileProps {
  tile: Tile;
}

export default function Tile({ tile }: TileProps) {
  const { value, row, col, isNew, mergedFrom } = tile;

  const innerClassNames = [styles.inner];
  if (isNew) innerClassNames.push(styles.new);
  if (mergedFrom) innerClassNames.push(styles.merged);

  return (
    <div
      className={styles.tile}
      data-value={value}
      style={{
        transform: `translate(calc(${col} * (var(--cell-size) + var(--cell-gap))), calc(${row} * (var(--cell-size) + var(--cell-gap))))`,
      }}
    >
      <div className={innerClassNames.join(' ')}>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}
