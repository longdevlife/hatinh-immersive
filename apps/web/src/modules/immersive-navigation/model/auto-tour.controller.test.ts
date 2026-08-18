import { describe, expect, it, vi } from 'vitest';

import {
  AutoTourController,
  type AutoTourClock,
  type AutoTourScheduler,
} from './auto-tour.controller';

class FakeScheduler implements AutoTourScheduler {
  private nextId = 0;

  readonly callbacks = new Map<number, () => void>();

  readonly delays = new Map<number, number>();

  schedule(callback: () => void, delayMs: number): number {
    const id = ++this.nextId;
    this.callbacks.set(id, callback);
    this.delays.set(id, delayMs);
    return id;
  }

  cancel(handle: unknown): void {
    this.callbacks.delete(handle as number);
    this.delays.delete(handle as number);
  }

  get lastDelayMs(): number | undefined {
    return [...this.delays.values()].at(-1);
  }

  flush(): void {
    const [id, callback] = this.callbacks.entries().next().value ?? [];
    if (typeof id !== 'number' || typeof callback !== 'function') {
      return;
    }

    this.callbacks.delete(id);
    this.delays.delete(id);
    callback();
  }
}

class FakeClock implements AutoTourClock {
  nowMs = 0;

  now(): number {
    return this.nowMs;
  }

  advance(deltaMs: number): void {
    this.nowMs += deltaMs;
  }
}

function createController(
  overrides: Partial<ConstructorParameters<typeof AutoTourController>[0]> = {},
) {
  const scheduler = overrides.scheduler ?? new FakeScheduler();
  const onNavigate = overrides.onNavigate ?? vi.fn();
  const onNarrationRequested = overrides.onNarrationRequested ?? vi.fn();
  const controller = new AutoTourController({
    scheduler,
    onNavigate,
    onNarrationRequested,
    getNextSceneId: (sceneId) =>
      ({ gate: 'culture', culture: 'ecology', ecology: 'spiritual' })[sceneId] ?? null,
    getPreviousSceneId: (sceneId) =>
      ({ spiritual: 'ecology', ecology: 'culture', culture: 'gate' })[sceneId] ?? null,
    ...overrides,
  });

  return {
    controller,
    scheduler: scheduler as FakeScheduler,
    onNavigate,
    onNarrationRequested,
  };
}

