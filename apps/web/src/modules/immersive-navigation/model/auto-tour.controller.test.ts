import { describe, expect, it, vi } from 'vitest';

import { AutoTourController, type AutoTourScheduler } from './auto-tour.controller';

class FakeScheduler implements AutoTourScheduler {
  private nextId = 0;

  readonly callbacks = new Map<number, () => void>();

  schedule(callback: () => void): number {
    const id = ++this.nextId;
    this.callbacks.set(id, callback);
    return id;
  }

  cancel(handle: unknown): void {
    this.callbacks.delete(handle as number);
  }

  flush(): void {
    const [id, callback] = this.callbacks.entries().next().value ?? [];
    if (typeof id !== 'number' || typeof callback !== 'function') {
      return;
    }

    this.callbacks.delete(id);
    callback();
  }
}

describe('AutoTourController', () => {
  it('progresses only after each requested scene commits', () => {
    const scheduler = new FakeScheduler();
    const onNavigate = vi.fn();
    const controller = new AutoTourController({
      scheduler,
      onNavigate,
      getNextSceneId: (sceneId) =>
        ({ gate: 'culture', culture: 'ecology', ecology: 'spiritual' })[sceneId] ?? null,
    });

    expect(controller.start('gate')).toBe(true);
    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('culture');
    expect(scheduler.callbacks.size).toBe(0);

    controller.onSceneCommitted('culture');
    scheduler.flush();
    expect(onNavigate).toHaveBeenLastCalledWith('ecology');
  });

  it('does not create duplicate timers when restarted', () => {
    const scheduler = new FakeScheduler();
    const controller = new AutoTourController({
      scheduler,
      onNavigate: vi.fn(),
      getNextSceneId: () => 'next',
    });

    controller.start('gate');
    controller.start('gate');

    expect(scheduler.callbacks.size).toBe(1);
  });

  it('stops immediately on manual interaction', () => {
    const scheduler = new FakeScheduler();
    const onNavigate = vi.fn();
    const controller = new AutoTourController({
      scheduler,
      onNavigate,
      getNextSceneId: () => 'next',
    });

    controller.start('gate');
    controller.manualInteraction();
    scheduler.flush();

    expect(onNavigate).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ isRunning: false, isPaused: false });
  });

  it('cannot start a tour with no next scene', () => {
    const controller = new AutoTourController({
      scheduler: new FakeScheduler(),
      onNavigate: vi.fn(),
      getNextSceneId: () => null,
    });

    expect(controller.start('gate')).toBe(false);
    expect(controller.getState()).toEqual({ isRunning: false, isPaused: false });
  });
});
