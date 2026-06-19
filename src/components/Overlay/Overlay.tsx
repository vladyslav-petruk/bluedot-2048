import type { GameStatus } from '../../types/game';
import styles from './Overlay.module.css';

interface OverlayProps {
  status: GameStatus;
  score: number;
  onContinue: () => void;
  onNewGame: () => void;
}

export default function Overlay({ status, score, onContinue, onNewGame }: OverlayProps) {
  if (status !== 'won' && status !== 'over') return null;

  const isWin = status === 'won';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <div className={styles.content}>
        <h2 id="overlay-title" className={styles.title}>
          {isWin ? 'You Win!' : 'Game Over'}
        </h2>

        {!isWin && <p className={styles.score}>Score: {score}</p>}

        <div className={styles.actions}>
          {isWin && (
            <button type="button" className={styles.primary} onClick={onContinue}>
              Keep going
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={onNewGame}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
