import logo from '../../assets/logo.png';
import ScoreBox from '../ScoreBox/ScoreBox';
import styles from './Header.module.css';

interface HeaderProps {
  score: number;
  best: number;
  onNewGame: () => void;
}

export default function Header({ score, best, onNewGame }: HeaderProps) {
  return (
    <header className={styles.header}>
      <img src={logo} alt="bluedot 2048" className={styles.logo} />

      <div className={styles.scores}>
        <ScoreBox label="Score" value={score} variant="current" />
        <ScoreBox label="Best" value={best} variant="best" />
      </div>

      <button type="button" className={styles.newGame} onClick={onNewGame}>
        New Game
      </button>
    </header>
  );
}
