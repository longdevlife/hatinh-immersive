import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveAudioTrack, ImmersiveLocale, PanoramaNode } from '../../../shared/contracts';
import type { AutoTourControllerState } from './auto-tour.controller';
import {
  AudioTourCoordinator,
  type AudioTourAudioController,
  type AudioTourAutoController,
} from './audio-tour.coordinator';

class Deferred<T> {
  readonly promise: Promise<T>;

  resolve!: (value: T) => void;

  reject!: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class FakeAudioController implements AudioTourAudioController {
  readonly calls: string[] = [];

  playResult = true;

  playGate: Promise<boolean> | null = null;

  async setAmbientTrack(track: ImmersiveAudioTrack | null): Promise<void> {
    this.calls.push(`setAmbient:${track?.id ?? 'none'}`);
  }

  async startAmbient(): Promise<boolean> {
    this.calls.push('startAmbient');
    return true;
  }

  async playNarration(track: ImmersiveAudioTrack | null): Promise<boolean> {
    this.calls.push(`playNarration:${track?.id ?? 'none'}`);
    if (this.playGate) {
      return this.playGate;
    }
    return this.playResult;
  }

  stopNarration(): void {
    this.calls.push('stopNarration');
  }

  stop(): void {
    this.calls.push('stop');
  }
}

class FakeAutoTourController implements AudioTourAutoController {
  state: AutoTourControllerState = {
    isActive: true,
    isRunning: true,
    isPaused: false,
    phase: 'narrating',
    currentSceneId: 'scene-a',
  };

  readonly narrationUnavailable = vi.fn();

  readonly narrationEnded = vi.fn();

  readonly stop = vi.fn();

  getState(): AutoTourControllerState {
    return { ...this.state };
  }

  onNarrationUnavailable(sceneId: string, fallbackDurationMs: number): boolean {
    this.narrationUnavailable(sceneId, fallbackDurationMs);
    return true;
  }

  onNarrationEnded(sceneId: string): boolean {
    this.narrationEnded(sceneId);
    return true;
  }
}

function track(id: string, type: ImmersiveAudioTrack['type'], locale: ImmersiveLocale = 'vi') {
  return {
    id,
    type,
    label: id,
    src: `/demo/audio/${id}.ogg`,
    rights: 'demo-only' as const,
    ...(type === 'narration' ? { locale } : {}),
  } satisfies ImmersiveAudioTrack;
}

function scene(id: string, narrationTrackId: string | null = null): PanoramaNode {
  return {
    id,
    name: id,
    destinationSlug: 'son-trang-co-dam',
    panoramaUrl: `/demo/360/${id}.jpg`,
    previewUrl: `/demo/360/${id}-preview.jpg`,
    mediaQuality: 'ready',
    mediaRights: 'demo-only',
    narrationTrackId,
    lat: 18,
    lng: 105,
    initialView: { heading: 0, pitch: 0, fov: 70 },
  };
}

function createCoordinator() {
  const audioController = new FakeAudioController();
  const autoTourController = new FakeAutoTourController();
  const coordinator = new AudioTourCoordinator({
    audioController,
    autoTourController,
    tracks: [
      track('ambient-son-trang', 'ambient'),
      track('narration-a', 'narration'),
      track('narration-b', 'narration'),
    ],
  });

  return { audioController, autoTourController, coordinator };
}

describe('AudioTourCoordinator', () => {
  it('ignores a late narration play resolution after scene context changes', async () => {
    const { audioController, autoTourController, coordinator } = createCoordinator();
    const deferred = new Deferred<boolean>();
    audioController.playGate = deferred.promise;
    const firstScene = scene('scene-a', 'narration-a');
    const secondScene = scene('scene-b', 'narration-b');

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: firstScene,
      locale: 'vi',
      mode: 'auto-tour',
    });
    const firstRequest = coordinator.requestAutoTourNarration('scene-a');
    const firstContext = coordinator.getCurrentContext();

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: secondScene,
      locale: 'vi',
      mode: 'auto-tour',
    });
    deferred.resolve(true);
    await firstRequest;

