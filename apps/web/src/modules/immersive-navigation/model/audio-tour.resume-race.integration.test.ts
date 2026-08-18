import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveAudioTrack, ImmersiveLocale, PanoramaNode } from '../../../shared/contracts';
import {
  ImmersiveAudioController,
  type AudioAdapter,
  type AudioPlaybackSnapshot,
  type AudioTrackHandle,
} from '../../immersive-audio';
import { AudioTourCoordinator } from './audio-tour.coordinator';
import { AutoTourController, type AutoTourScheduler } from './auto-tour.controller';

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

class FakeHandle implements AudioTrackHandle {
  rejectNextPlay = false;

  private playGates: Array<Deferred<void>> = [];

  private endedListeners = new Set<() => void>();

  private errorListeners = new Set<() => void>();

  queuePlay(gate: Deferred<void>): void {
    this.playGates.push(gate);
  }

  async play(): Promise<void> {
    const gate = this.playGates.shift();
    if (gate) {
      await gate.promise;
    }
    if (this.rejectNextPlay) {
      this.rejectNextPlay = false;
      throw new Error('RESUME_FAILED');
    }
  }

  pause(): void {}

  stop(): void {}

  setVolume(): void {}

  fadeTo(): Promise<void> {
    return Promise.resolve();
  }

  seek(): boolean {
    return true;
  }

  getPlaybackSnapshot(): AudioPlaybackSnapshot {
    return { currentTimeSeconds: 0, durationSeconds: 20, canSeek: true };
  }

  onProgress(): () => void {
    return () => undefined;
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  onError(listener: () => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  finish(): void {
    for (const listener of this.endedListeners) {
      listener();
    }
  }
}

function track(id: string, type: ImmersiveAudioTrack['type'], locale?: ImmersiveLocale) {
  return {
    id,
    type,
    label: id,
    src: `/demo/audio/${id}.ogg`,
    rights: 'demo-only' as const,
    ...(locale ? { locale } : {}),
  } satisfies ImmersiveAudioTrack;
}

function scene(id: string, narrationTrackId = 'narration-a'): PanoramaNode {
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

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createRuntime() {
  const scheduler = new FakeScheduler();
  const narrationHandle = new FakeHandle();
  const ambientHandle = new FakeHandle();
  const adapter: AudioAdapter = {
    create(trackDefinition) {
      return trackDefinition.type === 'narration' ? narrationHandle : ambientHandle;
    },
  };
  const audioController = new ImmersiveAudioController(adapter);
  const onNavigate = vi.fn();
  let coordinator: AudioTourCoordinator;
  const autoTourController = new AutoTourController({
    scheduler,
    settleDelayMs: 0,
    holdDurationMs: 10,
    fallbackDurationMs: 10,
    onNavigate,
    getNextSceneId: (sceneId) => (sceneId === 'scene-a' ? 'scene-b' : null),
    onNarrationRequested: (sceneId) => {
      void coordinator.requestAutoTourNarration(sceneId);
    },
  });
  coordinator = new AudioTourCoordinator({
    audioController,
    autoTourController,
    tracks: [track('ambient-a', 'ambient'), track('narration-a', 'narration', 'vi')],
  });
  audioController.subscribeNarrationLifecycle((event) => {
    const context = coordinator.getCurrentContext();
    if (context) {
      if (event.type === 'ended') {
        coordinator.notifyNarrationCompleted(context, event);
      } else {
        coordinator.notifyNarrationFailed(context, event);
      }
    }
  });

  return {
    audioController,
    autoTourController,
    coordinator,
    narrationHandle,
    scheduler,
    onNavigate,
  };
}

async function commitScene(coordinator: AudioTourCoordinator, sceneId: string): Promise<void> {
  await coordinator.commitScene({
    destinationSlug: 'son-trang-co-dam',
    destinationAmbientTrackId: 'ambient-a',
    scene: scene(sceneId),
    locale: 'vi',
    mode: 'auto-tour',
  });
}

describe('Auto Tour audio resume races', () => {
  it('keeps the resumed narration owner when the initial play settles stale', async () => {
    const {
      audioController,
      autoTourController,
      coordinator,
      narrationHandle,
      scheduler,
      onNavigate,
    } = createRuntime();
    const initialPlay = new Deferred<void>();
    const resumedPlay = new Deferred<void>();

    narrationHandle.queuePlay(initialPlay);
    await commitScene(coordinator, 'scene-a');
    autoTourController.start('scene-a');
    scheduler.flush();
    await flushMicrotasks();
    autoTourController.pause();
    audioController.pauseNarration();
    autoTourController.resume();
    narrationHandle.queuePlay(resumedPlay);
    const resumedRequest = audioController.resumeNarration();
    await flushMicrotasks();

    initialPlay.resolve();
    await flushMicrotasks();

    expect(autoTourController.getState().phase).toBe('narrating');
    expect(onNavigate).not.toHaveBeenCalled();

    resumedPlay.resolve();
    await expect(resumedRequest).resolves.toBe(true);
    narrationHandle.finish();
    expect(autoTourController.getState().phase).toBe('holding');
    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('scene-b');
  });

  it('routes a current resume failure through fallback and progression', async () => {
    const {
      audioController,
      autoTourController,
      coordinator,
      narrationHandle,
      scheduler,
      onNavigate,
    } = createRuntime();

    await commitScene(coordinator, 'scene-a');
    autoTourController.start('scene-a');
    scheduler.flush();
    await flushMicrotasks();
    autoTourController.pause();
    audioController.pauseNarration();
    autoTourController.resume();
    narrationHandle.rejectNextPlay = true;

    await expect(audioController.resumeNarration()).resolves.toBe(false);
    expect(autoTourController.getState().phase).toBe('fallback');
    scheduler.flush();
    expect(onNavigate).toHaveBeenCalledWith('scene-b');
  });

  it('ignores a stale resume failure after navigation changes the owner', async () => {
    const {
      audioController,
      autoTourController,
      coordinator,
      narrationHandle,
      scheduler,
      onNavigate,
    } = createRuntime();
    const staleResume = new Deferred<void>();

    await commitScene(coordinator, 'scene-a');
    autoTourController.start('scene-a');
    scheduler.flush();
    await flushMicrotasks();
    autoTourController.pause();
    audioController.pauseNarration();
    narrationHandle.queuePlay(staleResume);
    const resumeRequest = audioController.resumeNarration();
    await flushMicrotasks();

    coordinator.cancelNarrationForNavigation();
    await commitScene(coordinator, 'scene-b');
    autoTourController.onSceneCommitted('scene-b');
    staleResume.reject(new Error('STALE_RESUME_FAILURE'));

    await expect(resumeRequest).resolves.toBe(false);
    expect(autoTourController.getState()).toMatchObject({
      currentSceneId: 'scene-b',
      phase: 'paused',
    });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
