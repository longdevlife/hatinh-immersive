import type { ImmersiveAudioTrack, ImmersiveLocale, PanoramaNode } from '../../../shared/contracts';
import type { AutoTourControllerState } from './auto-tour.controller';
import { resolveSceneAudio, type ResolvedSceneAudio } from '../../immersive-audio';

export type AudioTourMode = 'free-explore' | 'auto-tour';

export interface ImmersivePlaybackContext {
  sessionId: number;
  destinationSlug: string;
  sceneId: string;
  requestId: number;
}

export interface AudioTourSceneRequest {
  destinationSlug: string;
  destinationAmbientTrackId: string | null;
  scene: PanoramaNode;
  locale: ImmersiveLocale;
  mode: AudioTourMode;
}

export interface AudioTourAudioController {
  setAmbientTrack(
    track: ImmersiveAudioTrack | null,
    transitionKind?: 'scene' | 'destination',
  ): Promise<void>;
  startAmbient(): Promise<boolean>;
  playNarration(track: ImmersiveAudioTrack | null): Promise<boolean>;
  stopNarration(): void;
  stop(): void;
}

export interface AudioTourAutoController {
  getState(): AutoTourControllerState;
  onNarrationUnavailable(sceneId: string, fallbackDurationMs: number): boolean;
  onNarrationEnded(sceneId: string): boolean;
  stop(): void;
}

interface ActiveAudioTourScene {
  context: ImmersivePlaybackContext;
  request: AudioTourSceneRequest;
  resolved: ResolvedSceneAudio;
}

export interface AudioTourCoordinatorOptions {
  audioController: AudioTourAudioController;
  autoTourController: AudioTourAutoController;
  tracks: readonly ImmersiveAudioTrack[];
  resolveSceneAudioFn?: typeof resolveSceneAudio;
}

export class AudioTourCoordinator {
  private readonly audioController: AudioTourAudioController;

  private readonly autoTourController: AudioTourAutoController;

  private readonly tracks: readonly ImmersiveAudioTrack[];

  private readonly resolveSceneAudioFn: typeof resolveSceneAudio;

  private sessionId = 0;

  private requestId = 0;

  private activeScene: ActiveAudioTourScene | null = null;

  constructor({
    audioController,
    autoTourController,
    tracks,
    resolveSceneAudioFn = resolveSceneAudio,
  }: AudioTourCoordinatorOptions) {
    this.audioController = audioController;
    this.autoTourController = autoTourController;
    this.tracks = tracks;
    this.resolveSceneAudioFn = resolveSceneAudioFn;
  }

  getCurrentContext(): ImmersivePlaybackContext | null {
    return this.activeScene ? { ...this.activeScene.context } : null;
  }

  async commitScene(request: AudioTourSceneRequest): Promise<ImmersivePlaybackContext | null> {
    const destinationChanged = this.ensureDestination(request.destinationSlug);
    if (!destinationChanged) {
      this.audioController.stopNarration();
    }

    const context: ImmersivePlaybackContext = {
      sessionId: this.sessionId,
      destinationSlug: request.destinationSlug,
      sceneId: request.scene.id,
      requestId: ++this.requestId,
    };
    const resolved = this.resolveSceneAudioFn({
      tracks: this.tracks,
      destinationAmbientTrackId: request.destinationAmbientTrackId,
      scene: request.scene,
      locale: request.locale,
    });
    this.activeScene = { context, request, resolved };

    await this.audioController.setAmbientTrack(
      resolved.ambientTrack,
      destinationChanged ? 'destination' : 'scene',
    );
    if (!this.isCurrentContext(context)) {
      return null;
    }

    await this.audioController.startAmbient();
    return this.isCurrentContext(context) ? { ...context } : null;
  }

  async requestAutoTourNarration(sceneId: string): Promise<boolean> {
    const activeScene = this.activeScene;
    if (
      !activeScene ||
      activeScene.context.sceneId !== sceneId ||
      !this.autoTourController.getState().isActive
    ) {
      return false;
    }

    const context: ImmersivePlaybackContext = {
      ...activeScene.context,
      requestId: ++this.requestId,
    };
    this.activeScene = { ...activeScene, context };
    const narrationTrack = activeScene.resolved.narrationTrack;
    if (!narrationTrack) {
      this.notifyNarrationUnavailable(context);
      return false;
    }

    try {
      const didPlay = await this.audioController.playNarration(narrationTrack);
      if (!this.isCurrentContext(context)) {
        return false;
      }
      if (!didPlay) {
        this.notifyNarrationUnavailable(context);
      }
      return didPlay;
    } catch {
      if (this.isCurrentContext(context)) {
        this.notifyNarrationUnavailable(context);
      }
      return false;
    }
  }

  notifyNarrationCompleted(context: ImmersivePlaybackContext): boolean {
    if (!this.isCurrentContext(context) || !this.autoTourController.getState().isActive) {
      return false;
    }

    return this.autoTourController.onNarrationEnded(context.sceneId);
  }

  destroy(): void {
    this.sessionId += 1;
    this.requestId += 1;
    this.activeScene = null;
    this.autoTourController.stop();
    this.audioController.stop();
  }

  private ensureDestination(destinationSlug: string): boolean {
    if (this.activeScene?.request.destinationSlug === destinationSlug) {
      return false;
    }

    this.sessionId += 1;
    this.requestId += 1;
    this.activeScene = null;
    this.autoTourController.stop();
    this.audioController.stop();
    return true;
  }

  private notifyNarrationUnavailable(context: ImmersivePlaybackContext): void {
    if (!this.isCurrentContext(context) || !this.activeScene) {
      return;
    }

    this.autoTourController.onNarrationUnavailable(
      context.sceneId,
      this.activeScene.resolved.fallbackDurationMs,
    );
  }

  private isCurrentContext(context: ImmersivePlaybackContext): boolean {
    const current = this.activeScene?.context;
    return Boolean(
      current &&
      current.sessionId === context.sessionId &&
      current.destinationSlug === context.destinationSlug &&
      current.sceneId === context.sceneId &&
      current.requestId === context.requestId,
    );
  }
}
