import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createImmersiveAudioSource,
  ImmersiveAudioController,
  resolveSceneAudio,
  type ImmersiveAudioSource,
  type ImmersiveAudioSourcePolicy,
  type ImmersiveAudioState,
  type NarrationLifecycleEvent,
} from '../../immersive-audio';
import type {
  ImmersiveAudioTrack,
  ImmersiveLocale,
  ImmersiveMode,
  PanoramaNode,
  SceneLinkVm,
} from '../../../shared/contracts';
import {
  AutoTourController,
  type AutoTourControllerOptions,
  type AutoTourControllerState,
} from '../model/auto-tour.controller';
import {
  AudioTourCoordinator,
  type AudioTourAudioController,
  type AudioTourCoordinatorOptions,
} from '../model/audio-tour.coordinator';

export const IMMERSIVE_SOUND_PREFERENCE_STORAGE_KEY = 'hatinh:immersive:sound-preference';

type ImmersiveSoundPreference = 'muted' | 'enabled';

function readSoundPreference(): ImmersiveSoundPreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(IMMERSIVE_SOUND_PREFERENCE_STORAGE_KEY);
    return value === 'muted' || value === 'enabled' ? value : null;
  } catch {
    return null;
  }
}

function writeSoundPreference(preference: ImmersiveSoundPreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(IMMERSIVE_SOUND_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
}

export interface ImmersiveAudioTourAudioController extends AudioTourAudioController {
  getState(): ImmersiveAudioState;
  subscribe(listener: (state: ImmersiveAudioState) => void): () => void;
  subscribeNarrationLifecycle(listener: (event: NarrationLifecycleEvent) => void): () => void;
  setMasterMuted(muted: boolean): void;
  setAmbientEnabled(enabled: boolean): Promise<boolean>;
  setNarrationEnabled(enabled: boolean): Promise<boolean>;
  pauseNarration(): void;
  resumeNarration(): Promise<boolean>;
  seekNarration(seconds: number): boolean;
}

export interface ImmersiveAudioTourInput {
  destinationSlug: string;
  audioSourcePolicy: ImmersiveAudioSourcePolicy;
  destinationAmbientTrackId: string | null;
  audioTracks: readonly ImmersiveAudioTrack[];
  locale: ImmersiveLocale;
  panoramaNodes: readonly PanoramaNode[];
  panoramaRenderableNodes: readonly PanoramaNode[];
  panoramaTourLinks: readonly Pick<SceneLinkVm, 'sourceSceneId' | 'targetSceneId'>[];
  navigationMode: ImmersiveMode;
  committedSceneId: string | null;
  onNavigateScene(sceneId: string, isAutomatic?: boolean): void;
}

export interface ImmersiveAudioTourFactories {
  createAudioController?(): ImmersiveAudioTourAudioController;
  createAutoTourController?(options: AutoTourControllerOptions): AutoTourController;
  createCoordinator?(options: AudioTourCoordinatorOptions): AudioTourCoordinator;
}

export interface ImmersiveAudioTourResult {
  audioController: ImmersiveAudioTourAudioController;
  canPlayTrack(track: ImmersiveAudioTrack): boolean;
  audioState: ImmersiveAudioState;
  autoTourController: AutoTourController;
  autoTourState: AutoTourControllerState;
  coordinator: AudioTourCoordinator;
  startAutoTour(): boolean;
  toggleAutoTour(): boolean;
  pauseAutoTour(): void;
  resumeAutoTour(): void;
  stopAutoTour(): void;
  jumpToScene(sceneId: string): void;
  nextScene(): boolean;
  previousScene(): boolean;
  skipStory(): boolean;
  onViewportInteraction(): void;
  playNarration(track?: ImmersiveAudioTrack | null): Promise<boolean>;
  pauseNarration(): void;
  resumeNarration(): Promise<boolean>;
  toggleNarration(): void;
  setMasterMuted(muted: boolean): void;
  enableAudio(): Promise<boolean>;
  toggleAmbient(): void;
  setAmbientEnabled(enabled: boolean): Promise<boolean>;
  seekNarration(seconds: number): boolean;
}

interface AudioTourRuntime {
  audioController: ImmersiveAudioTourAudioController;
  audioSource: ImmersiveAudioSource;
  autoTourController: AutoTourController;
  coordinator: AudioTourCoordinator;
}

function getNextSceneId(sceneId: string, input: ImmersiveAudioTourInput): string | null {
  const currentIndex = input.panoramaRenderableNodes.findIndex((node) => node.id === sceneId);
  const nextNode = currentIndex >= 0 ? input.panoramaRenderableNodes[currentIndex + 1] : undefined;
  if (!nextNode) {
    return null;
  }

  return input.panoramaTourLinks.some(
    (link) => link.sourceSceneId === sceneId && link.targetSceneId === nextNode.id,
  )
    ? nextNode.id
    : null;
}

function getPreviousSceneId(sceneId: string, input: ImmersiveAudioTourInput): string | null {
  const currentIndex = input.panoramaRenderableNodes.findIndex((node) => node.id === sceneId);
  const previousNode =
    currentIndex > 0 ? input.panoramaRenderableNodes[currentIndex - 1] : undefined;
  if (!previousNode) {
    return null;
  }

  return input.panoramaTourLinks.some(
    (link) => link.sourceSceneId === previousNode.id && link.targetSceneId === sceneId,
  )
    ? previousNode.id
    : null;
}

export function useImmersiveAudioTour(
  input: ImmersiveAudioTourInput,
  factories: ImmersiveAudioTourFactories = {},
): ImmersiveAudioTourResult {
  const inputRef = useRef(input);
  inputRef.current = input;

  const [autoTourState, setAutoTourState] = useState<AutoTourControllerState>(() => ({
    isActive: false,
    isRunning: false,
    isPaused: false,
    phase: 'idle',
    currentSceneId: null,
  }));
  const runtime = useMemo<AudioTourRuntime>(() => {
    let coordinator: AudioTourCoordinator | null = null;
    const audioSource = createImmersiveAudioSource(input.audioSourcePolicy);
    const audioController =
      factories.createAudioController?.() ?? new ImmersiveAudioController(audioSource.adapter);
    const createAutoTourController =
      factories.createAutoTourController ??
      ((options: AutoTourControllerOptions) => new AutoTourController(options));
    const autoTourController = createAutoTourController({
      onNavigate: (sceneId) => inputRef.current.onNavigateScene(sceneId, true),
      getNextSceneId: (sceneId) => getNextSceneId(sceneId, inputRef.current),
      getPreviousSceneId: (sceneId) => getPreviousSceneId(sceneId, inputRef.current),
      onNarrationRequested: (sceneId) => {
        void coordinator?.requestAutoTourNarration(sceneId);
      },
      onStateChange: setAutoTourState,
    });
    const createCoordinator =
      factories.createCoordinator ??
      ((options: AudioTourCoordinatorOptions) => new AudioTourCoordinator(options));
    coordinator = createCoordinator({
      audioController,
      autoTourController,
      tracks: input.audioTracks,
    });

    return { audioController, audioSource, autoTourController, coordinator };
  }, [
    factories.createAudioController,
    factories.createAutoTourController,
    factories.createCoordinator,
    input.audioSourcePolicy,
    input.audioTracks,
    input.destinationSlug,
  ]);

  const [audioState, setAudioState] = useState<ImmersiveAudioState>(() =>
    runtime.audioController.getState(),
  );

  useEffect(() => {
    setAudioState(runtime.audioController.getState());
    return runtime.audioController.subscribe(setAudioState);
  }, [runtime]);

  useEffect(() => {
    const preference = readSoundPreference();
    if (preference) {
      runtime.audioController.setMasterMuted(preference === 'muted');
    }
  }, [runtime]);

  useEffect(() => {
    return runtime.audioController.subscribeNarrationLifecycle((event) => {
      const context = runtime.coordinator.getCurrentContext();
      if (!context) {
        return;
      }

      if (event.type === 'ended') {
        runtime.coordinator.notifyNarrationCompleted(context, event);
      } else {
        runtime.coordinator.notifyNarrationFailed(context, event);
      }
    });
  }, [runtime]);

  useEffect(() => {
    setAutoTourState(runtime.autoTourController.getState());
  }, [runtime]);

  useEffect(() => {
    return () => runtime.coordinator.destroy();
  }, [runtime]);

  const currentScene = useMemo(
    () => input.panoramaNodes.find((node) => node.id === input.committedSceneId) ?? null,
    [input.committedSceneId, input.panoramaNodes],
  );

  useEffect(() => {
    if (input.navigationMode !== 'panorama') {
      runtime.coordinator.destroy();
      return;
    }
    if (!currentScene) {
      return;
    }

    void runtime.coordinator.commitScene({
      destinationSlug: input.destinationSlug,
      destinationAmbientTrackId: input.destinationAmbientTrackId,
      scene: currentScene,
      locale: input.locale,
      mode: runtime.autoTourController.getState().isActive ? 'auto-tour' : 'free-explore',
    });
  }, [
    currentScene,
    input.destinationAmbientTrackId,
    input.destinationSlug,
    input.locale,
    input.navigationMode,
    runtime,
  ]);

  const startAutoTour = useCallback(() => {
    const sceneId = inputRef.current.committedSceneId;
    return sceneId ? runtime.autoTourController.start(sceneId) : false;
  }, [runtime]);

  const toggleAutoTour = useCallback(() => {
    const sceneId = inputRef.current.committedSceneId;
    if (!sceneId) {
      return false;
    }

    const nextState = runtime.autoTourController.toggle(sceneId);
    if (!runtime.autoTourController.getState().isActive) {
      runtime.audioController.stopNarration();
    }
    return nextState;
  }, [runtime]);

  const pauseAutoTour = useCallback(() => {
    runtime.autoTourController.pause();
    runtime.audioController.pauseNarration();
  }, [runtime]);

  const resumeAutoTour = useCallback(() => {
    runtime.autoTourController.resume();
    if (runtime.audioController.getState().narrationTrackId !== null) {
      void runtime.audioController.resumeNarration();
    }
  }, [runtime]);

  const stopAutoTour = useCallback(() => {
    runtime.autoTourController.stop();
    runtime.audioController.stopNarration();
  }, [runtime]);

  const jumpToScene = useCallback(
    (sceneId: string) => {
      const isAutoTourActive = runtime.autoTourController.getState().isActive;
      if (!isAutoTourActive && sceneId === inputRef.current.committedSceneId) {
        return;
      }
      runtime.coordinator.cancelNarrationForNavigation();
      if (isAutoTourActive) {
        runtime.autoTourController.jumpTo(sceneId);
        return;
      }
      inputRef.current.onNavigateScene(sceneId, false);
    },
    [runtime],
  );

  const playNarration = useCallback(
    async (track?: ImmersiveAudioTrack | null) => {
      if (runtime.autoTourController.getState().isActive) {
        return false;
      }

      const resolvedTrack =
        track ??
        (currentScene
          ? resolveSceneAudio({
              tracks: input.audioTracks,
              destinationAmbientTrackId: input.destinationAmbientTrackId,
              scene: currentScene,
              locale: input.locale,
            }).narrationTrack
          : null);
      return runtime.audioController.playNarration(resolvedTrack);
    },
    [currentScene, input.audioTracks, input.destinationAmbientTrackId, input.locale, runtime],
  );

  const pauseNarration = useCallback(() => {
    runtime.audioController.pauseNarration();
  }, [runtime]);

  const resumeNarration = useCallback(() => runtime.audioController.resumeNarration(), [runtime]);

  const toggleNarration = useCallback(() => {
    if (audioState.narrationPlaying) {
      pauseNarration();
      return;
    }
    if (audioState.narrationTrackId !== null) {
      void resumeNarration();
      return;
    }
    void runtime.audioController.setNarrationEnabled(true);
    void playNarration();
  }, [
    audioState.narrationPlaying,
    audioState.narrationTrackId,
    pauseNarration,
    playNarration,
    resumeNarration,
    runtime,
  ]);

  const setMasterMuted = useCallback(
    (muted: boolean) => {
      runtime.audioController.setMasterMuted(muted);
      writeSoundPreference(muted ? 'muted' : 'enabled');
    },
    [runtime],
  );

  const enableAudio = useCallback(async () => {
    runtime.audioController.setMasterMuted(false);
    const { ambientTrackId } = runtime.audioController.getState();
    const didStart = ambientTrackId === null || (await runtime.audioController.startAmbient());
    if (didStart) {
      writeSoundPreference('enabled');
    }
    return didStart;
  }, [runtime]);

  const toggleAmbient = useCallback(() => {
    void runtime.audioController.setAmbientEnabled(!audioState.ambientEnabled);
  }, [audioState.ambientEnabled, runtime]);

  const setAmbientEnabled = useCallback(
    (enabled: boolean) => runtime.audioController.setAmbientEnabled(enabled),
    [runtime],
  );

  const onViewportInteraction = useCallback(() => {
    runtime.autoTourController.onViewportInteraction();
  }, [runtime]);

  const nextScene = useCallback(() => {
    if (!runtime.autoTourController.canNext()) {
      return false;
    }
    runtime.coordinator.cancelNarrationForNavigation();
    return runtime.autoTourController.next();
  }, [runtime]);
  const previousScene = useCallback(() => {
    if (!runtime.autoTourController.canPrevious()) {
      return false;
    }
    runtime.coordinator.cancelNarrationForNavigation();
    return runtime.autoTourController.previous();
  }, [runtime]);
  const skipStory = useCallback(() => {
    if (!runtime.autoTourController.canSkipStory()) {
      return false;
    }
    runtime.coordinator.cancelNarrationForNavigation();
    return runtime.autoTourController.skipStory();
  }, [runtime]);
  const seekNarration = useCallback(
    (seconds: number) => runtime.audioController.seekNarration(seconds),
    [runtime],
  );

  return {
    audioController: runtime.audioController,
    audioState,
    autoTourController: runtime.autoTourController,
    autoTourState,
    coordinator: runtime.coordinator,
    canPlayTrack: runtime.audioSource.canPlayTrack,
    startAutoTour,
    toggleAutoTour,
    pauseAutoTour,
    resumeAutoTour,
    stopAutoTour,
    jumpToScene,
    nextScene,
    previousScene,
    skipStory,
    onViewportInteraction,
    playNarration,
    pauseNarration,
    resumeNarration,
    toggleNarration,
    setMasterMuted,
    enableAudio,
    toggleAmbient,
    setAmbientEnabled,
    seekNarration,
  };
}
