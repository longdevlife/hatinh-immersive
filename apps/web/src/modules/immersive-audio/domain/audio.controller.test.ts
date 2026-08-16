import { describe, expect, it } from 'vitest';

import {
  ImmersiveAudioController,
  type AudioAdapter,
  type AudioTrackHandle,
} from './audio.controller';
import type { ImmersiveAudioTrack } from '../../../shared/contracts';

class FakeTrack implements AudioTrackHandle {
  volume = 0;
  playCount = 0;
  pauseCount = 0;
  stopCount = 0;
  currentTime = 0;
  duration = 20;
  rejectPlay = false;
  private endedListeners = new Set<() => void>();
  private progressListeners = new Set<
    (snapshot: { currentTimeSeconds: number; durationSeconds: number; canSeek: boolean }) => void
  >();

  async play(): Promise<void> {
    this.playCount += 1;
    if (this.rejectPlay) {
      throw new Error('AUTOPLAY_BLOCKED');
    }
  }

  pause(): void {
    this.pauseCount += 1;
  }

  stop(): void {
    this.stopCount += 1;
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  fadeTo(volume: number): Promise<void> {
    this.volume = volume;
    return Promise.resolve();
  }

  seek(seconds: number): boolean {
    this.currentTime = Math.max(0, Math.min(this.duration, seconds));
    return true;
  }

  getPlaybackSnapshot() {
    return {
      currentTimeSeconds: this.currentTime,
      durationSeconds: this.duration,
      canSeek: true,
    };
  }

  onProgress(
    listener: (snapshot: {
      currentTimeSeconds: number;
      durationSeconds: number;
      canSeek: boolean;
    }) => void,
  ): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  finish(): void {
    for (const listener of this.endedListeners) {
      listener();
    }
  }
}

function track(id: string, type: ImmersiveAudioTrack['type']): ImmersiveAudioTrack {
  return { id, type, label: id, src: `/demo/audio/${id}.ogg`, rights: 'demo-only' };
}

function adapterWithTracks() {
  const created = new Map<string, FakeTrack>();
  const adapter: AudioAdapter = {
    create(trackDefinition) {
      const handle = new FakeTrack();
      created.set(trackDefinition.id, handle);
      return handle;
    },
  };
  return { adapter, created };
}

describe('ImmersiveAudioController', () => {
  it('starts one ambient track and does not recreate it when the scene changes', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-thien-cam', 'ambient');

    controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    controller.setAmbientTrack(ambient);
    await controller.startAmbient();

    expect(created.get(ambient.id)?.playCount).toBe(1);
    expect(controller.getState().ambientTrackId).toBe(ambient.id);
  });

  it('ducks ambient while narration plays and restores it when narration ends', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-son-trang', 'ambient');
    const narration = track('narration-son-trang', 'narration');

    controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.playNarration(narration);

    expect(created.get(ambient.id)?.volume).toBeLessThan(0.18);
    expect(controller.getState().narrationPlaying).toBe(true);

    created.get(narration.id)?.finish();

    expect(created.get(ambient.id)?.volume).toBeCloseTo(0.18);
    expect(controller.getState().narrationPlaying).toBe(false);
  });

  it('pauses narration without disabling the preference and resumes the same handle', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const narration = track('narration-pause', 'narration');

    await controller.playNarration(narration);
    controller.pauseNarration();

    expect(controller.getState().narrationEnabled).toBe(true);
    expect(controller.getState().narrationPlaying).toBe(false);

    const resumeNarration = (
      controller as unknown as { resumeNarration(): Promise<boolean> }
    ).resumeNarration.bind(controller);
    await expect(resumeNarration()).resolves.toBe(true);

    expect(controller.getState().narrationEnabled).toBe(true);
    expect(controller.getState().narrationPlaying).toBe(true);
    expect(created.get(narration.id)?.playCount).toBe(2);
  });

  it('master mute silences both channels and restores their effective volumes', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-dong-loc', 'ambient');
    const narration = track('narration-dong-loc', 'narration');

    controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.playNarration(narration);
    controller.setMasterMuted(true);

    expect(created.get(ambient.id)?.volume).toBe(0);
    expect(created.get(narration.id)?.volume).toBe(0);

    controller.setMasterMuted(false);

    expect(created.get(ambient.id)?.volume).toBeLessThan(0.18);
    expect(created.get(narration.id)?.volume).toBe(1);
  });

  it('turns autoplay rejection into recoverable state without throwing', async () => {
    const created = new FakeTrack();
    created.rejectPlay = true;
    const adapter: AudioAdapter = { create: () => created };
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-blocked', 'ambient');

    controller.setAmbientTrack(ambient);
    await expect(controller.startAmbient()).resolves.toBe(false);

    expect(controller.getState().autoplayBlocked).toBe(true);
  });

  it('stops and releases both tracks when immersive mode ends', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-cleanup', 'ambient');
    const narration = track('narration-cleanup', 'narration');

    controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.playNarration(narration);
    controller.stop();

    expect(created.get(ambient.id)?.stopCount).toBe(1);
    expect(created.get(narration.id)?.stopCount).toBe(1);
    expect(controller.getState().ambientTrackId).toBeNull();
    expect(controller.getState().narrationPlaying).toBe(false);
  });
});
