import { useCallback, useEffect, useRef } from 'react';
import type { Direction } from '../types/game';

const SWIPE_THRESHOLD = 30;

interface TouchPoint {
  x: number;
  y: number;
}

export function useSwipe(onSwipe: (direction: Direction) => void) {
  const startRef = useRef<TouchPoint | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (!startRef.current) return;

    if (event.cancelable) {
      event.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!startRef.current) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    startRef.current = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      onSwipeRef.current(dx > 0 ? 'right' : 'left');
    } else {
      onSwipeRef.current(dy > 0 ? 'down' : 'up');
    }
  }, []);

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    const handleTouchMove = (event: TouchEvent) => {
      if (!startRef.current) return;

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return {
    elementRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
