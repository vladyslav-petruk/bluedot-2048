import { useEffect, useRef } from 'react';
import type { GameStatus } from '../../types/game';
import styles from './Overlay.module.css';

interface OverlayProps {
  status: GameStatus;
  score: number;
  onContinue: () => void;
  onNewGame: () => void;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function Overlay({ status, score, onContinue, onNewGame }: OverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (status !== 'won' && status !== 'over') return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const focusables = getFocusableElements(dialog);
    focusables[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        const buttons = getFocusableElements(dialog);
        buttons[buttons.length - 1]?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      const buttons = getFocusableElements(dialog);
      if (buttons.length === 0) return;

      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [status]);

  if (status !== 'won' && status !== 'over') return null;

  const isWin = status === 'won';

  return (
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
    >
      <div className={styles.content}>
        <h2 id="overlay-title" className={styles.title}>
          {isWin ? 'You Win!' : 'Game Over'}
        </h2>

        <p className={styles.score}>Score: {score}</p>

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