describe('AutoTourController', () => {
  it('settles then requests narration instead of using the old fixed interval', () => {
    const { controller, scheduler, onNavigate, onNarrationRequested } = createController({
      settleDelayMs: 500,
    });

    expect(controller.start('gate')).toBe(true);
    expect(controller.getState()).toMatchObject({
      isActive: true,
      isRunning: true,
      isPaused: false,
      phase: 'settling',
      currentSceneId: 'gate',
    });
    expect(scheduler.lastDelayMs).toBe(500);

    scheduler.flush();

    expect(onNarrationRequested).toHaveBeenCalledWith('gate');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(controller.getState().phase).toBe('narrating');
  });

  it('holds then navigates after narration ends', () => {
    const { controller, scheduler, onNavigate } = createController({
      settleDelayMs: 0,
      holdDurationMs: 300,
    });

    controller.start('gate');
    scheduler.flush();
    controller.onNarrationEnded('gate');

    expect(controller.getState()).toMatchObject({
      isActive: true,
      phase: 'holding',
    });
    expect(scheduler.lastDelayMs).toBe(300);

    scheduler.flush();

    expect(onNavigate).toHaveBeenCalledWith('culture');
    expect(controller.getState()).toMatchObject({
      isActive: true,
      isRunning: true,
      phase: 'transitioning',
    });
  });

  it('uses the supplied fallback duration when narration is unavailable', () => {
    const { controller, scheduler, onNavigate } = createController({ settleDelayMs: 0 });

    controller.start('gate');
    scheduler.flush();
    controller.onNarrationUnavailable('gate', 1_250);

    expect(controller.getState().phase).toBe('fallback');
    expect(scheduler.lastDelayMs).toBe(1_250);

    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('culture');
  });

  it('preserves remaining timed delay across pause and resume', () => {
    const scheduler = new FakeScheduler();
    const clock = new FakeClock();
    const { controller } = createController({
      scheduler,
      clock,
      settleDelayMs: 1_000,
    });

    controller.start('gate');
    clock.advance(375);
    controller.pause();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isRunning: false,
      isPaused: true,
      phase: 'paused',
    });
    expect(scheduler.callbacks.size).toBe(0);

    controller.resume();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isRunning: true,
      isPaused: false,
      phase: 'settling',
    });
    expect(scheduler.lastDelayMs).toBe(625);
  });

  it('resumes a paused narration that ended into holding and continues progression', () => {
    const { controller, scheduler, onNavigate } = createController({
      settleDelayMs: 0,
      holdDurationMs: 300,
    });

    controller.start('gate');
    scheduler.flush();
    controller.pause();

    expect(controller.onNarrationEnded('gate')).toBe(true);
    expect(controller.getState()).toMatchObject({
      isActive: true,
      isPaused: true,
      phase: 'paused',
    });

    controller.resume();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isPaused: false,
      phase: 'holding',
    });
    expect(scheduler.lastDelayMs).toBe(300);

    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('culture');
  });

  it('resumes a paused narration failure into fallback and continues progression', () => {
    const { controller, scheduler, onNavigate } = createController({ settleDelayMs: 0 });

    controller.start('gate');
    scheduler.flush();
    controller.pause();

    expect(controller.onNarrationUnavailable('gate', 1_250)).toBe(true);
    controller.resume();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isPaused: false,
      phase: 'fallback',
    });
    expect(scheduler.lastDelayMs).toBe(1_250);

    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('culture');
  });

  it('ignores a stale narration lifecycle for another scene while paused', () => {
    const { controller, scheduler } = createController({ settleDelayMs: 0 });

    controller.start('gate');
    scheduler.flush();
    controller.pause();

    expect(controller.onNarrationEnded('culture')).toBe(false);
    expect(controller.onNarrationUnavailable('culture')).toBe(false);

    controller.resume();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isPaused: false,
      phase: 'narrating',
    });
    expect(scheduler.callbacks.size).toBe(0);
  });

  it('keeps the tour active when jumping to another scene', () => {
    const { controller, scheduler, onNavigate, onNarrationRequested } = createController({
      settleDelayMs: 100,
    });

    controller.start('gate');
    expect(controller.jumpTo('ecology')).toBe(true);

    expect(onNavigate).toHaveBeenCalledWith('ecology');
    expect(controller.getState()).toMatchObject({
      isActive: true,
      phase: 'transitioning',
      currentSceneId: 'ecology',
    });

    controller.onSceneCommitted('ecology');
    scheduler.flush();

    expect(onNarrationRequested).toHaveBeenCalledWith('ecology');
    expect(controller.getState().isActive).toBe(true);
  });

  it('recovers the committed scene when a renderer transition fails', () => {
    const { controller, scheduler, onNarrationRequested } = createController({
      settleDelayMs: 0,
    });

    controller.start('gate');
    controller.next();

    expect(controller.getState()).toMatchObject({
      phase: 'transitioning',
      currentSceneId: 'culture',
    });
    expect(controller.onSceneTransitionFailed('culture', 'gate')).toBe(true);
    expect(controller.getState()).toMatchObject({
      phase: 'settling',
      currentSceneId: 'gate',
      isActive: true,
    });

    scheduler.flush();
    expect(onNarrationRequested).toHaveBeenCalledWith('gate');
  });

  it('stops safely when a requested scene is runtime-unavailable', () => {
    const { controller, scheduler, onNavigate } = createController({
      settleDelayMs: 0,
    });

    controller.start('gate');
    controller.next();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      phase: 'transitioning',
      currentSceneId: 'culture',
    });
    expect(controller.onSceneTransitionUnavailable('culture', 'gate')).toBe(true);
    expect(controller.getState()).toEqual({
      isActive: false,
      isRunning: false,
      isPaused: false,
      phase: 'idle',
      currentSceneId: null,
    });
    expect(onNavigate).toHaveBeenCalledTimes(1);

    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('keeps a paused tour aligned with the committed scene after a failed jump', () => {
    const { controller } = createController({ settleDelayMs: 0 });

    controller.start('gate');
    controller.pause();
    controller.jumpTo('culture');

    expect(controller.getState()).toMatchObject({
      isPaused: true,
      phase: 'paused',
      currentSceneId: 'culture',
    });
    expect(controller.onSceneTransitionFailed('culture', 'gate')).toBe(true);
    expect(controller.getState()).toMatchObject({
      isActive: true,
      isPaused: true,
      phase: 'paused',
      currentSceneId: 'gate',
    });
  });

  it('does not stop because the panorama viewport was manually rotated', () => {
    const { controller } = createController();

    controller.start('gate');
    controller.onViewportInteraction();
    controller.manualInteraction();

    expect(controller.getState()).toMatchObject({
      isActive: true,
      isRunning: true,
      isPaused: false,
    });
  });

  it('stops only on explicit explore-freely or stop', () => {
    const { controller } = createController();

    controller.start('gate');
    controller.exitToFreeExplore();

    expect(controller.getState()).toEqual({
      isActive: false,
      isRunning: false,
      isPaused: false,
      phase: 'idle',
      currentSceneId: null,
    });
  });

  it('next navigates immediately', () => {
    const { controller, onNavigate } = createController();

    controller.start('gate');
    expect(controller.next()).toBe(true);

    expect(onNavigate).toHaveBeenCalledWith('culture');
    expect(controller.getState().phase).toBe('transitioning');
  });

  it('previous navigates previous and starts the new scene lifecycle', () => {
    const { controller, scheduler, onNavigate, onNarrationRequested } = createController({
      settleDelayMs: 100,
    });

    controller.start('ecology');
    expect(controller.previous()).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith('culture');

    controller.onSceneCommitted('culture');
    scheduler.flush();

    expect(onNarrationRequested).toHaveBeenCalledWith('culture');
    expect(controller.getState()).toMatchObject({
      isActive: true,
      currentSceneId: 'culture',
      phase: 'narrating',
    });
  });

  it('skip story uses a short hold distinct from next', () => {
    const { controller, scheduler, onNavigate } = createController({
      settleDelayMs: 0,
      holdDurationMs: 900,
      skipStoryHoldMs: 150,
    });

    controller.start('gate');
    scheduler.flush();
    expect(controller.skipStory()).toBe(true);

    expect(controller.getState().phase).toBe('holding');
    expect(scheduler.lastDelayMs).toBe(150);
    expect(onNavigate).not.toHaveBeenCalled();

    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('culture');
  });

  it.each([
    ['settling', (_controller: AutoTourController, _scheduler: FakeScheduler) => {}],
    [
      'fallback',
      (controller: AutoTourController, scheduler: FakeScheduler) => {
        scheduler.flush();
        controller.onNarrationUnavailable('gate', 1_250);
      },
    ],
    [
      'holding',
      (controller: AutoTourController, scheduler: FakeScheduler) => {
        scheduler.flush();
        controller.onNarrationEnded('gate');
      },
    ],
  ])('treats Skip as a no-op in the %s phase', (_phase, arrangePhase) => {
    const { controller, scheduler } = createController({ settleDelayMs: 0 });

    controller.start('gate');
    arrangePhase(controller, scheduler);

    const stateBefore = controller.getState();
    const callbackCountBefore = scheduler.callbacks.size;
    expect(controller.canSkipStory()).toBe(false);
    expect(controller.skipStory()).toBe(false);
    expect(controller.getState()).toEqual(stateBefore);
    expect(scheduler.callbacks.size).toBe(callbackCountBefore);
  });

  it('cannot start a tour with no next scene', () => {
    const controller = new AutoTourController({
      scheduler: new FakeScheduler(),
      onNavigate: vi.fn(),
      getNextSceneId: () => null,
    });

    expect(controller.start('gate')).toBe(false);
    expect(controller.getState()).toMatchObject({
      isActive: false,
      phase: 'idle',
      currentSceneId: null,
    });
  });
});