    expect(firstContext?.requestId).toBeDefined();
    expect(coordinator.getCurrentContext()?.sceneId).toBe('scene-b');
    expect(autoTourController.narrationUnavailable).not.toHaveBeenCalled();
    expect(autoTourController.narrationEnded).not.toHaveBeenCalled();
    expect(audioController.calls).toContain('stopNarration');
  });

  it('ignores a late narration play rejection after scene context changes', async () => {
    const { audioController, autoTourController, coordinator } = createCoordinator();
    const deferred = new Deferred<boolean>();

    audioController.playGate = deferred.promise;
    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-a', 'narration-a'),
      locale: 'vi',
      mode: 'auto-tour',
    });
    const firstRequest = coordinator.requestAutoTourNarration('scene-a');
    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-b', 'narration-b'),
      locale: 'vi',
      mode: 'auto-tour',
    });

    deferred.reject(new Error('STALE_PLAY_FAILURE'));
    await expect(firstRequest).resolves.toBe(false);
    expect(autoTourController.narrationUnavailable).not.toHaveBeenCalled();
  });

  it('stops narration before a scene jump', async () => {
    const { audioController, coordinator } = createCoordinator();

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-a', 'narration-a'),
      locale: 'vi',
      mode: 'free-explore',
    });
    audioController.calls.length = 0;

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-b', 'narration-b'),
      locale: 'vi',
      mode: 'free-explore',
    });

    expect(audioController.calls.indexOf('stopNarration')).toBeLessThan(
      audioController.calls.indexOf('setAmbient:ambient-son-trang'),
    );
  });

  it('cleans destination audio before applying the next destination', async () => {
    const { audioController, autoTourController, coordinator } = createCoordinator();

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-a'),
      locale: 'vi',
      mode: 'free-explore',
    });
    audioController.calls.length = 0;

    await coordinator.commitScene({
      destinationSlug: 'bien-thien-cam',
      destinationAmbientTrackId: 'ambient-thien-cam',
      scene: { ...scene('scene-b'), destinationSlug: 'bien-thien-cam' },
      locale: 'vi',
      mode: 'free-explore',
    });

    expect(autoTourController.stop).toHaveBeenCalled();
    expect(audioController.calls[0]).toBe('stop');
  });

  it('starts narration automatically only while Auto Tour is active', async () => {
    const { audioController, autoTourController, coordinator } = createCoordinator();
    const currentScene = scene('scene-a', 'narration-a');

    autoTourController.state.isActive = false;
    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: currentScene,
      locale: 'vi',
      mode: 'free-explore',
    });
    await expect(coordinator.requestAutoTourNarration('scene-a')).resolves.toBe(false);
    expect(audioController.calls).not.toContain('playNarration:narration-a');

    autoTourController.state.isActive = true;
    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: currentScene,
      locale: 'vi',
      mode: 'auto-tour',
    });
    await expect(coordinator.requestAutoTourNarration('scene-a')).resolves.toBe(true);
    expect(audioController.calls).toContain('playNarration:narration-a');
  });

  it('forwards narration completion only for the current playback context', async () => {
    const { autoTourController, coordinator } = createCoordinator();

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-a', 'narration-a'),
      locale: 'vi',
      mode: 'auto-tour',
    });
    const staleContext = coordinator.getCurrentContext()!;
    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-b', 'narration-b'),
      locale: 'vi',
      mode: 'auto-tour',
    });
    const currentContext = coordinator.getCurrentContext()!;

    expect(coordinator.notifyNarrationCompleted(staleContext)).toBe(false);
    expect(coordinator.notifyNarrationCompleted(currentContext)).toBe(true);
    expect(autoTourController.narrationEnded).toHaveBeenCalledTimes(1);
    expect(autoTourController.narrationEnded).toHaveBeenCalledWith('scene-b');
  });

  it('uses the Auto Tour fallback when narration playback fails', async () => {
    const { audioController, autoTourController, coordinator } = createCoordinator();
    audioController.playResult = false;

    await coordinator.commitScene({
      destinationSlug: 'son-trang-co-dam',
      destinationAmbientTrackId: 'ambient-son-trang',
      scene: scene('scene-a', 'narration-a'),
      locale: 'vi',
      mode: 'auto-tour',
    });

    await expect(coordinator.requestAutoTourNarration('scene-a')).resolves.toBe(false);
    expect(autoTourController.narrationUnavailable).toHaveBeenCalledWith('scene-a', 8_000);
  });
});
