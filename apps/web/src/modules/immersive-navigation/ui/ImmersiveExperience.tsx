import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ExploreShell } from '../../immersive';
import {
  createLazyGoogleMaps3DEngine,
  FakeMap3DEngine,
  LazyMap3DViewport,
  type Map3DEnginePort,
} from '../../map3d';
import {
  createLazyPhotoSphereViewerEngine,
  FakePanoramaEngine,
  LazyPanoramaViewport,
  type PanoramaEnginePort,
} from '../../panorama';
import {
  destinationFixture,
  hotspotsFixture,
  panoramaNodesFixture,
  sceneLinksFixture,
  sceneNodesFixture,
} from '../../../shared/fixtures';
import type {
  ImmersiveActions,
  ImmersiveMode,
  ImmersiveViewVm,
  PanoramaView,
  RendererStatus,
} from '../../../shared/contracts';

import {
  decodeImmersiveDeepLink,
  encodeImmersiveDeepLink,
  type ImmersiveDeepLinkState,
} from '../lib/deep-link';
import { useImmersiveNavigation } from '../model/navigation.store';
import type { ActiveRenderer, ImmersiveNavigationState } from '../model/navigation.types';

export interface ImmersiveExperienceFactories {
  createMap3DEngine(): Promise<Map3DEnginePort>;
  createPanoramaEngine(): Promise<PanoramaEnginePort>;
}

export interface ImmersiveExperienceProps {
  factories?: ImmersiveExperienceFactories;
}

type ActiveEngine = Map3DEnginePort | PanoramaEnginePort;

const overviewTarget = {
  lat: sceneNodesFixture[0]?.lat ?? 18.342,
  lng: sceneNodesFixture[0]?.lng ?? 105.9,
  altitude: 120,
  heading: 0,
  tilt: 55,
  range: 900,
};

