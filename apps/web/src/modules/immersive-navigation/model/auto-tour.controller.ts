export interface AutoTourScheduler {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export interface AutoTourControllerState {
  isRunning: boolean;
  isPaused: boolean;
}

export interface AutoTourControllerOptions {
  intervalMs?: number;
  scheduler?: AutoTourScheduler;
  onNavigate(sceneId: string): void;
  getNextSceneId(sceneId: string): string | null;
  onStateChange?(state: AutoTourControllerState): void;
}

const DEFAULT_INTERVAL_MS = 6500;

const browserScheduler: AutoTourScheduler = {
  schedule(callback, delayMs) {
    return window.setTimeout(callback, delayMs);
  },
  cancel(handle) {
    window.clearTimeout(handle as number);
  },
};

export class AutoTourController {
  private readonly intervalMs: number;

  private readonly scheduler: AutoTourScheduler;

  private readonly onNavigate: (sceneId: string) => void;

  private readonly getNextSceneId: (sceneId: string) => string | null;

  private readonly onStateChange: ((state: AutoTourControllerState) => void) | undefined;

  private state: AutoTourControllerState = { isRunning: false, isPaused: false };

  private currentSceneId: string | null = null;

  private timer: unknown = null;

  constructor({
    intervalMs = DEFAULT_INTERVAL_MS,
    scheduler = browserScheduler,
    onNavigate,
    getNextSceneId,
    onStateChange,
  }: AutoTourControllerOptions) {
    this.intervalMs = intervalMs;
    this.scheduler = scheduler;
    this.onNavigate = onNavigate;
    this.getNextSceneId = getNextSceneId;
    this.onStateChange = onStateChange;
  }

  getState(): AutoTourControllerState {
    return { ...this.state };
  }

  start(currentSceneId: string): boolean {
    const nextSceneId = this.getNextSceneId(currentSceneId);
    if (!nextSceneId) {
      this.stop();
      return false;
    }

    this.cancelTimer();
    this.currentSceneId = currentSceneId;
    this.updateState({ isRunning: true, isPaused: false });
    this.scheduleNext();
    return true;
  }

  toggle(currentSceneId: string): boolean {
    if (this.state.isRunning) {
      this.stop();
      return false;
    }

    return this.start(currentSceneId);
  }

  pause(): void {
    if (!this.state.isRunning) {
      return;
    }

    this.cancelTimer();
    this.updateState({ isRunning: false, isPaused: true });
  }

  stop(): void {
    this.cancelTimer();
    this.currentSceneId = null;
    this.updateState({ isRunning: false, isPaused: false });
  }

  /** Any intentional visitor action cancels automatic progression. */
  manualInteraction(): void {
    this.stop();
  }

  /** Resume scheduling only after the renderer commits the requested scene. */
  onSceneCommitted(sceneId: string): void {
    if (!this.state.isRunning) {
      return;
    }

    this.currentSceneId = sceneId;
    this.scheduleNext();
  }

  destroy(): void {
    this.stop();
    this.onStateChange?.(this.getState());
  }

  private scheduleNext(): void {
    this.cancelTimer();
    if (!this.state.isRunning || !this.currentSceneId) {
      return;
    }

    this.timer = this.scheduler.schedule(() => {
      this.timer = null;
      if (!this.state.isRunning || !this.currentSceneId) {
        return;
      }

      const nextSceneId = this.getNextSceneId(this.currentSceneId);
      if (!nextSceneId) {
        this.stop();
        return;
      }

      this.onNavigate(nextSceneId);
    }, this.intervalMs);
  }

  private cancelTimer(): void {
    if (this.timer === null) {
      return;
    }

    this.scheduler.cancel(this.timer);
    this.timer = null;
  }

  private updateState(nextState: AutoTourControllerState): void {
    if (
      this.state.isRunning === nextState.isRunning &&
      this.state.isPaused === nextState.isPaused
    ) {
      return;
    }

    this.state = nextState;
    this.onStateChange?.(this.getState());
  }
}

export { DEFAULT_INTERVAL_MS as AUTO_TOUR_INTERVAL_MS };
