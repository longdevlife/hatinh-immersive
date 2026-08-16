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
  rejectPlay = false;
  private endedListeners = new Set<() => void>();

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

  it('marks narration disabled when the visitor pauses it and permits an explicit resume', async () => {
    const { adapter } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const narration = track('narration-pause', 'narration');

    await controller.playNarration(narration);
    controller.pauseNarration();

    expect(controller.getState().narrationEnabled).toBe(false);
    expect(controller.getState().narrationPlaying).toBe(false);

    await controller.setNarrationEnabled(true);
    await controller.playNarration(narration);

    expect(controller.getState().narrationEnabled).toBe(true);
    expect(controller.getState().narrationPlaying).toBe(true);
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