function createDefaultFactories(): ImmersiveExperienceFactories {
  if (import.meta.env.VITE_IMMERSIVE_RENDERER_MODE === 'fake') {
    return {
      createMap3DEngine: async () => new FakeMap3DEngine(),
      createPanoramaEngine: async () => new FakePanoramaEngine(),
    };
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  return {
    createMap3DEngine: () =>
      createLazyGoogleMaps3DEngine({
        ...(apiKey ? { apiKey } : {}),
        ...(mapId ? { mapId } : {}),
      }),
    createPanoramaEngine: () => createLazyPhotoSphereViewerEngine(),
  };
}

function getInitialSceneId(): string {
  return panoramaNodesFixture[0]?.id ?? 'scene-01';
}

function resolveSceneId(sceneId: string | null): string {
  if (sceneId && panoramaNodesFixture.some((node) => node.id === sceneId)) {
    return sceneId;
  }

  return getInitialSceneId();
}

function getVisibleLinks(sceneId: string | null) {
  const currentIndex = sceneNodesFixture.findIndex((node) => node.id === sceneId);
  if (currentIndex < 0) {
    return sceneLinksFixture.slice(0, 2);
  }

  return sceneLinksFixture.slice(currentIndex, currentIndex + 2);
}

function buildImmersiveView(
  destinationSlug: string,
  navigation: ImmersiveNavigationState,
): ImmersiveViewVm {
  const currentScene = sceneNodesFixture.find((node) => node.id === navigation.sceneId) ?? null;
  const nodes = sceneNodesFixture.map((node) => ({
    ...node,
    isCurrent: node.id === navigation.sceneId,
    isVisited: navigation.visitedSceneIds.includes(node.id),
  }));

  const destination = {
    ...destinationFixture,
    slug: destinationSlug,
  };

  return {
    mode: navigation.mode,
    destination,
    currentScene: navigation.mode === 'panorama' ? currentScene : null,
    nodes,
    links: navigation.mode === 'panorama' ? getVisibleLinks(navigation.sceneId) : [],
    hotspots: navigation.mode === 'panorama' ? hotspotsFixture : [],
    heading: navigation.view.heading,
    pitch: navigation.view.pitch,
    fov: navigation.view.fov,
    rendererStatus:
      navigation.activeRenderer === 'map3d'
        ? navigation.map3dStatus
        : navigation.activeRenderer === 'panorama'
          ? navigation.panoramaStatus
          : 'idle',
    networkQuality: navigation.networkQuality,
  };
}

function writeDeepLink(
  navigate: ReturnType<typeof useNavigate>,
  destinationSlug: string,
  replace: boolean,
) {
  const state = useImmersiveNavigation.getState();
  const href = encodeImmersiveDeepLink({
    destinationSlug,
    mode: state.mode,
    sceneId: state.sceneId,
    view: state.view,
  });

  navigate(href, { replace });
}

interface RendererHostProps {
  activeRenderer: ActiveRenderer;
  engine: ActiveEngine | null;
  initialView: PanoramaView;
  mode: ImmersiveMode;
  onStatusChange(status: RendererStatus): void;
  onViewChange(view: PanoramaView): void;
  retryKey: number;
}

function RendererHost({
  activeRenderer,
  engine,
  initialView,
  mode,
  onStatusChange,
  onViewChange,
  retryKey,
}: RendererHostProps): ReactNode {
  if (!engine || activeRenderer === 'none') {
    return null;
  }

  if (mode === 'overview3d' && activeRenderer === 'map3d') {
    return (
      <Suspense fallback={null}>
        <LazyMap3DViewport
          key={`map3d-${retryKey}`}
          engine={engine as Map3DEnginePort}
          onStatusChange={onStatusChange}
          target={overviewTarget}
        />
      </Suspense>
    );
  }

  if (mode === 'panorama' && activeRenderer === 'panorama') {
    const node = panoramaNodesFixture.find(
      (candidate) => candidate.id === useImmersiveNavigation.getState().sceneId,
    );
    if (!node) {
      return null;
    }

    return (
      <Suspense fallback={null}>
        <LazyPanoramaViewport
          key={`panorama-${node.id}-${retryKey}`}
          engine={engine as PanoramaEnginePort}
          initialView={initialView}
          node={node}
          onStatusChange={onStatusChange}
          onViewChange={onViewChange}
        />
      </Suspense>
    );
  }

  return null;
}

function useActiveEngine(
  activeRenderer: ActiveRenderer,
  factories: ImmersiveExperienceFactories,
  retryKey: number,
  onCreateError: () => void,
) {
  const [engine, setEngine] = useState<ActiveEngine | null>(null);
  const [engineRenderer, setEngineRenderer] = useState<ActiveRenderer>('none');

  useEffect(() => {
    let cancelled = false;
    setEngine(null);
    setEngineRenderer('none');

    if (activeRenderer === 'none') {
      return undefined;
    }

    const createEngine =
      activeRenderer === 'map3d' ? factories.createMap3DEngine : factories.createPanoramaEngine;

    void createEngine().then(
      (nextEngine) => {
        if (cancelled) {
          nextEngine.destroy();
          return;
        }

        setEngine(nextEngine);
        setEngineRenderer(activeRenderer);
      },
      () => {
        if (!cancelled) {
          onCreateError();
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeRenderer, factories, onCreateError, retryKey]);

  return engineRenderer === activeRenderer ? engine : null;
}

export function ImmersiveExperience({ factories }: ImmersiveExperienceProps) {
  const { destinationSlug: routeDestinationSlug } = useParams<{ destinationSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const destinationSlug = routeDestinationSlug ?? destinationFixture.slug;
  const navigation = useImmersiveNavigation();
  const defaultFactories = useMemo(createDefaultFactories, []);
  const resolvedFactories = factories ?? defaultFactories;
  const [retryKey, setRetryKey] = useState(0);
  const pendingUrlFrame = useRef<number | null>(null);

  useEffect(() => {
    const deepLink = decodeImmersiveDeepLink(`${location.pathname}${location.search}`);
    if (!deepLink || deepLink.destinationSlug !== destinationSlug) {
      return;
    }

    const current = useImmersiveNavigation.getState();
    const sceneId = resolveSceneId(deepLink.sceneId);

    if (deepLink.mode === 'overview3d') {
      if (current.destinationId !== destinationFixture.id || current.mode !== 'overview3d') {
        current.enterOverview(destinationFixture.id);
      }
      return;
    }

    if (current.destinationId !== destinationFixture.id || current.mode !== 'panorama') {
      current.enterOverview(destinationFixture.id);
    }

    const afterOverview = useImmersiveNavigation.getState();
    if (afterOverview.sceneId !== sceneId || afterOverview.mode !== 'panorama') {
      afterOverview.enterPanorama(sceneId);
    }

    useImmersiveNavigation.getState().updateView(deepLink.view);
  }, [destinationSlug, location.pathname, location.search]);

  const onRendererCreateError = useCallback(() => {
    const state = useImmersiveNavigation.getState();
    if (state.activeRenderer !== 'none') {
      state.setRendererStatus(state.activeRenderer, 'error');
    }
  }, []);

  const activeEngine = useActiveEngine(
    navigation.activeRenderer,
    resolvedFactories,
    retryKey,
    onRendererCreateError,
  );

  const scheduleUrlSync = useCallback(() => {
    if (pendingUrlFrame.current !== null) {
      return;
    }

    pendingUrlFrame.current = window.requestAnimationFrame(() => {
      pendingUrlFrame.current = null;
      writeDeepLink(navigate, destinationSlug, true);
    });
  }, [destinationSlug, navigate]);

  useEffect(
    () => () => {
      if (pendingUrlFrame.current !== null) {
        window.cancelAnimationFrame(pendingUrlFrame.current);
      }
    },
    [],
  );

  const onEnter3D = useCallback(() => {
    const state = useImmersiveNavigation.getState();
    state.enterOverview(destinationFixture.id);
    writeDeepLink(navigate, destinationSlug, false);
  }, [destinationSlug, navigate]);

  const onEnterPanorama = useCallback(
    (sceneId?: string) => {
      const state = useImmersiveNavigation.getState();
      state.enterPanorama(resolveSceneId(sceneId ?? state.sceneId));
      writeDeepLink(navigate, destinationSlug, false);
    },
    [destinationSlug, navigate],
  );

  const onNavigateScene = useCallback(
    (sceneId: string) => {
      const state = useImmersiveNavigation.getState();
      state.navigateToScene(resolveSceneId(sceneId));
      writeDeepLink(navigate, destinationSlug, false);
    },
    [destinationSlug, navigate],
  );

  const onRetryRenderer = useCallback(() => {
    const state = useImmersiveNavigation.getState();
    state.clearError();
    if (state.activeRenderer !== 'none') {
      state.setRendererStatus(state.activeRenderer, 'loading');
    }
    setRetryKey((current) => current + 1);
  }, []);

  const actions = useMemo<ImmersiveActions>(
    () => ({
      onCloseHotspot: () => useImmersiveNavigation.getState().closeHotspot(),
      onCloseDestinationInfo: () => undefined,
      onEnter3D,
      onEnterPanorama,
      onNavigateScene,
      onOpenDestinationInfo: () => undefined,
      onRetryRenderer,
      onSelectHotspot: (hotspotId) => useImmersiveNavigation.getState().selectHotspot(hotspotId),
      onToggleMinimap: () => useImmersiveNavigation.getState().toggleMinimap(),
    }),
    [onEnter3D, onEnterPanorama, onNavigateScene, onRetryRenderer],
  );

  const view = buildImmersiveView(destinationSlug, navigation);
  const rendererContent = (
    <RendererHost
      activeRenderer={navigation.activeRenderer}
      engine={activeEngine}
      initialView={navigation.view}
      mode={navigation.mode}
      onStatusChange={(status) => {
        const state = useImmersiveNavigation.getState();
        if (state.activeRenderer !== 'none') {
          state.setRendererStatus(state.activeRenderer, status);
        }
      }}
      onViewChange={(nextView) => {
        useImmersiveNavigation.getState().updateView(nextView);
        scheduleUrlSync();
      }}
      retryKey={retryKey}
    />
  );

  return <ExploreShell actions={actions} rendererContent={rendererContent} view={view} />;
}

export type { ImmersiveDeepLinkState };
