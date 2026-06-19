import { useCallback, useRef } from 'react';
import type { Direction } from '../types/game';

const SWIPE_THRESHOLD = 30;

interface TouchPoint {
  x: number;
  y: number;
}

export function useSwipe(onSwipe: (direction: Direction) => void) {
  const startRef = useRef<TouchPoint | null>(null);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!startRef.current) return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        onSwipe(dx > 0 ? 'right' : 'left');
      } else {
        onSwipe(dy > 0 ? 'down' : 'up');
      }
    },
    [onSwipe],
  );

  return { onTouchStart, onTouchEnd };
}
