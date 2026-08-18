import type { ImmersiveAudioTrack } from '../../../shared/contracts';

export interface AudioPlaybackSnapshot {
  currentTimeSeconds: number;
  durationSeconds: number;
  canSeek: boolean;
}

export interface AudioTrackHandle {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
  fadeTo(volume: number, durationMs: number): Promise<void>;
  seek(seconds: number): boolean;
  getPlaybackSnapshot(): AudioPlaybackSnapshot;
  onProgress(listener: (snapshot: AudioPlaybackSnapshot) => void): () => void;
  onEnded(listener: () => void): () => void;
  onError?(listener: () => void): () => void;
}

export interface NarrationLifecycleEvent {
  type: 'ended' | 'error';
  trackId: string;
  ownershipId: number;
}

export interface AudioAdapter {
  create(track: ImmersiveAudioTrack): AudioTrackHandle | null;
}

export interface ImmersiveAudioState {
  masterMuted: boolean;
  ambientEnabled: boolean;
  narrationEnabled: boolean;
  ambientTrackId: string | null;
  ambientPlaying: boolean;
  narrationTrackId: string | null;
  ambientVolume: number;
  narrationVolume: number;
  narrationPlaying: boolean;
  narrationCurrentTimeSeconds: number;
  narrationDurationSeconds: number;
  narrationCanSeek: boolean;
  autoplayBlocked: boolean;
}

export const DEFAULT_AMBIENT_VOLUME = 0.18;
export const DEFAULT_NARRATION_VOLUME = 1;
export const DUCKED_AMBIENT_VOLUME = 0.045;
export const AMBIENT_SCENE_CROSSFADE_MS = 750;
export const AMBIENT_DESTINATION_CROSSFADE_MS = 1000;
export const NARRATION_STOP_FADE_MS = 180;

export type AmbientTransitionKind = 'scene' | 'destination';

const INITIAL_AUDIO_STATE: ImmersiveAudioState = {
  masterMuted: false,
  ambientEnabled: true,
  narrationEnabled: true,
  ambientTrackId: null,
  ambientPlaying: false,
  narrationTrackId: null,
  ambientVolume: DEFAULT_AMBIENT_VOLUME,
  narrationVolume: DEFAULT_NARRATION_VOLUME,
  narrationPlaying: false,
  narrationCurrentTimeSeconds: 0,
  narrationDurationSeconds: 0,
  narrationCanSeek: false,
  autoplayBlocked: false,
};

export class ImmersiveAudioController {
  private state: ImmersiveAudioState = { ...INITIAL_AUDIO_STATE };

  private ambientHandle: AudioTrackHandle | null = null;

  private committedAmbientTrackId: string | null = null;

  private committedAmbientPlaying = false;

  private ambientHandles = new Set<AudioTrackHandle>();

  private pendingAmbientTransition: {
    trackId: string;
    handle: AudioTrackHandle;
  } | null = null;

  private ambientTransitionPromise: Promise<void> | null = null;

  private narrationHandle: AudioTrackHandle | null = null;

  private narrationTransportGeneration = 0;

  private narrationDesiredPlaying = false;

  private narrationOwnershipSequence = 0;

  private narrationOwnershipId: number | null = null;

  private narrationEndedCleanup: (() => void) | null = null;

  private narrationErrorCleanup: (() => void) | null = null;

  private narrationProgressCleanup: (() => void) | null = null;

  private ambientTransitionId = 0;

  private listeners = new Set<(state: ImmersiveAudioState) => void>();

  private narrationLifecycleListeners = new Set<(event: NarrationLifecycleEvent) => void>();

  constructor(private readonly adapter: AudioAdapter) {}

  getState(): ImmersiveAudioState {
    return { ...this.state };
  }

  getNarrationOwnershipId(): number | null {
    return this.narrationOwnershipId;
  }

  isNarrationPlaybackResumable(ownershipId: number): boolean {
    return Boolean(
      this.narrationHandle &&
      this.narrationOwnershipId === ownershipId &&
      !this.narrationDesiredPlaying,
    );
  }

