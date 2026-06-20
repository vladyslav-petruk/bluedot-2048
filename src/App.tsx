import Board from './components/Board/Board';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import Overlay from './components/Overlay/Overlay';
import UndoButton from './components/UndoButton/UndoButton';
import { GRID_SIZE } from './game/constants';
import { useGame } from './hooks/useGame';
import styles from './App.module.css';

export default function App() {
  const {
    tiles,
    score,
    best,
    status,
    canUndo,
    gameKey,
    newGame,
    undo,
    continueGame,
    onSwipe,
  } = useGame();

  return (
    <div className={styles.app} style={{ ['--grid-size' as string]: GRID_SIZE }}>
      <main className={styles.main}>
        <Header score={score} best={best} onNewGame={newGame} />

        <div className={styles.gameArea}>
          <Board key={gameKey} tiles={tiles} onSwipe={onSwipe} status={status} />
          <Overlay
            status={status}
            score={score}
            onContinue={continueGame}
            onNewGame={newGame}
          />
        </div>

        <UndoButton onUndo={undo} disabled={!canUndo} />
        <Footer />
      </main>
    </div>
  );
}
