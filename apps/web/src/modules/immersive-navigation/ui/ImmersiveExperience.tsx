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
import { useImmersiveManifest } from '../../../shared/api/immersive';
import type {
  ImmersiveActions,
  ImmersiveMode,
  ImmersiveViewVm,
  PanoramaNode,
  PanoramaView,
  RendererStatus,
} from '../../../shared/contracts';

import { getSceneLinks, type ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
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
  manifest?: ImmersiveManifestVm;
}

type ActiveEngine = Map3DEnginePort | PanoramaEnginePort;

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

function getInitialSceneId(manifest: ImmersiveManifestVm): string | null {
  const defaultScene = manifest.defaultSceneId
    ? manifest.panoramaNodes.find((node) => node.id === manifest.defaultSceneId)
    : undefined;

  return defaultScene?.id ?? manifest.panoramaNodes[0]?.id ?? null;
}

function resolveSceneId(manifest: ImmersiveManifestVm, sceneId: string | null): string | null {
  if (sceneId && manifest.panoramaNodes.some((node) => node.id === sceneId)) {
    return sceneId;
  }

  return getInitialSceneId(manifest);
}

function buildImmersiveView(
  manifest: ImmersiveManifestVm,
  destinationSlug: string,
  navigation: ImmersiveNavigationState,
): ImmersiveViewVm {
  const currentScene = manifest.nodes.find((node) => node.id === navigation.sceneId) ?? null;
  const nodes = manifest.nodes.map((node) => ({
    ...node,
    isCurrent: node.id === navigation.sceneId,
    isVisited: navigation.visitedSceneIds.includes(node.id),
  }));

  return {
    mode: navigation.mode,
    destination: {
      ...manifest.destination,
      slug: destinationSlug,
    },
    currentScene: navigation.mode === 'panorama' ? currentScene : null,
    nodes,
    links: navigation.mode === 'panorama' ? getSceneLinks(manifest.links, navigation.sceneId) : [],
    hotspots:
      navigation.mode === 'panorama'
        ? manifest.hotspots.filter(
            (hotspot) => hotspot.sceneId === undefined || hotspot.sceneId === navigation.sceneId,
          )
        : [],
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
  panoramaNode: PanoramaNode | null;
  overviewTarget: ImmersiveManifestVm['overviewTarget'];
  retryKey: number;
}

function RendererHost({
  activeRenderer,
  engine,
  initialView,
  mode,
  onStatusChange,
  onViewChange,
  panoramaNode,
  overviewTarget,
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

  if (mode === 'panorama' && activeRenderer === 'panorama' && panoramaNode) {
    return (
      <Suspense fallback={null}>
        <LazyPanoramaViewport
          key={`panorama-${panoramaNode.id}-${retryKey}`}
          engine={engine as PanoramaEnginePort}
          initialView={initialView}
          node={panoramaNode}
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

function ManifestState({ kind }: { kind: 'loading' | 'error' | 'empty' }) {
  const messages = {
    loading: 'Đang tải hành trình immersive…',
    error: 'Không thể tải dữ liệu hành trình. Hãy thử lại sau.',
    empty: 'Điểm đến chưa có cảnh 360° sẵn sàng.',
  } as const;
  const role = kind === 'loading' ? 'status' : 'alert';

  return (
    <main className="immersive-manifest-state" aria-live="polite" role={role}>
      <p>{messages[kind]}</p>
    </main>
  );
}

export function ImmersiveExperience({
  factories,
  manifest: manifestOverride,
}: ImmersiveExperienceProps) {
  const { destinationSlug: routeDestinationSlug } = useParams<{ destinationSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const destinationSlug = routeDestinationSlug ?? 'son-trang-co-dam';
  const navigation = useImmersiveNavigation();
  const manifestQuery = useImmersiveManifest(destinationSlug, 'vi', !manifestOverride);
  const manifest = manifestOverride ?? manifestQuery.data;
  const defaultFactories = useMemo(createDefaultFactories, []);
  const resolvedFactories = factories ?? defaultFactories;
  const [retryKey, setRetryKey] = useState(0);
  const pendingUrlFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!manifest) {
      return;
    }

    const deepLink = decodeImmersiveDeepLink(`${location.pathname}${location.search}`);
    if (!deepLink || deepLink.destinationSlug !== destinationSlug) {
      return;
    }

    const current = useImmersiveNavigation.getState();
    const sceneId = resolveSceneId(manifest, deepLink.sceneId);

    if (deepLink.mode === 'overview3d') {
      if (current.destinationId !== manifest.destination.id || current.mode !== 'overview3d') {
        current.enterOverview(manifest.destination.id);
      }
      return;
    }

    if (!sceneId) {
      return;
    }

    if (current.destinationId !== manifest.destination.id || current.mode !== 'panorama') {
      current.enterOverview(manifest.destination.id);
    }

    const afterOverview = useImmersiveNavigation.getState();
    if (afterOverview.sceneId !== sceneId || afterOverview.mode !== 'panorama') {
      afterOverview.enterPanorama(sceneId);
    }

    useImmersiveNavigation.getState().updateView(deepLink.view);
  }, [destinationSlug, location.pathname, location.search, manifest]);

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
    if (!manifest) {
      return;
    }

    const state = useImmersiveNavigation.getState();
    state.enterOverview(manifest.destination.id);
    writeDeepLink(navigate, destinationSlug, false);
  }, [destinationSlug, manifest, navigate]);

  const onEnterPanorama = useCallback(
    (sceneId?: string) => {
      if (!manifest) {
        return;
      }

      const resolvedSceneId = resolveSceneId(
        manifest,
        sceneId ?? useImmersiveNavigation.getState().sceneId,
      );
      if (!resolvedSceneId) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      state.enterPanorama(resolvedSceneId);
      writeDeepLink(navigate, destinationSlug, false);
    },
    [destinationSlug, manifest, navigate],
  );

  const onNavigateScene = useCallback(
    (sceneId: string) => {
      if (!manifest || !manifest.panoramaNodes.some((node) => node.id === sceneId)) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      state.navigateToScene(sceneId);
      writeDeepLink(navigate, destinationSlug, false);
    },
    [destinationSlug, manifest, navigate],
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

  if (!manifest) {
    return <ManifestState kind={manifestQuery.isPending ? 'loading' : 'error'} />;
  }

  if (manifest.nodes.length === 0 || manifest.panoramaNodes.length === 0) {
    return <ManifestState kind="empty" />;
  }

  const currentPanoramaNode =
    manifest.panoramaNodes.find((node) => node.id === navigation.sceneId) ?? null;
  const view = buildImmersiveView(manifest, destinationSlug, navigation);
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
      panoramaNode={currentPanoramaNode}
      overviewTarget={manifest.overviewTarget}
      retryKey={retryKey}
    />
  );

  return <ExploreShell actions={actions} rendererContent={rendererContent} view={view} />;
}

export type { ImmersiveDeepLinkState };
