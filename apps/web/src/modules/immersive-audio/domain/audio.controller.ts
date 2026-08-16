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

  private narrationHandle: AudioTrackHandle | null = null;

  private narrationEndedCleanup: (() => void) | null = null;

  private narrationProgressCleanup: (() => void) | null = null;

  private ambientTransitionId = 0;

  private listeners = new Set<(state: ImmersiveAudioState) => void>();

  constructor(private readonly adapter: AudioAdapter) {}

  getState(): ImmersiveAudioState {
    return { ...this.state };
  }

  subscribe(listener: (state: ImmersiveAudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async setAmbientTrack(
    track: ImmersiveAudioTrack | null,
    transitionKind: AmbientTransitionKind = 'scene',
  ): Promise<void> {
    if (track?.id === this.state.ambientTrackId && this.ambientHandle) {
      return;
    }

    if (!track || track.type !== 'ambient') {
      this.ambientTransitionId += 1;
      this.ambientHandle?.stop();
      this.ambientHandle = null;
      this.update({ ambientTrackId: null, ambientPlaying: false });
      return;
    }

    const nextHandle = this.adapter.create(track);
    if (!nextHandle) {
      return;
    }

    const previousHandle = this.ambientHandle;
    const previousTrackId = this.state.ambientTrackId;
    const wasPlaying = this.state.ambientPlaying;
    const transitionId = ++this.ambientTransitionId;
    this.ambientHandle = nextHandle;
    this.update({ ambientTrackId: track.id, ambientPlaying: false, autoplayBlocked: false });
    this.applyVolumes();

    if (!previousHandle || !wasPlaying) {
      previousHandle?.stop();
      return;
    }

    try {
      await nextHandle.play();
      await Promise.all([
        previousHandle.fadeTo(0, this.getAmbientCrossfadeDuration(transitionKind)),
        nextHandle.fadeTo(
          this.getEffectiveAmbientVolume(),
          this.getAmbientCrossfadeDuration(transitionKind),
        ),
      ]);
      if (transitionId !== this.ambientTransitionId || this.ambientHandle !== nextHandle) {
        return;
      }
      previousHandle.stop();
      this.update({ ambientPlaying: true, autoplayBlocked: false });
      this.applyVolumes();
    } catch {
      if (transitionId !== this.ambientTransitionId || this.ambientHandle !== nextHandle) {
        return;
      }
      nextHandle.stop();
      this.ambientHandle = previousHandle;
      this.update({ ambientTrackId: previousTrackId, ambientPlaying: wasPlaying });
      this.applyVolumes();
    }
  }

  async startAmbient(): Promise<boolean> {
    if (!this.ambientHandle || !this.state.ambientEnabled || this.state.masterMuted) {
      return false;
    }
    if (this.state.ambientPlaying) {
      return true;
    }

    this.applyVolumes();
    try {
      await this.ambientHandle.play();
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
      this.ambientHandle?.pause();
      this.update({ ambientPlaying: false });
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
      this.finishNarration(handle);
    });
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
      if (this.narrationHandle !== handle) {
        return false;
      }
      this.update({ narrationPlaying: true, autoplayBlocked: false });
      this.applyVolumes();
      return true;
    } catch {
      if (this.narrationHandle === handle) {
        this.stopNarration();
      }
      this.update({ autoplayBlocked: true });
      return false;
    }
  }

  pauseNarration(): void {
    this.narrationHandle?.pause();
    this.update({ narrationPlaying: false });
    this.applyVolumes();
  }

  async resumeNarration(): Promise<boolean> {
    if (!this.narrationHandle || !this.state.narrationEnabled) {
      return false;
    }

    const handle = this.narrationHandle;
    try {
      await handle.play();
      if (this.narrationHandle !== handle) {
        return false;
      }
      this.update({ narrationPlaying: true, autoplayBlocked: false });
      this.applyVolumes();
      return true;
    } catch {
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
    this.ambientTransitionId += 1;
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
    this.ambientHandle?.stop();
    this.ambientHandle = null;
    this.update({ ambientPlaying: false });
  }

  private stopNarration(): void {
    this.narrationEndedCleanup?.();
    this.narrationEndedCleanup = null;
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
    this.applyVolumes();
  }

  private finishNarration(handle: AudioTrackHandle | null): void {
    if (!handle || handle !== this.narrationHandle) {
      return;
    }
    this.narrationEndedCleanup?.();
    this.narrationEndedCleanup = null;
    this.narrationProgressCleanup?.();
    this.narrationProgressCleanup = null;
    this.narrationHandle = null;
    this.update({
      narrationPlaying: false,
      narrationTrackId: null,
      narrationCurrentTimeSeconds: 0,
      narrationDurationSeconds: 0,
      narrationCanSeek: false,
    });
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const ambientVolume = this.getEffectiveAmbientVolume();
    const narrationVolume =
      this.state.masterMuted || !this.state.narrationEnabled ? 0 : DEFAULT_NARRATION_VOLUME;
    this.update({ ambientVolume, narrationVolume });
    this.ambientHandle?.setVolume(ambientVolume);
    this.narrationHandle?.setVolume(narrationVolume);
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
