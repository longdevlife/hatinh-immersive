import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCinematicCarouselOrder, useCinematicCarousel } from './use-cinematic-carousel';

describe('getCinematicCarouselOrder', () => {
  it('rotates the first destination to the end after each active step', () => {
    expect(getCinematicCarouselOrder(0, 4)).toEqual([0, 1, 2, 3]);
    expect(getCinematicCarouselOrder(1, 4)).toEqual([1, 2, 3, 0]);
    expect(getCinematicCarouselOrder(2, 4)).toEqual([2, 3, 0, 1]);
    expect(getCinematicCarouselOrder(3, 4)).toEqual([3, 0, 1, 2]);
  });

  it('returns an empty order for an empty catalog', () => {
    expect(getCinematicCarouselOrder(0, 0)).toEqual([]);
  });
});

describe('useCinematicCarousel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the first item and wraps previous/next selection', () => {
    const { result } = renderHook(() => useCinematicCarousel({ itemCount: 4, autoplayMs: 5000 }));

    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.previous());
    expect(result.current.activeIndex).toBe(3);

    act(() => result.current.next());
    expect(result.current.activeIndex).toBe(0);
  });

  it('selects a card immediately and restarts exactly one autoplay timer', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCinematicCarousel({ itemCount: 4, autoplayMs: 5000 }));

    act(() => result.current.select(2));
    expect(result.current.activeIndex).toBe(2);

    act(() => vi.advanceTimersByTime(4999));
    expect(result.current.activeIndex).toBe(2);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.activeIndex).toBe(3);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.activeIndex).toBe(0);
  });

  it('pauses while the interactive region is occupied and resumes afterward', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCinematicCarousel({ itemCount: 4, autoplayMs: 5000 }));

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.activeIndex).toBe(1);
  });

  it('does not autoplay when reduced motion is requested', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useCinematicCarousel({ itemCount: 4, autoplayMs: 5000, reducedMotion: true }),
    );

    act(() => vi.advanceTimersByTime(15_000));

    expect(result.current.activeIndex).toBe(0);
  });
});
