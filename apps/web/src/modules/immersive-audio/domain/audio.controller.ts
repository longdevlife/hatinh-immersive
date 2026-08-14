import type { ImmersiveAudioTrack } from '../../../shared/contracts';

export interface AudioTrackHandle {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
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
  autoplayBlocked: boolean;
}

export const DEFAULT_AMBIENT_VOLUME = 0.18;
export const DEFAULT_NARRATION_VOLUME = 1;
export const DUCKED_AMBIENT_VOLUME = 0.045;

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
  autoplayBlocked: false,
};

export class ImmersiveAudioController {
  private state: ImmersiveAudioState = { ...INITIAL_AUDIO_STATE };

  private ambientHandle: AudioTrackHandle | null = null;

  private narrationHandle: AudioTrackHandle | null = null;

  private narrationEndedCleanup: (() => void) | null = null;

  private listeners = new Set<(state: ImmersiveAudioState) => void>();

  constructor(private readonly adapter: AudioAdapter) {}

  getState(): ImmersiveAudioState {
    return { ...this.state };
  }

  subscribe(listener: (state: ImmersiveAudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setAmbientTrack(track: ImmersiveAudioTrack | null): void {
    if (track?.id === this.state.ambientTrackId && this.ambientHandle) {
      return;
    }

    this.stopAmbient();
    if (!track || track.type !== 'ambient') {
      this.update({ ambientTrackId: null, ambientPlaying: false });
      return;
    }

    this.ambientHandle = this.adapter.create(track);
    this.update({ ambientTrackId: track.id, ambientPlaying: false, autoplayBlocked: false });
    this.applyVolumes();
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

    this.narrationEndedCleanup = this.narrationHandle.onEnded(() => {
      this.finishNarration(this.narrationHandle);
    });
    this.update({ narrationTrackId: track.id, narrationPlaying: true });
    this.applyVolumes();

    try {
      await this.narrationHandle.play();
      this.update({ autoplayBlocked: false });
      return true;
    } catch {
      this.stopNarration();
      this.update({ autoplayBlocked: true });
      return false;
    }
  }

  pauseNarration(): void {
    this.narrationHandle?.pause();
    this.update({ narrationPlaying: false });
    this.applyVolumes();
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
    this.narrationHandle?.stop();
    this.narrationHandle = null;
    if (this.state.narrationPlaying || this.state.narrationTrackId !== null) {
      this.update({ narrationPlaying: false, narrationTrackId: null });
    }
    this.applyVolumes();
  }

  private finishNarration(handle: AudioTrackHandle | null): void {
    if (!handle || handle !== this.narrationHandle) {
      return;
    }
    this.narrationEndedCleanup?.();
    this.narrationEndedCleanup = null;
    this.narrationHandle = null;
    this.update({ narrationPlaying: false, narrationTrackId: null });
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const ambientVolume =
      this.state.masterMuted || !this.state.ambientEnabled
        ? 0
        : this.state.narrationPlaying
          ? DUCKED_AMBIENT_VOLUME
          : DEFAULT_AMBIENT_VOLUME;
    const narrationVolume =
      this.state.masterMuted || !this.state.narrationEnabled ? 0 : DEFAULT_NARRATION_VOLUME;
    this.update({ ambientVolume, narrationVolume });
    this.ambientHandle?.setVolume(ambientVolume);
    this.narrationHandle?.setVolume(narrationVolume);
  }

  private update(patch: Partial<ImmersiveAudioState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
