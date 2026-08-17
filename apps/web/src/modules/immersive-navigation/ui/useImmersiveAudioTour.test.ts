import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ImmersiveAudioTrack,
  ImmersiveLocale,
  ImmersiveMode,
  PanoramaNode,
} from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import type { NarrationLifecycleEvent } from '../../immersive-audio';
import { AutoTourController, type AutoTourScheduler } from '../model/auto-tour.controller';
import {
  useImmersiveAudioTour,
  type ImmersiveAudioTourAudioController,
  type ImmersiveAudioTourInput,
} from './useImmersiveAudioTour';

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

class FakeAudioController implements ImmersiveAudioTourAudioController {
  readonly calls: string[] = [];

  private listeners = new Set<(state: ImmersiveAudioState) => void>();

  private narrationLifecycleListeners = new Set<(event: NarrationLifecycleEvent) => void>();

  private narrationOwnershipSequence = 0;

  private narrationOwnershipId: number | null = null;

  state: ImmersiveAudioState = {
    masterMuted: false,
    ambientEnabled: true,
    narrationEnabled: true,
    ambientTrackId: null,
    ambientPlaying: false,
    narrationTrackId: null,
    ambientVolume: 0.18,
    narrationVolume: 1,
    narrationPlaying: false,
    narrationCurrentTimeSeconds: 0,
    narrationDurationSeconds: 0,
    narrationCanSeek: true,
    autoplayBlocked: false,
  };

  getState() {
    return { ...this.state };
  }