  subscribe(listener: (state: ImmersiveAudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeNarrationLifecycle(listener: (event: NarrationLifecycleEvent) => void): () => void {
    this.narrationLifecycleListeners.add(listener);
    return () => this.narrationLifecycleListeners.delete(listener);
  }

  async setAmbientTrack(
    track: ImmersiveAudioTrack | null,
    transitionKind: AmbientTransitionKind = 'scene',
  ): Promise<void> {
    if (
      track?.id === this.state.ambientTrackId &&
      (this.ambientHandle !== null || this.pendingAmbientTransition?.trackId === track.id)
    ) {
      return;
    }

    if (!track || track.type !== 'ambient') {
      this.stopAmbient();
      this.update({ ambientTrackId: null, ambientPlaying: false });
      return;
    }

    const nextHandle = this.adapter.create(track);
    if (!nextHandle) {
      if (this.pendingAmbientTransition) {
        this.ambientTransitionId += 1;
        this.cancelPendingAmbientTransition();
        this.update({
          ambientTrackId: this.committedAmbientTrackId,
          ambientPlaying: this.committedAmbientPlaying,
          autoplayBlocked: false,
        });
        this.applyVolumes();
      }
      return;
    }

    this.cancelPendingAmbientTransition();
    this.ambientHandles.add(nextHandle);
    const previousHandle = this.ambientHandle;
    const previousTrackId = this.committedAmbientTrackId;
    const wasPlaying = this.committedAmbientPlaying;
    const transitionId = ++this.ambientTransitionId;
    this.update({ ambientTrackId: track.id, ambientPlaying: false, autoplayBlocked: false });
    this.applyVolumes();

    if (!previousHandle || !wasPlaying) {
      this.stopHandle(previousHandle);
      this.ambientHandle = nextHandle;
      this.committedAmbientTrackId = track.id;
      this.committedAmbientPlaying = false;
      this.applyVolumes();
      return;
    }

    nextHandle.setVolume(0);
    const transitionPromise = this.completeAmbientTransition(
      transitionId,
      track.id,
      nextHandle,
      previousHandle,
      previousTrackId,
      wasPlaying,
      transitionKind,
    );
    this.pendingAmbientTransition = { trackId: track.id, handle: nextHandle };
    this.ambientTransitionPromise = transitionPromise;
    await transitionPromise;
  }

  async startAmbient(): Promise<boolean> {
    while (this.ambientTransitionPromise) {
      const transition = this.ambientTransitionPromise;
      await transition;
      if (this.ambientTransitionPromise === transition) {
        break;
      }
    }
    if (!this.ambientHandle || !this.state.ambientEnabled || this.state.masterMuted) {
      return false;
    }
    if (this.state.ambientPlaying) {
      return true;
    }

    this.applyVolumes();
    try {
      await this.ambientHandle.play();
      this.committedAmbientPlaying = true;
      this.update({ ambientPlaying: true, autoplayBlocked: false });
      return true;
    } catch {
      this.update({ ambientPlaying: false, autoplayBlocked: true });
      return false;
    }
  }

  async setAmbientEnabled(enabled: boolean): Promise<boolean> {
    this.update({ ambientEnabled: enabled });
    if (!enabled) {
      this.ambientTransitionId += 1;
      this.cancelPendingAmbientTransition();
      this.ambientHandle?.pause();
      this.committedAmbientPlaying = false;
      this.update({ ambientTrackId: this.committedAmbientTrackId, ambientPlaying: false });
      this.applyVolumes();
      return true;
    }
    return this.startAmbient();
  }

  async playNarration(track: ImmersiveAudioTrack | null): Promise<boolean> {
    if (!track || track.type !== 'narration' || !this.state.narrationEnabled) {
      return false;
    }

    this.stopNarration();
    this.narrationHandle = this.adapter.create(track);
    if (!this.narrationHandle) {
      return false;
    }

    const handle = this.narrationHandle;
    const transportGeneration = ++this.narrationTransportGeneration;
    const ownershipId = ++this.narrationOwnershipSequence;
    this.narrationOwnershipId = ownershipId;
    this.narrationDesiredPlaying = true;
    this.narrationProgressCleanup = handle.onProgress((snapshot) => {
      if (this.narrationHandle !== handle) {
        return;
      }
      this.update({
        narrationCurrentTimeSeconds: snapshot.currentTimeSeconds,
        narrationDurationSeconds: snapshot.durationSeconds,
        narrationCanSeek: snapshot.canSeek,
      });
    });
    this.narrationEndedCleanup = handle.onEnded(() => {
      this.finishNarration(handle, 'ended');
    });
    this.narrationErrorCleanup =
      handle.onError?.(() => {
        this.finishNarration(handle, 'error');
      }) ?? null;
    const snapshot = handle.getPlaybackSnapshot();
    this.update({
      narrationTrackId: track.id,
      narrationPlaying: false,
      narrationCurrentTimeSeconds: snapshot.currentTimeSeconds,
      narrationDurationSeconds: snapshot.durationSeconds,
      narrationCanSeek: snapshot.canSeek,
    });
    this.applyVolumes();

    try {
      await handle.play();
      if (
        this.narrationHandle !== handle ||
        this.narrationTransportGeneration !== transportGeneration ||
        !this.narrationDesiredPlaying
      ) {
        return false;
      }
      this.update({ narrationPlaying: true, autoplayBlocked: false });
      await this.applyVolumes(NARRATION_STOP_FADE_MS);
      return true;
    } catch {
      if (
        this.narrationHandle !== handle ||
        this.narrationTransportGeneration !== transportGeneration ||
        !this.narrationDesiredPlaying
      ) {
        return false;
      }
      this.stopNarration();
      this.update({ autoplayBlocked: true });
      return false;
    }
  }

  pauseNarration(): void {
    this.narrationTransportGeneration += 1;
    this.narrationDesiredPlaying = false;
    this.narrationHandle?.pause();
    this.update({ narrationPlaying: false });
    void this.applyVolumes(NARRATION_STOP_FADE_MS);
  }

  async resumeNarration(): Promise<boolean> {
    if (!this.narrationHandle || !this.state.narrationEnabled) {
      return false;
    }

    const handle = this.narrationHandle;
    const transportGeneration = ++this.narrationTransportGeneration;
    this.narrationDesiredPlaying = true;
    try {
      await handle.play();
      if (
        this.narrationHandle !== handle ||
        this.narrationTransportGeneration !== transportGeneration ||
        !this.narrationDesiredPlaying
      ) {
        return false;
      }
      this.update({ narrationPlaying: true, autoplayBlocked: false });
      await this.applyVolumes(NARRATION_STOP_FADE_MS);
      return true;
    } catch {
      if (
        this.narrationHandle !== handle ||
        this.narrationTransportGeneration !== transportGeneration ||
        !this.narrationDesiredPlaying
      ) {
        return false;
      }
      this.update({ autoplayBlocked: true, narrationPlaying: false });
      this.applyVolumes();
      return false;
    }
  }

  seekNarration(seconds: number): boolean {
    if (!this.narrationHandle) {
      return false;
    }

    const didSeek = this.narrationHandle.seek(seconds);
    if (didSeek) {
      const snapshot = this.narrationHandle.getPlaybackSnapshot();
      this.update({
        narrationCurrentTimeSeconds: snapshot.currentTimeSeconds,
        narrationDurationSeconds: snapshot.durationSeconds,
        narrationCanSeek: snapshot.canSeek,
      });
    }
    return didSeek;
  }

  async setNarrationEnabled(enabled: boolean): Promise<boolean> {
    this.update({ narrationEnabled: enabled });
    if (!enabled) {
      this.stopNarration();
      return true;
    }
    return true;
  }

  setMasterMuted(muted: boolean): void {
    this.update({ masterMuted: muted });
    this.applyVolumes();
  }

  stop(): void {
    this.stopAmbient();
    this.stopNarration();
    this.update({
      ambientTrackId: null,
      narrationTrackId: null,
      narrationPlaying: false,
      narrationCurrentTimeSeconds: 0,
      narrationDurationSeconds: 0,
      narrationCanSeek: false,
      autoplayBlocked: false,
    });
  }

  private stopAmbient(): void {
    this.ambientTransitionId += 1;
    this.pendingAmbientTransition = null;
    this.ambientTransitionPromise = null;
    for (const handle of this.ambientHandles) {
      handle.stop();
    }
    this.ambientHandles.clear();
    this.ambientHandle = null;
    this.committedAmbientTrackId = null;
    this.committedAmbientPlaying = false;
    this.update({ ambientPlaying: false });
  }

  private cancelPendingAmbientTransition(): void {
    if (this.pendingAmbientTransition) {
      this.stopHandle(this.pendingAmbientTransition.handle);
      this.pendingAmbientTransition = null;
      this.ambientTransitionPromise = null;
    }
  }

  private stopHandle(handle: AudioTrackHandle | null): void {
    if (!handle) {
      return;
    }
    handle.stop();
    this.ambientHandles.delete(handle);
  }

  private async completeAmbientTransition(
    transitionId: number,
    trackId: string,
    nextHandle: AudioTrackHandle,
    previousHandle: AudioTrackHandle,
    previousTrackId: string | null,
    wasPlaying: boolean,
    transitionKind: AmbientTransitionKind,
  ): Promise<void> {
    try {
      await nextHandle.play();
      if (!this.isCurrentAmbientTransition(transitionId, nextHandle)) {
        return;
      }
      const durationMs = this.getAmbientCrossfadeDuration(transitionKind);
      await Promise.all([
        previousHandle.fadeTo(0, durationMs),
        nextHandle.fadeTo(this.getEffectiveAmbientVolume(), durationMs),
      ]);
      if (!this.isCurrentAmbientTransition(transitionId, nextHandle)) {
        return;
      }
      this.stopHandle(previousHandle);
      this.ambientHandle = nextHandle;
      this.committedAmbientTrackId = trackId;
      this.committedAmbientPlaying = true;
      this.pendingAmbientTransition = null;
      this.ambientTransitionPromise = null;
      this.update({ ambientTrackId: trackId, ambientPlaying: true, autoplayBlocked: false });
      this.applyVolumes();
    } catch {
      if (!this.isCurrentAmbientTransition(transitionId, nextHandle)) {
        return;
      }
      this.stopHandle(nextHandle);
      this.ambientHandle = previousHandle;
      this.committedAmbientTrackId = previousTrackId;
      this.committedAmbientPlaying = wasPlaying;
      this.pendingAmbientTransition = null;
      this.ambientTransitionPromise = null;
      this.update({ ambientTrackId: previousTrackId, ambientPlaying: wasPlaying });
      this.applyVolumes();
    }
  }

  private isCurrentAmbientTransition(transitionId: number, handle: AudioTrackHandle): boolean {
    return (
      transitionId === this.ambientTransitionId && this.pendingAmbientTransition?.handle === handle
    );
  }

  stopNarration(): void {
    this.narrationTransportGeneration += 1;
    this.narrationDesiredPlaying = false;
    this.narrationOwnershipId = null;
    this.narrationEndedCleanup?.();
    this.narrationEndedCleanup = null;
    this.narrationErrorCleanup?.();
    this.narrationErrorCleanup = null;
    this.narrationProgressCleanup?.();
    this.narrationProgressCleanup = null;
    this.narrationHandle?.stop();
    this.narrationHandle = null;
    if (this.state.narrationPlaying || this.state.narrationTrackId !== null) {
      this.update({
        narrationPlaying: false,
        narrationTrackId: null,
        narrationCurrentTimeSeconds: 0,
        narrationDurationSeconds: 0,
        narrationCanSeek: false,
      });
    }
    void this.applyVolumes(NARRATION_STOP_FADE_MS);
  }

  private finishNarration(
    handle: AudioTrackHandle | null,
    type: NarrationLifecycleEvent['type'],
  ): void {
    if (!handle || handle !== this.narrationHandle) {
      return;
    }
    const trackId = this.state.narrationTrackId;
    const ownershipId = this.narrationOwnershipId;
    this.narrationEndedCleanup?.();
    this.narrationEndedCleanup = null;
    this.narrationErrorCleanup?.();
    this.narrationErrorCleanup = null;
    this.narrationProgressCleanup?.();
    this.narrationProgressCleanup = null;
    this.narrationHandle = null;
    this.narrationOwnershipId = null;
    this.update({
      narrationPlaying: false,
      narrationTrackId: null,
      narrationCurrentTimeSeconds: 0,
      narrationDurationSeconds: 0,
      narrationCanSeek: false,
    });
    if (trackId && ownershipId !== null) {
      const event = { type, trackId, ownershipId } satisfies NarrationLifecycleEvent;
      for (const listener of this.narrationLifecycleListeners) {
        listener(event);
      }
    }
    void this.applyVolumes(NARRATION_STOP_FADE_MS);
  }

  private applyVolumes(ambientFadeDurationMs = 0): Promise<void> {
    const ambientVolume = this.getEffectiveAmbientVolume();
    const narrationVolume =
      this.state.masterMuted || !this.state.narrationEnabled ? 0 : DEFAULT_NARRATION_VOLUME;
    this.update({ ambientVolume, narrationVolume });
    this.narrationHandle?.setVolume(narrationVolume);

    const committedAmbientHandle = this.ambientHandle;
    const pendingAmbientHandle = this.pendingAmbientTransition?.handle;
    if (committedAmbientHandle && ambientFadeDurationMs > 0) {
      pendingAmbientHandle?.setVolume(ambientVolume);
      return committedAmbientHandle
        .fadeTo(ambientVolume, ambientFadeDurationMs)
        .catch(() => committedAmbientHandle.setVolume(ambientVolume));
    }

    const ambientHandles = new Set<AudioTrackHandle>();
    if (committedAmbientHandle) {
      ambientHandles.add(committedAmbientHandle);
    }
    if (pendingAmbientHandle) {
      ambientHandles.add(pendingAmbientHandle);
    }
    for (const handle of ambientHandles) {
      handle.setVolume(ambientVolume);
    }
    return Promise.resolve();
  }

  private getEffectiveAmbientVolume(): number {
    if (this.state.masterMuted || !this.state.ambientEnabled) {
      return 0;
    }
    return this.state.narrationPlaying ? DUCKED_AMBIENT_VOLUME : DEFAULT_AMBIENT_VOLUME;
  }

  private getAmbientCrossfadeDuration(transitionKind: AmbientTransitionKind): number {
    return transitionKind === 'destination'
      ? AMBIENT_DESTINATION_CROSSFADE_MS
      : AMBIENT_SCENE_CROSSFADE_MS;
  }

  private update(patch: Partial<ImmersiveAudioState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
