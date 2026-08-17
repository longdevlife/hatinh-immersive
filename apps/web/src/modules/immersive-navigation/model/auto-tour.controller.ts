export interface AutoTourScheduler {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export interface AutoTourClock {
  now(): number;
}

export type AutoTourPhase =
  'idle' | 'settling' | 'narrating' | 'fallback' | 'holding' | 'transitioning' | 'paused';

export interface AutoTourControllerState {
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  phase: AutoTourPhase;
  currentSceneId: string | null;
}

export interface AutoTourControllerOptions {
  settleDelayMs?: number;
  fallbackDurationMs?: number;
  holdDurationMs?: number;
  skipStoryHoldMs?: number;
  scheduler?: AutoTourScheduler;
  clock?: AutoTourClock;
  onNavigate(sceneId: string): void;
  getNextSceneId(sceneId: string): string | null;
  getPreviousSceneId?(sceneId: string): string | null;
  onNarrationRequested?(sceneId: string): void;
  onStateChange?(state: AutoTourControllerState): void;
}

const DEFAULT_SETTLE_DELAY_MS = 700;
const DEFAULT_FALLBACK_DURATION_MS = 8_000;
const DEFAULT_HOLD_DURATION_MS = 500;
const DEFAULT_SKIP_STORY_HOLD_MS = 180;

const browserScheduler: AutoTourScheduler = {
  schedule(callback, delayMs) {
    return window.setTimeout(callback, delayMs);
  },
  cancel(handle) {
    window.clearTimeout(handle as number);
  },
};

const browserClock: AutoTourClock = {
  now() {
    return performance.now();
  },
};

const INITIAL_STATE: AutoTourControllerState = {
  isActive: false,
  isRunning: false,
  isPaused: false,
  phase: 'idle',
  currentSceneId: null,
};

type TimedAutoTourPhase = Extract<AutoTourPhase, 'settling' | 'fallback' | 'holding'>;

const TIMED_PHASES = new Set<TimedAutoTourPhase>(['settling', 'fallback', 'holding']);

function isTimedPhase(phase: AutoTourPhase): phase is TimedAutoTourPhase {
  return TIMED_PHASES.has(phase as TimedAutoTourPhase);
}

export class AutoTourController {
  private readonly settleDelayMs: number;

  private readonly fallbackDurationMs: number;

  private readonly holdDurationMs: number;

  private readonly skipStoryHoldMs: number;

  private readonly scheduler: AutoTourScheduler;

  private readonly clock: AutoTourClock;

  private readonly onNavigate: (sceneId: string) => void;

  private readonly getNextSceneId: (sceneId: string) => string | null;

  private readonly getPreviousSceneId: ((sceneId: string) => string | null) | undefined;

  private readonly onNarrationRequested: ((sceneId: string) => void) | undefined;

  private readonly onStateChange: ((state: AutoTourControllerState) => void) | undefined;

  private state: AutoTourControllerState = { ...INITIAL_STATE };

  private timer: unknown = null;

  private timerDeadlineMs: number | null = null;

  private timerToken = 0;

  private pausedPhase: AutoTourPhase | null = null;

  private pausedRemainingDelayMs: number | null = null;

  constructor({
    settleDelayMs = DEFAULT_SETTLE_DELAY_MS,
    fallbackDurationMs = DEFAULT_FALLBACK_DURATION_MS,
    holdDurationMs = DEFAULT_HOLD_DURATION_MS,
    skipStoryHoldMs = DEFAULT_SKIP_STORY_HOLD_MS,
    scheduler = browserScheduler,
    clock = browserClock,
    onNavigate,
    getNextSceneId,
    getPreviousSceneId,
    onNarrationRequested,
    onStateChange,
  }: AutoTourControllerOptions) {
    this.settleDelayMs = Math.max(0, settleDelayMs);
    this.fallbackDurationMs = Math.max(0, fallbackDurationMs);
    this.holdDurationMs = Math.max(0, holdDurationMs);
    this.skipStoryHoldMs = Math.max(0, skipStoryHoldMs);
    this.scheduler = scheduler;
    this.clock = clock;
    this.onNavigate = onNavigate;
    this.getNextSceneId = getNextSceneId;
    this.getPreviousSceneId = getPreviousSceneId;
    this.onNarrationRequested = onNarrationRequested;
    this.onStateChange = onStateChange;
  }

  getState(): AutoTourControllerState {
    return { ...this.state };
  }

  start(currentSceneId: string): boolean {
    if (!this.getNextSceneId(currentSceneId)) {
      this.stop();
      return false;
    }

    this.cancelTimer();
    this.pausedPhase = null;
    this.pausedRemainingDelayMs = null;
    this.beginSceneLifecycle(currentSceneId);
    return true;
  }

  toggle(currentSceneId: string): boolean {
    if (this.state.isActive) {
      this.stop();
      return false;
    }

    return this.start(currentSceneId);
  }

  pause(): void {
    if (!this.state.isActive || this.state.isPaused) {
      return;
    }

    const phase = this.state.phase;
    this.pausedPhase = phase === 'paused' ? this.pausedPhase : phase;
    this.pausedRemainingDelayMs = this.getRemainingTimerDelay();
    this.cancelTimer();
    this.updateState({ isRunning: false, isPaused: true, phase: 'paused' });
  }

  resume(): void {
    if (!this.state.isActive || !this.state.isPaused) {
      return;
    }

    const phase = this.pausedPhase ?? 'settling';
    const remainingDelayMs = this.pausedRemainingDelayMs;
    this.pausedPhase = null;
    this.pausedRemainingDelayMs = null;
    this.updateState({ isRunning: true, isPaused: false, phase });

    if (isTimedPhase(phase)) {
      this.schedulePhase(phase, remainingDelayMs ?? this.getDefaultDelay(phase));
    }
  }

  stop(): void {
    this.cancelTimer();
    this.pausedPhase = null;
    this.pausedRemainingDelayMs = null;
    this.updateState({ ...INITIAL_STATE });
  }

  exitToFreeExplore(): void {
    this.stop();
  }

  /**
   * Kept as a compatibility no-op while callers migrate to explicit commands.
   * Visitor gestures must not implicitly cancel a running Auto Tour.
   */
  manualInteraction(): void {}

  /** Viewport rotation is not a progression command. */
  onViewportInteraction(): void {}

  onSceneCommitted(sceneId: string): void {
    if (!this.state.isActive) {
      return;
    }

    if (this.state.isPaused) {
      this.pausedPhase = 'settling';
      this.pausedRemainingDelayMs = null;
      this.updateState({ currentSceneId: sceneId });
      return;
    }

    this.beginSceneLifecycle(sceneId);
  }

  onNarrationStarted(sceneId: string): boolean {
    if (!this.isCurrentRunningScene(sceneId) || this.state.phase !== 'narrating') {
      return false;
    }

    return true;
  }

  onNarrationEnded(sceneId: string): boolean {
    if (!this.isCurrentRunningScene(sceneId) || this.state.phase !== 'narrating') {
      return false;
    }

    this.schedulePhase('holding', this.holdDurationMs);
    return true;
  }

  onNarrationUnavailable(sceneId: string, fallbackDurationMs = this.fallbackDurationMs): boolean {
    if (!this.isCurrentRunningScene(sceneId) || this.state.phase !== 'narrating') {
      return false;
    }

    this.schedulePhase('fallback', Math.max(0, fallbackDurationMs));
    return true;
  }

  jumpTo(sceneId: string): boolean {
    if (!this.state.isActive || !this.state.currentSceneId) {
      return false;
    }

    if (sceneId === this.state.currentSceneId) {
      if (this.state.isPaused) {
        this.pausedPhase = 'settling';
        this.pausedRemainingDelayMs = null;
      } else {
        this.beginSceneLifecycle(sceneId);
      }
      return true;
    }

    this.cancelTimer();
    this.pausedPhase = this.state.isPaused ? 'settling' : null;
    this.pausedRemainingDelayMs = null;
    this.updateState({
      currentSceneId: sceneId,
      phase: this.state.isPaused ? 'paused' : 'transitioning',
    });
    this.onNavigate(sceneId);
    return true;
  }

  next(): boolean {
    const currentSceneId = this.state.currentSceneId;
    if (!currentSceneId) {
      return false;
    }

    const nextSceneId = this.getNextSceneId(currentSceneId);
    if (!nextSceneId) {
      return false;
    }

    this.navigateImmediately(nextSceneId);
    return true;
  }

  previous(): boolean {
    const currentSceneId = this.state.currentSceneId;
    const previousSceneId = currentSceneId
      ? (this.getPreviousSceneId?.(currentSceneId) ?? null)
      : null;
    if (!previousSceneId) {
      return false;
    }

    this.navigateImmediately(previousSceneId);
    return true;
  }

  skipStory(): boolean {
    if (!this.isCurrentRunningScene(this.state.currentSceneId)) {
      return false;
    }

    this.schedulePhase('holding', this.skipStoryHoldMs);
    return true;
  }

  onSceneTransitionFailed(failedSceneId: string, committedSceneId: string | null): boolean {
    if (!this.state.isActive || this.state.currentSceneId !== failedSceneId || !committedSceneId) {
      return false;
    }

    if (this.state.isPaused) {
      this.pausedPhase = 'settling';
      this.pausedRemainingDelayMs = null;
      this.updateState({ currentSceneId: committedSceneId });
      return true;
    }

    if (this.state.phase !== 'transitioning') {
      return false;
    }

    this.beginSceneLifecycle(committedSceneId);
    return true;
  }

  destroy(): void {
    this.stop();
  }

  private beginSceneLifecycle(sceneId: string): void {
    this.cancelTimer();
    this.pausedPhase = null;
    this.pausedRemainingDelayMs = null;
    this.updateState({
      isActive: true,
      isRunning: true,
      isPaused: false,
      phase: 'settling',
      currentSceneId: sceneId,
    });
    this.schedulePhase('settling', this.settleDelayMs, () => {
      if (!this.isCurrentRunningScene(sceneId)) {
        return;
      }

      this.updateState({ phase: 'narrating' });
      this.onNarrationRequested?.(sceneId);
    });
  }

  private navigateImmediately(sceneId: string): void {
    this.cancelTimer();
    this.pausedPhase = this.state.isPaused ? 'settling' : null;
    this.pausedRemainingDelayMs = null;
    this.updateState({
      phase: this.state.isPaused ? 'paused' : 'transitioning',
      currentSceneId: sceneId,
    });
    this.onNavigate(sceneId);
  }

  private schedulePhase(
    phase: Extract<AutoTourPhase, 'settling' | 'fallback' | 'holding'>,
    delayMs: number,
    callback?: () => void,
  ): void {
    this.cancelTimer();
    this.updateState({ phase, isRunning: true, isPaused: false });
    const token = ++this.timerToken;
    const boundedDelayMs = Math.max(0, delayMs);
    this.timerDeadlineMs = this.clock.now() + boundedDelayMs;
    this.timer = this.scheduler.schedule(() => {
      if (token !== this.timerToken) {
        return;
      }

      this.timer = null;
      this.timerDeadlineMs = null;
      if (!this.state.isActive || this.state.isPaused || !this.state.currentSceneId) {
        return;
      }

      callback?.();
      if (callback) {
        return;
      }

      if (phase === 'holding' || phase === 'fallback') {
        this.navigateToNextScene();
      }
    }, boundedDelayMs);
  }

  private navigateToNextScene(): void {
    const currentSceneId = this.state.currentSceneId;
    const nextSceneId = currentSceneId ? this.getNextSceneId(currentSceneId) : null;
    if (!nextSceneId) {
      this.stop();
      return;
    }

    this.updateState({ phase: 'transitioning' });
    this.onNavigate(nextSceneId);
  }

  private isCurrentRunningScene(sceneId: string | null): boolean {
    return Boolean(
      this.state.isActive &&
      !this.state.isPaused &&
      sceneId &&
      this.state.currentSceneId === sceneId,
    );
  }

  private getRemainingTimerDelay(): number | null {
    if (this.timerDeadlineMs === null) {
      return null;
    }

    return Math.max(0, this.timerDeadlineMs - this.clock.now());
  }

  private getDefaultDelay(phase: AutoTourPhase): number {
    switch (phase) {
      case 'settling':
        return this.settleDelayMs;
      case 'fallback':
        return this.fallbackDurationMs;
      case 'holding':
        return this.holdDurationMs;
      default:
        return 0;
    }
  }

  private cancelTimer(): void {
    this.timerToken += 1;
    if (this.timer !== null) {
      this.scheduler.cancel(this.timer);
      this.timer = null;
    }
    this.timerDeadlineMs = null;
  }

  private updateState(patch: Partial<AutoTourControllerState>): void {
    const nextState = { ...this.state, ...patch };
    if (
      this.state.isActive === nextState.isActive &&
      this.state.isRunning === nextState.isRunning &&
      this.state.isPaused === nextState.isPaused &&
      this.state.phase === nextState.phase &&
      this.state.currentSceneId === nextState.currentSceneId
    ) {
      return;
    }

    this.state = nextState;
    this.onStateChange?.(this.getState());
  }
}

export {
  DEFAULT_FALLBACK_DURATION_MS,
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SETTLE_DELAY_MS,
  DEFAULT_SKIP_STORY_HOLD_MS,
};
