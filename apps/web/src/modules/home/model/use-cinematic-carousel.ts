import { useCallback, useEffect, useState } from 'react';

export interface CinematicCarouselOptions {
  itemCount: number;
  autoplayMs?: number;
  reducedMotion?: boolean;
}

export interface CinematicCarouselController {
  activeIndex: number;
  isPaused: boolean;
  select(index: number): void;
  next(): void;
  previous(): void;
  pause(): void;
  resume(): void;
}

function wrapIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }

  return ((index % itemCount) + itemCount) % itemCount;
}

/**
 * Returns the visible rail order with the active destination at the front.
 * The last card naturally wraps to the end as the active index advances.
 */
export function getCinematicCarouselOrder(activeIndex: number, itemCount: number): number[] {
  if (itemCount <= 0) {
    return [];
  }

  return Array.from({ length: itemCount }, (_, offset) =>
    wrapIndex(activeIndex + offset, itemCount),
  );
}

function detectReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useCinematicCarousel({
  itemCount,
  autoplayMs = 5000,
  reducedMotion,
}: CinematicCarouselOptions): CinematicCarouselController {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [systemReducedMotion] = useState(detectReducedMotion);
  const shouldReduceMotion = reducedMotion ?? systemReducedMotion;

  useEffect(() => {
    setActiveIndex((currentIndex) => wrapIndex(currentIndex, itemCount));
  }, [itemCount]);

  useEffect(() => {
    if (isPaused || shouldReduceMotion || itemCount < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => wrapIndex(currentIndex + 1, itemCount));
    }, autoplayMs);

    return () => window.clearInterval(timer);
  }, [activeIndex, autoplayMs, isPaused, itemCount, shouldReduceMotion]);

  const select = useCallback(
    (index: number) => {
      setActiveIndex(wrapIndex(index, itemCount));
    },
    [itemCount],
  );

  const next = useCallback(() => {
    setActiveIndex((currentIndex) => wrapIndex(currentIndex + 1, itemCount));
  }, [itemCount]);

  const previous = useCallback(() => {
    setActiveIndex((currentIndex) => wrapIndex(currentIndex - 1, itemCount));
  }, [itemCount]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  return { activeIndex, isPaused, select, next, previous, pause, resume };
}
