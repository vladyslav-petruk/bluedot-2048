import undoIcon from '../../assets/icons/undo.png';
import styles from './UndoButton.module.css';

interface UndoButtonProps {
  onUndo: () => void;
  disabled: boolean;
}

export default function UndoButton({ onUndo, disabled }: UndoButtonProps) {
  return (
    <div className={styles.plate}>
      <button
        type="button"
        className={styles.undoButton}
        onClick={onUndo}
        disabled={disabled}
        aria-label="Undo last move"
      >
        <img src={undoIcon} alt="" className={styles.icon} />
      </button>
    </div>
  );
}
