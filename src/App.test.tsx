import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function countValuedTiles(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-value]')).filter(
    (el) => el.textContent && el.textContent.trim() !== '',
  ).length;
}

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the core UI: scores, board, and controls', () => {
    render(<App />);

    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getByText('Best')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Game' })).toBeTruthy();
    expect(screen.getByLabelText('2048 game board')).toBeTruthy();
  });

  it('starts a fresh game with exactly two tiles', () => {
    const { container } = render(<App />);
    expect(countValuedTiles(container)).toBe(2);
  });

  it('disables undo until a move has been made', () => {
    render(<App />);
    const undo = screen.getByLabelText('Undo last move') as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
  });

  it('enables undo after a valid move', () => {
    // Deterministic RNG: always place in the first empty cell with value 4 so
    // the opening board is [4,4] in row 0 and a left move always merges.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<App />);
    const undo = screen.getByLabelText('Undo last move') as HTMLButtonElement;
    expect(undo.disabled).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(undo.disabled).toBe(false);
  });

  it('resets the board when New Game is clicked', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));

    expect(countValuedTiles(container)).toBe(2);
  });

  it('shows a Game Over dialog when no moves remain on load', () => {
    const tile = (id: number, value: number, row: number, col: number) => ({
      id,
      value,
      row,
      col,
      isNew: false,
      mergedFrom: null,
    });
    const deadBoard = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ].flatMap((row, r) => row.map((value, c) => tile(r * 4 + c + 1, value, r, c)));

    localStorage.setItem(
      'bluedot2048:game',
      JSON.stringify({
        version: 1,
        tiles: deadBoard,
        score: 100,
        status: 'over',
        keepPlaying: false,
        history: [],
      }),
    );

    render(<App />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Game Over')).toBeTruthy();
  });
});