  subscribe(listener: (state: ImmersiveAudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeNarrationLifecycle(listener: (event: NarrationLifecycleEvent) => void): () => void {
    this.narrationLifecycleListeners.add(listener);
    return () => this.narrationLifecycleListeners.delete(listener);
  }

  async setAmbientTrack(track: ImmersiveAudioTrack | null): Promise<void> {
    this.calls.push(`setAmbient:${track?.id ?? 'none'}`);
  }

  async startAmbient(): Promise<boolean> {
    this.calls.push('startAmbient');
    return true;
  }

  async playNarration(track: ImmersiveAudioTrack | null): Promise<boolean> {
    this.calls.push(`playNarration:${track?.id ?? 'none'}`);
    this.narrationOwnershipId = track ? ++this.narrationOwnershipSequence : null;
    this.state = { ...this.state, narrationPlaying: true, narrationTrackId: track?.id ?? null };
    this.emit();
    return true;
  }

  getNarrationOwnershipId(): number | null {
    return this.narrationOwnershipId;
  }

  pauseNarration(): void {
    this.calls.push('pauseNarration');
    this.state = { ...this.state, narrationPlaying: false };
    this.emit();
  }

  async resumeNarration(): Promise<boolean> {
    this.calls.push('resumeNarration');
    this.state = { ...this.state, narrationPlaying: true };
    this.emit();
    return true;
  }

  async setNarrationEnabled(enabled: boolean): Promise<boolean> {
    this.state = { ...this.state, narrationEnabled: enabled };
    this.emit();
    return true;
  }

  setMasterMuted(muted: boolean): void {
    this.state = { ...this.state, masterMuted: muted };
    this.emit();
  }

  async setAmbientEnabled(enabled: boolean): Promise<boolean> {
    this.state = { ...this.state, ambientEnabled: enabled };
    this.emit();
    return true;
  }

  seekNarration(): boolean {
    return true;
  }

  stopNarration(): void {
    this.calls.push('stopNarration');
    this.narrationOwnershipId = null;
    this.state = { ...this.state, narrationPlaying: false, narrationTrackId: null };
    this.emit();
  }

  stop(): void {
    this.calls.push('stop');
    this.narrationOwnershipId = null;
    this.state = { ...this.state, ambientTrackId: null, narrationTrackId: null };
    this.emit();
  }

  emitNarrationLifecycle(event: NarrationLifecycleEvent): void {
    for (const listener of this.narrationLifecycleListeners) {
      listener(event);
    }
  }

  primeNarration(trackId: string): void {
    this.narrationOwnershipId = ++this.narrationOwnershipSequence;
    this.state = { ...this.state, narrationPlaying: true, narrationTrackId: trackId };
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
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

function scene(id: string, narrationTrackId: string | null = 'narration-a'): PanoramaNode {
  return {
    id,
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

function createInput(overrides: Partial<ImmersiveAudioTourInput> = {}): ImmersiveAudioTourInput {
  return {
    destinationSlug: 'son-trang-co-dam',
    destinationAmbientTrackId: 'ambient-a',
    audioTracks: [track('ambient-a', 'ambient'), track('narration-a', 'narration', 'vi')],
    locale: 'vi',
    panoramaNodes: [scene('scene-a'), scene('scene-b')],
    panoramaRenderableNodes: [scene('scene-a'), scene('scene-b')],
    panoramaTourLinks: [{ sourceSceneId: 'scene-a', targetSceneId: 'scene-b' }],
    navigationMode: 'panorama' as ImmersiveMode,
    committedSceneId: 'scene-a',
    onNavigateScene: vi.fn(),
    ...overrides,
  };
}

function createHarness(input: ImmersiveAudioTourInput = createInput()) {
  const audioController = new FakeAudioController();
  const scheduler = new FakeScheduler();
  const onNavigateScene = input.onNavigateScene as ReturnType<typeof vi.fn>;
  const factories = {
    createAudioController: () => audioController,
    createAutoTourController: (options: ConstructorParameters<typeof AutoTourController>[0]) =>
      new AutoTourController({ ...options, scheduler, settleDelayMs: 0, holdDurationMs: 0 }),
  };
  const hook = renderHook(({ value }) => useImmersiveAudioTour(value, factories), {
    initialProps: { value: input },
  });

  return { ...hook, audioController, scheduler, onNavigateScene };
}

describe('useImmersiveAudioTour', () => {
  it('does not auto-play narration when a Free Explore scene commits', async () => {
    const { audioController } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));

    expect(audioController.calls).not.toContain('playNarration:narration-a');
  });

  it('requests narration after scene settle during Auto Tour', async () => {
    const { result, audioController, scheduler } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());

    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));
  });

  it('rejects manual or hotspot narration while Auto Tour is settling', async () => {
    const { result, audioController, scheduler } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());

    audioController.calls.length = 0;
    let didPlay = true;
    await act(async () => {
      didPlay = await result.current.playNarration(track('narration-b', 'narration', 'vi'));
    });

    expect(didPlay).toBe(false);
    expect(audioController.calls).not.toContain('playNarration:narration-b');
    expect(result.current.autoTourState.phase).toBe('settling');

    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));
  });

  it('rejects manual or hotspot narration during Auto Tour fallback without changing progression', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness(
      createInput({
        panoramaNodes: [scene('scene-a', null), scene('scene-b', null)],
        panoramaRenderableNodes: [scene('scene-a', null), scene('scene-b', null)],
      }),
    );

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    expect(result.current.autoTourState.phase).toBe('fallback');

    audioController.calls.length = 0;
    let didPlay = true;
    await act(async () => {
      didPlay = await result.current.playNarration(track('narration-b', 'narration', 'vi'));
    });

    expect(didPlay).toBe(false);
    expect(audioController.calls).not.toContain('playNarration:narration-b');
    expect(result.current.autoTourState.phase).toBe('fallback');

    act(() => scheduler.flush());
    expect(onNavigateScene).toHaveBeenCalledWith('scene-b', true);
  });

  it('rejects manual or hotspot narration during Auto Tour holding without replacing the tour lifecycle', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));

    const ownershipId = audioController.getNarrationOwnershipId();
    act(() =>
      audioController.emitNarrationLifecycle({
        type: 'ended',
        trackId: 'narration-a',
        ownershipId: ownershipId!,
      }),
    );
    expect(result.current.autoTourState.phase).toBe('holding');

    audioController.calls.length = 0;
    let didPlay = true;
    await act(async () => {
      didPlay = await result.current.playNarration(track('narration-b', 'narration', 'vi'));
    });

    expect(didPlay).toBe(false);
    expect(audioController.calls).not.toContain('playNarration:narration-b');

    act(() => scheduler.flush());
    expect(onNavigateScene).toHaveBeenCalledWith('scene-b', true);
  });

  it('keeps Auto Tour narration ownership when a manual or hotspot narration is requested', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));

    const autoTourOwnershipId = audioController.getNarrationOwnershipId();
    audioController.calls.length = 0;

    let didPlayManualNarration = true;
    await act(async () => {
      didPlayManualNarration = await result.current.playNarration(
        track('narration-b', 'narration', 'vi'),
      );
    });

    expect(didPlayManualNarration).toBe(false);
    expect(audioController.calls).not.toContain('playNarration:narration-b');
    expect(audioController.getNarrationOwnershipId()).toBe(autoTourOwnershipId);

    act(() =>
      audioController.emitNarrationLifecycle({
        type: 'ended',
        trackId: 'narration-a',
        ownershipId: autoTourOwnershipId!,
      }),
    );
    act(() => scheduler.flush());

    expect(onNavigateScene).toHaveBeenCalledWith('scene-b', true);
  });

  it('allows manual narration in Free Explore when Auto Tour does not own narration', async () => {
    const { result, audioController } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));

    let didPlayManualNarration = false;
    await act(async () => {
      didPlayManualNarration = await result.current.playNarration(
        track('narration-b', 'narration', 'vi'),
      );
    });

    expect(didPlayManualNarration).toBe(true);
    expect(audioController.calls).toContain('playNarration:narration-b');
  });

  it('advances only after the explicit natural narration completion event', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));

    act(() =>
      audioController.emitNarrationLifecycle({
        type: 'ended',
        trackId: 'narration-a',
        ownershipId: audioController.getNarrationOwnershipId()!,
      }),
    );
    act(() => scheduler.flush());

    expect(onNavigateScene).toHaveBeenCalledWith('scene-b', true);
  });

  it('ignores narration lifecycle events for a track Auto Tour does not own', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));

    act(() =>
      audioController.emitNarrationLifecycle({
        type: 'ended',
        trackId: 'unrelated-hotspot-narration',
        ownershipId: audioController.getNarrationOwnershipId()!,
      }),
    );
    act(() => scheduler.flush());

    expect(onNavigateScene).not.toHaveBeenCalled();
    expect(result.current.autoTourState.phase).toBe('narrating');
  });

  it('keeps Auto Tour active when the scene rail jumps to another scene', async () => {
    const { result, audioController, scheduler, onNavigateScene } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => result.current.jumpToScene('scene-b'));
    act(() => scheduler.flush());

    expect(result.current.autoTourState.isActive).toBe(true);
    expect(onNavigateScene).toHaveBeenCalledWith('scene-b', true);
  });

  it('stops and invalidates narration before rail navigation', async () => {
    const events: string[] = [];
    const onNavigateScene = vi.fn((sceneId: string) => {
      events.push(`navigate:${sceneId}`);
    });
    const { result, audioController, scheduler } = createHarness(
      createInput({
        onNavigateScene,
        panoramaNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaTourLinks: [
          { sourceSceneId: 'scene-a', targetSceneId: 'scene-b' },
          { sourceSceneId: 'scene-b', targetSceneId: 'scene-c' },
        ],
      }),
    );

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    await act(async () => {
      await result.current.playNarration();
    });
    act(() => result.current.startAutoTour());

    audioController.calls.length = 0;
    act(() => result.current.jumpToScene('scene-b'));
    expect(audioController.calls[0]).toBe('stopNarration');
    expect(events[0]).toBe('navigate:scene-b');

    act(() => scheduler.flush());
  });

  it('stops and invalidates narration before valid Next and Previous commands', async () => {
    const nextNavigate = vi.fn();
    const nextHarness = createHarness(
      createInput({
        onNavigateScene: nextNavigate,
        panoramaNodes: [scene('scene-a'), scene('scene-b')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b')],
      }),
    );

    await waitFor(() => expect(nextHarness.audioController.calls).toContain('startAmbient'));
    await act(async () => {
      await nextHarness.result.current.playNarration(track('narration-b', 'narration', 'vi'));
    });
    act(() => nextHarness.result.current.startAutoTour());
    nextHarness.audioController.calls.length = 0;

    act(() => nextHarness.result.current.nextScene());
    expect(nextHarness.audioController.calls[0]).toBe('stopNarration');
    expect(nextNavigate).toHaveBeenCalledWith('scene-b', true);

    const previousNavigate = vi.fn();
    const previousHarness = createHarness(
      createInput({
        committedSceneId: 'scene-b',
        onNavigateScene: previousNavigate,
        panoramaNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaTourLinks: [
          { sourceSceneId: 'scene-a', targetSceneId: 'scene-b' },
          { sourceSceneId: 'scene-b', targetSceneId: 'scene-c' },
        ],
      }),
    );

    await waitFor(() => expect(previousHarness.audioController.calls).toContain('startAmbient'));
    await act(async () => {
      await previousHarness.result.current.playNarration(track('narration-b', 'narration', 'vi'));
    });
    act(() => previousHarness.result.current.startAutoTour());
    previousHarness.audioController.calls.length = 0;

    act(() => previousHarness.result.current.previousScene());
    expect(previousHarness.audioController.calls[0]).toBe('stopNarration');
    expect(previousNavigate).toHaveBeenCalledWith('scene-a', true);
  });

  it('stops and invalidates narration before a valid Skip in the narrating phase', async () => {
    const { result, audioController, scheduler } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => scheduler.flush());
    await waitFor(() => expect(audioController.calls).toContain('playNarration:narration-a'));

    audioController.calls.length = 0;
    let didSkip = false;
    act(() => {
      didSkip = result.current.skipStory();
    });

    expect(didSkip).toBe(true);
    expect(audioController.calls[0]).toBe('stopNarration');
    expect(result.current.autoTourState.phase).toBe('holding');
  });

  it('does not cancel narration when Next is invalid at the last scene', async () => {
    const { result, audioController, scheduler } = createHarness(
      createInput({
        panoramaNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaTourLinks: [
          { sourceSceneId: 'scene-a', targetSceneId: 'scene-b' },
          { sourceSceneId: 'scene-b', targetSceneId: 'scene-c' },
        ],
      }),
    );

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => result.current.nextScene());
    act(() => result.current.autoTourController.onSceneCommitted('scene-c'));
    audioController.primeNarration('narration-b');

    const stateBefore = result.current.autoTourState;
    const contextBefore = result.current.coordinator.getCurrentContext();
    const timersBefore = scheduler.callbacks.size;
    audioController.calls.length = 0;
    let didNavigate = true;
    act(() => {
      didNavigate = result.current.nextScene();
    });

    expect(didNavigate).toBe(false);
    expect(audioController.calls).not.toContain('stopNarration');
    expect(audioController.state.narrationTrackId).toBe('narration-b');
    expect(result.current.autoTourState).toEqual(stateBefore);
    expect(result.current.coordinator.getCurrentContext()).toEqual(contextBefore);
    expect(scheduler.callbacks.size).toBe(timersBefore);
  });

  it('does not cancel narration when Previous is invalid at the first scene', async () => {
    const { result, audioController } = createHarness(
      createInput({
        panoramaNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaTourLinks: [
          { sourceSceneId: 'scene-a', targetSceneId: 'scene-b' },
          { sourceSceneId: 'scene-b', targetSceneId: 'scene-c' },
        ],
      }),
    );

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    audioController.primeNarration('narration-b');

    const stateBefore = result.current.autoTourState;
    audioController.calls.length = 0;
    let didNavigate = true;
    act(() => {
      didNavigate = result.current.previousScene();
    });

    expect(didNavigate).toBe(false);
    expect(audioController.calls).not.toContain('stopNarration');
    expect(audioController.state.narrationTrackId).toBe('narration-b');
    expect(result.current.autoTourState).toEqual(stateBefore);
  });

  it('does not corrupt progression or cancel narration when Skip is outside its story phase', async () => {
    const { result, audioController } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => result.current.pauseAutoTour());
    audioController.primeNarration('narration-b');

    const stateBefore = result.current.autoTourState;
    audioController.calls.length = 0;
    let didSkip = true;
    act(() => {
      didSkip = result.current.skipStory();
    });

    expect(didSkip).toBe(false);
    expect(audioController.calls).not.toContain('stopNarration');
    expect(audioController.state.narrationTrackId).toBe('narration-b');
    expect(result.current.autoTourState).toEqual(stateBefore);
  });

  it('does not navigate twice or cancel state while Next and Previous are already transitioning', async () => {
    const onNavigateScene = vi.fn();
    const { result, audioController } = createHarness(
      createInput({
        onNavigateScene,
        panoramaNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaRenderableNodes: [scene('scene-a'), scene('scene-b'), scene('scene-c')],
        panoramaTourLinks: [
          { sourceSceneId: 'scene-a', targetSceneId: 'scene-b' },
          { sourceSceneId: 'scene-b', targetSceneId: 'scene-c' },
        ],
      }),
    );

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());

    audioController.calls.length = 0;
    let firstNext = false;
    act(() => {
      firstNext = result.current.nextScene();
    });
    expect(firstNext).toBe(true);
    expect(onNavigateScene).toHaveBeenCalledTimes(1);
    expect(onNavigateScene).toHaveBeenLastCalledWith('scene-b', true);
    expect(result.current.autoTourState.phase).toBe('transitioning');

    const stateBeforeInvalidCommands = result.current.autoTourState;
    const contextBeforeInvalidCommands = result.current.coordinator.getCurrentContext();
    audioController.calls.length = 0;

    let secondNext = true;
    let previousDuringTransition = true;
    act(() => {
      secondNext = result.current.nextScene();
      previousDuringTransition = result.current.previousScene();
    });

    expect(secondNext).toBe(false);
    expect(previousDuringTransition).toBe(false);
    expect(onNavigateScene).toHaveBeenCalledTimes(1);
    expect(audioController.calls).toEqual([]);
    expect(result.current.autoTourState).toEqual(stateBeforeInvalidCommands);
    expect(result.current.coordinator.getCurrentContext()).toEqual(contextBeforeInvalidCommands);
  });

  it('does not stop Auto Tour when the panorama view changes', async () => {
    const { result, audioController } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    act(() => result.current.startAutoTour());
    act(() => result.current.onViewportInteraction());

    expect(result.current.autoTourState.isActive).toBe(true);
  });

  it('route cleanup stops the old audio session before the next destination starts', async () => {
    const first = createInput();
    const { rerender, audioController } = createHarness(first);
    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));

    rerender({
      value: createInput({
        destinationSlug: 'bien-thien-cam',
        panoramaNodes: [
          { ...scene('thien-cam-a'), destinationSlug: 'bien-thien-cam' },
          { ...scene('thien-cam-b'), destinationSlug: 'bien-thien-cam' },
        ],
        panoramaRenderableNodes: [
          { ...scene('thien-cam-a'), destinationSlug: 'bien-thien-cam' },
          { ...scene('thien-cam-b'), destinationSlug: 'bien-thien-cam' },
        ],
      }),
    });

    await waitFor(() =>
      expect(audioController.calls.filter((call) => call === 'stop')).not.toHaveLength(0),
    );
  });

  it('pauses narration without changing the narrationEnabled preference', async () => {
    const { result, audioController } = createHarness();

    await waitFor(() => expect(audioController.calls).toContain('startAmbient'));
    await act(async () => {
      await result.current.playNarration();
    });
    act(() => result.current.pauseNarration());

    expect(audioController.state.narrationEnabled).toBe(true);
    expect(audioController.calls).toContain('pauseNarration');
  });
});
