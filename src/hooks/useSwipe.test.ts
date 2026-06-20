import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSwipe } from './useSwipe';
import type { Direction } from '../types/game';

function start(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }] } as unknown as React.TouchEvent;
}

function end(x: number, y: number) {
  return { changedTouches: [{ clientX: x, clientY: y }] } as unknown as React.TouchEvent;
}

function setup() {
  const onSwipe = vi.fn<(direction: Direction) => void>();
  const { result } = renderHook(() => useSwipe(onSwipe));
  return { onSwipe, result };
}

describe('useSwipe', () => {
  it('detects a rightward swipe', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchStart(start(0, 0));
    result.current.onTouchEnd(end(60, 5));
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('detects a leftward swipe', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchStart(start(60, 0));
    result.current.onTouchEnd(end(0, 5));
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('detects an upward swipe', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchStart(start(0, 60));
    result.current.onTouchEnd(end(5, 0));
    expect(onSwipe).toHaveBeenCalledWith('up');
  });

  it('detects a downward swipe', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchStart(start(0, 0));
    result.current.onTouchEnd(end(5, 60));
    expect(onSwipe).toHaveBeenCalledWith('down');
  });

  it('ignores movement below the swipe threshold', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchStart(start(0, 0));
    result.current.onTouchEnd(end(10, 10));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('ignores a touch end with no recorded start', () => {
    const { onSwipe, result } = setup();
    result.current.onTouchEnd(end(60, 0));
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
