import { describe, expect, it } from 'vitest';

import {
  DUCKED_AMBIENT_VOLUME,
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
  fadeCalls: Array<{ fromVolume: number; volume: number; durationMs: number }> = [];
  playGate: Promise<void> | null = null;
  fadeGate: Promise<void> | null = null;
  rejectPlay = false;
  private endedListeners = new Set<() => void>();
  private errorListeners = new Set<() => void>();
  private progressListeners = new Set<
    (snapshot: { currentTimeSeconds: number; durationSeconds: number; canSeek: boolean }) => void
  >();

  async play(): Promise<void> {
    this.playCount += 1;
    if (this.playGate) {
      await this.playGate;
    }
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

  fadeTo(volume: number, durationMs: number): Promise<void> {
    this.fadeCalls.push({ fromVolume: this.volume, volume, durationMs });
    this.volume = volume;
    if (this.fadeGate) {
      return this.fadeGate;
    }
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

  onError(listener: () => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  finish(): void {
    for (const listener of this.endedListeners) {
      listener();
    }
  }

  fail(): void {
    for (const listener of this.errorListeners) {
      listener();
    }
  }
}

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

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ImmersiveAudioController', () => {
  it('distinguishes natural narration completion from narration errors', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const narration = track('narration-lifecycle', 'narration');
    const events: string[] = [];

    controller.subscribeNarrationLifecycle((event) => {
      events.push(`${event.trackId}:${event.type}`);
    });

    await controller.playNarration(narration);
    created.get(narration.id)?.finish();
    await controller.playNarration(narration);
    created.get(narration.id)?.fail();

    expect(events).toEqual([`${narration.id}:ended`, `${narration.id}:error`]);
  });

  it('starts one ambient track and does not recreate it when the scene changes', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-thien-cam', 'ambient');

    await controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.setAmbientTrack(ambient);
    await controller.startAmbient();

    expect(created.get(ambient.id)?.playCount).toBe(1);
    expect(controller.getState().ambientTrackId).toBe(ambient.id);
  });

  it('ducks ambient while narration plays and restores it when narration ends', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-son-trang', 'ambient');
    const narration = track('narration-son-trang', 'narration');

    await controller.setAmbientTrack(ambient);
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

  it('ignores a stale play rejection after a newer narration owns the controller', async () => {
    const first = track('narration-stale-play-a', 'narration');
    const second = track('narration-stale-play-b', 'narration');
    const handles = new Map<string, FakeTrack>([
      [first.id, new FakeTrack()],
      [second.id, new FakeTrack()],
    ]);
    let rejectFirst!: (reason?: unknown) => void;
    handles.get(first.id)!.playGate = new Promise<void>((_, reject) => {
      rejectFirst = reject;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    const firstPlay = controller.playNarration(first);
    await flushMicrotasks();
    await expect(controller.playNarration(second)).resolves.toBe(true);

    rejectFirst(new Error('STALE_AUTOPLAY_BLOCKED'));
    await expect(firstPlay).resolves.toBe(false);

    expect(controller.getState()).toMatchObject({
      narrationTrackId: second.id,
      narrationPlaying: true,
      autoplayBlocked: false,
    });
  });

  it('ignores a stale resume rejection after a newer narration owns the controller', async () => {
    const first = track('narration-stale-resume-a', 'narration');
    const second = track('narration-stale-resume-b', 'narration');
    const handles = new Map<string, FakeTrack>([
      [first.id, new FakeTrack()],
      [second.id, new FakeTrack()],
    ]);
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.playNarration(first);
    controller.pauseNarration();

    let rejectFirst!: (reason?: unknown) => void;
    handles.get(first.id)!.playGate = new Promise<void>((_, reject) => {
      rejectFirst = reject;
    });
    const firstResume = controller.resumeNarration();
    await flushMicrotasks();
    await expect(controller.playNarration(second)).resolves.toBe(true);

    rejectFirst(new Error('STALE_RESUME_BLOCKED'));
    await expect(firstResume).resolves.toBe(false);

    expect(controller.getState()).toMatchObject({
      narrationTrackId: second.id,
      narrationPlaying: true,
      autoplayBlocked: false,
    });
  });

  it('does not resurrect narration when pause invalidates a pending play resolution', async () => {
    const narration = track('narration-pause-pending-resolve', 'narration');
    const handle = new FakeTrack();
    const firstPlay = new Deferred<void>();
    const secondPlay = new Deferred<void>();
    handle.playGate = firstPlay.promise;
    const adapter: AudioAdapter = { create: () => handle };
    const controller = new ImmersiveAudioController(adapter);

    const pendingPlay = controller.playNarration(narration);
    await flushMicrotasks();
    controller.pauseNarration();
    firstPlay.resolve();

    await expect(pendingPlay).resolves.toBe(false);
    expect(controller.getState()).toMatchObject({
      narrationTrackId: narration.id,
      narrationPlaying: false,
      autoplayBlocked: false,
    });

    handle.playGate = secondPlay.promise;
    const resumedPlay = controller.resumeNarration();
    await flushMicrotasks();
    secondPlay.resolve();

    await expect(resumedPlay).resolves.toBe(true);
    expect(controller.getState()).toMatchObject({
      narrationTrackId: narration.id,
      narrationPlaying: true,
      autoplayBlocked: false,
    });
  });

  it('does not mark autoplay blocked when a paused play rejects late', async () => {
    const narration = track('narration-pause-pending-reject', 'narration');
    const handle = new FakeTrack();
    const firstPlay = new Deferred<void>();
    handle.playGate = firstPlay.promise;
    const controller = new ImmersiveAudioController({ create: () => handle });

    const pendingPlay = controller.playNarration(narration);
    await flushMicrotasks();
    controller.pauseNarration();
    firstPlay.reject(new Error('PAUSED_TRANSPORT_ABORT'));

    await expect(pendingPlay).resolves.toBe(false);
    expect(controller.getState()).toMatchObject({
      narrationTrackId: narration.id,
      narrationPlaying: false,
      autoplayBlocked: false,
    });
  });

  it('keeps a paused stale play resumable without treating it as unavailable', async () => {
    const narration = track('narration-pause-resumable', 'narration');
    const handle = new FakeTrack();
    const pendingPlay = new Deferred<void>();
    handle.playGate = pendingPlay.promise;
    const controller = new ImmersiveAudioController({ create: () => handle });

    const playRequest = controller.playNarration(narration);
    await flushMicrotasks();
    const ownershipId = controller.getNarrationOwnershipId();
    expect(ownershipId).not.toBeNull();
    controller.pauseNarration();
    pendingPlay.resolve();

    await expect(playRequest).resolves.toBe(false);
    expect(controller.isNarrationPlaybackResumable(ownershipId!)).toBe(true);
  });

  it('does not mark an actual narration play failure as resumable', async () => {
    const narration = track('narration-play-failure', 'narration');
    const handle = new FakeTrack();
    handle.rejectPlay = true;
    const controller = new ImmersiveAudioController({ create: () => handle });

    await expect(controller.playNarration(narration)).resolves.toBe(false);
    expect(controller.isNarrationPlaybackResumable(1)).toBe(false);
  });

  it('keeps the resumed ownership when the initial play settles after resume', async () => {
    const narration = track('narration-resume-before-initial-settles', 'narration');
    const handle = new FakeTrack();
    const initialPlay = new Deferred<void>();
    const resumedPlay = new Deferred<void>();
    handle.playGate = initialPlay.promise;
    const controller = new ImmersiveAudioController({ create: () => handle });

    const initialRequest = controller.playNarration(narration);
    await flushMicrotasks();
    const ownershipId = controller.getNarrationOwnershipId();
    expect(ownershipId).not.toBeNull();

    controller.pauseNarration();
    handle.playGate = resumedPlay.promise;
    const resumeRequest = controller.resumeNarration();
    await flushMicrotasks();

    initialPlay.resolve();
    await expect(initialRequest).resolves.toBe(false);
    expect(controller.isNarrationPlaybackResumable(ownershipId!)).toBe(true);

    resumedPlay.resolve();
    await expect(resumeRequest).resolves.toBe(true);
    expect(controller.getState().narrationPlaying).toBe(true);
  });

  it('emits an owned error lifecycle when the current resume fails', async () => {
    const narration = track('narration-current-resume-failure', 'narration');
    const handle = new FakeTrack();
    const controller = new ImmersiveAudioController({ create: () => handle });
    const events: Array<{ type: string; trackId: string; ownershipId: number }> = [];
    controller.subscribeNarrationLifecycle((event) => events.push(event));

    await controller.playNarration(narration);
    const ownershipId = controller.getNarrationOwnershipId();
    expect(ownershipId).not.toBeNull();
    controller.pauseNarration();
    handle.rejectPlay = true;

    await expect(controller.resumeNarration()).resolves.toBe(false);

    expect(events).toEqual([{ type: 'error', trackId: narration.id, ownershipId: ownershipId! }]);
    expect(controller.getNarrationOwnershipId()).toBeNull();
  });

  it('master mute silences both channels and restores their effective volumes', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-dong-loc', 'ambient');
    const narration = track('narration-dong-loc', 'narration');

    await controller.setAmbientTrack(ambient);
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

    await controller.setAmbientTrack(ambient);
    await expect(controller.startAmbient()).resolves.toBe(false);

    expect(controller.getState().autoplayBlocked).toBe(true);
  });

  it('stops and releases both tracks when immersive mode ends', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-cleanup', 'ambient');
    const narration = track('narration-cleanup', 'narration');

    await controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.playNarration(narration);
    controller.stop();

    expect(created.get(ambient.id)?.stopCount).toBe(1);
    expect(created.get(narration.id)?.stopCount).toBe(1);
    expect(controller.getState().ambientTrackId).toBeNull();
    expect(controller.getState().narrationPlaying).toBe(false);
  });

  it('crossfades to a new ambient track while keeping the new track playing', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const main = track('ambient-main', 'ambient');
    const override = track('ambient-override', 'ambient');

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    await controller.setAmbientTrack(override);

    expect(created.get(main.id)?.fadeCalls).toContainEqual({
      fromVolume: 0.18,
      volume: 0,
      durationMs: 750,
    });
    expect(created.get(override.id)?.playCount).toBe(1);
    expect(created.get(override.id)?.fadeCalls).toContainEqual({
      fromVolume: 0,
      volume: 0.18,
      durationMs: 750,
    });
    expect(created.get(main.id)?.stopCount).toBe(1);
    expect(controller.getState().ambientTrackId).toBe(override.id);
    expect(controller.getState().ambientPlaying).toBe(true);
  });

  it('uses the longer crossfade when the destination ambient changes', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const firstDestination = track('ambient-destination-a', 'ambient');
    const nextDestination = track('ambient-destination-b', 'ambient');

    await controller.setAmbientTrack(firstDestination);
    await controller.startAmbient();
    await controller.setAmbientTrack(nextDestination, 'destination');

    expect(created.get(firstDestination.id)?.fadeCalls).toContainEqual({
      fromVolume: 0.18,
      volume: 0,
      durationMs: 1000,
    });
    expect(created.get(nextDestination.id)?.fadeCalls).toContainEqual({
      fromVolume: 0,
      volume: 0.18,
      durationMs: 1000,
    });
  });

  it('silences both committed and pending ambient handles when muted during crossfade', async () => {
    const main = track('ambient-mute-crossfade-main', 'ambient');
    const pending = track('ambient-mute-crossfade-pending', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [pending.id, new FakeTrack()],
    ]);
    let resolveFade!: () => void;
    handles.get(pending.id)!.fadeGate = new Promise<void>((resolve) => {
      resolveFade = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const transition = controller.setAmbientTrack(pending);
    await flushMicrotasks();

    expect(handles.get(pending.id)?.fadeCalls).toHaveLength(1);
    controller.setMasterMuted(true);

    expect(handles.get(main.id)?.volume).toBe(0);
    expect(handles.get(pending.id)?.volume).toBe(0);

    resolveFade();
    await transition;
    expect(handles.get(pending.id)?.volume).toBe(0);
  });

  it('ducks both committed and pending ambient handles when narration starts during crossfade', async () => {
    const main = track('ambient-duck-crossfade-main', 'ambient');
    const pending = track('ambient-duck-crossfade-pending', 'ambient');
    const narration = track('narration-duck-crossfade', 'narration');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [pending.id, new FakeTrack()],
      [narration.id, new FakeTrack()],
    ]);
    let resolveFade!: () => void;
    handles.get(pending.id)!.fadeGate = new Promise<void>((resolve) => {
      resolveFade = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const transition = controller.setAmbientTrack(pending);
    await flushMicrotasks();

    await expect(controller.playNarration(narration)).resolves.toBe(true);

    expect(handles.get(main.id)?.volume).toBe(DUCKED_AMBIENT_VOLUME);
    expect(handles.get(pending.id)?.volume).toBe(DUCKED_AMBIENT_VOLUME);

    resolveFade();
    await transition;
    expect(handles.get(pending.id)?.volume).toBe(DUCKED_AMBIENT_VOLUME);
  });

  it('keeps the current ambient when a replacement track cannot be created', async () => {
    const main = track('ambient-main', 'ambient');
    const missing = track('ambient-missing', 'ambient');
    const created = new Map<string, FakeTrack>();
    const adapter: AudioAdapter = {
      create(trackDefinition) {
        if (trackDefinition.id === missing.id) {
          return null;
        }
        const handle = new FakeTrack();
        created.set(trackDefinition.id, handle);
        return handle;
      },
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    await controller.setAmbientTrack(missing);

    expect(controller.getState().ambientTrackId).toBe(main.id);
    expect(controller.getState().ambientPlaying).toBe(true);
    expect(created.get(main.id)?.stopCount).toBe(0);
  });

  it('keeps the committed ambient when a missing replacement supersedes a pending transition', async () => {
    const main = track('ambient-main-missing-pending', 'ambient');
    const pending = track('ambient-pending-missing', 'ambient');
    const missing = track('ambient-missing-pending', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [pending.id, new FakeTrack()],
    ]);
    let resolvePending!: () => void;
    handles.get(pending.id)!.playGate = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const pendingTransition = controller.setAmbientTrack(pending);
    await Promise.resolve();
    await controller.setAmbientTrack(missing);

    expect(handles.get(pending.id)?.stopCount).toBe(1);
    expect(controller.getState()).toMatchObject({
      ambientTrackId: main.id,
      ambientPlaying: true,
    });

    resolvePending();
    await pendingTransition;
    expect(controller.getState().ambientTrackId).toBe(main.id);
    expect(handles.get(main.id)?.stopCount).toBe(0);
  });

  it('restores the committed ambient identity when ambient is disabled during a transition', async () => {
    const main = track('ambient-main-disable-pending', 'ambient');
    const pending = track('ambient-pending-disable', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [pending.id, new FakeTrack()],
    ]);
    let resolvePending!: () => void;
    handles.get(pending.id)!.playGate = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const pendingTransition = controller.setAmbientTrack(pending);
    await Promise.resolve();
    await controller.setAmbientEnabled(false);

    expect(controller.getState()).toMatchObject({
      ambientTrackId: main.id,
      ambientEnabled: false,
      ambientPlaying: false,
    });

    resolvePending();
    await pendingTransition;
    await controller.setAmbientEnabled(true);
    expect(controller.getState()).toMatchObject({
      ambientTrackId: main.id,
      ambientPlaying: true,
    });
  });

  it('does not double-play a replacement while an ambient transition is pending', async () => {
    const main = track('ambient-main-pending', 'ambient');
    const replacement = track('ambient-replacement-pending', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [replacement.id, new FakeTrack()],
    ]);
    let resolveReplacement!: () => void;
    handles.get(replacement.id)!.playGate = new Promise<void>((resolve) => {
      resolveReplacement = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const transition = controller.setAmbientTrack(replacement);
    await Promise.resolve();
    const startPromise = controller.startAmbient();

    resolveReplacement();
    await transition;
    await startPromise;

    expect(handles.get(replacement.id)?.playCount).toBe(1);
    expect(controller.getState().ambientPlaying).toBe(true);
  });

  it('supersedes a stale ambient transition without leaking the old handles', async () => {
    const main = track('ambient-main-rapid', 'ambient');
    const middle = track('ambient-middle-rapid', 'ambient');
    const latest = track('ambient-latest-rapid', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [middle.id, new FakeTrack()],
      [latest.id, new FakeTrack()],
    ]);
    let resolveMiddle!: () => void;
    handles.get(middle.id)!.playGate = new Promise<void>((resolve) => {
      resolveMiddle = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const middleTransition = controller.setAmbientTrack(middle);
    await Promise.resolve();
    await controller.setAmbientTrack(latest);

    expect(handles.get(middle.id)?.stopCount).toBe(1);
    expect(handles.get(main.id)?.stopCount).toBe(1);
    expect(controller.getState()).toMatchObject({
      ambientTrackId: latest.id,
      ambientPlaying: true,
    });

    resolveMiddle();
    await middleTransition;
    expect(handles.get(middle.id)?.stopCount).toBe(1);
    expect(handles.get(middle.id)?.fadeCalls).toHaveLength(0);
    expect(handles.get(latest.id)?.stopCount).toBe(0);
  });

  it('stops committed and pending ambient handles when immersive mode ends', async () => {
    const main = track('ambient-main-stop-pending', 'ambient');
    const pending = track('ambient-pending-stop', 'ambient');
    const handles = new Map<string, FakeTrack>([
      [main.id, new FakeTrack()],
      [pending.id, new FakeTrack()],
    ]);
    let resolvePending!: () => void;
    handles.get(pending.id)!.playGate = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    const adapter: AudioAdapter = {
      create: (definition) => handles.get(definition.id) ?? null,
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    const transition = controller.setAmbientTrack(pending);
    await Promise.resolve();
    controller.stop();

    expect(handles.get(main.id)?.stopCount).toBe(1);
    expect(handles.get(pending.id)?.stopCount).toBe(1);
    resolvePending();
    await transition;
    expect(controller.getState().ambientTrackId).toBeNull();
  });

  it('fades ambient down and back up around narration playback', async () => {
    const { adapter, created } = adapterWithTracks();
    const controller = new ImmersiveAudioController(adapter);
    const ambient = track('ambient-duck-fade', 'ambient');
    const narration = track('narration-duck-fade', 'narration');

    await controller.setAmbientTrack(ambient);
    await controller.startAmbient();
    await controller.playNarration(narration);

    expect(created.get(ambient.id)?.fadeCalls).toContainEqual({
      fromVolume: 0.18,
      volume: 0.045,
      durationMs: 180,
    });

    created.get(narration.id)?.finish();

    expect(created.get(ambient.id)?.fadeCalls).toContainEqual({
      fromVolume: 0.045,
      volume: 0.18,
      durationMs: 180,
    });
  });

  it('restores the previous ambient when a replacement rejects playback', async () => {
    const main = track('ambient-main-reject', 'ambient');
    const replacement = track('ambient-replacement-reject', 'ambient');
    const created = new Map<string, FakeTrack>();
    const adapter: AudioAdapter = {
      create(trackDefinition) {
        const handle = new FakeTrack();
        if (trackDefinition.id === replacement.id) {
          handle.rejectPlay = true;
        }
        created.set(trackDefinition.id, handle);
        return handle;
      },
    };
    const controller = new ImmersiveAudioController(adapter);

    await controller.setAmbientTrack(main);
    await controller.startAmbient();
    await controller.setAmbientTrack(replacement);

    expect(controller.getState().ambientTrackId).toBe(main.id);
    expect(controller.getState().ambientPlaying).toBe(true);
    expect(created.get(main.id)?.stopCount).toBe(0);
    expect(created.get(replacement.id)?.stopCount).toBe(1);
  });
});
