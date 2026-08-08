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
  HotspotPanel,
  LazyPanoramaViewport,
  type PanoramaEnginePort,
} from '../../panorama';
import {
  createLazyMapLibreMinimapEngine,
  resolveMinimapStyle,
  type MinimapEnginePort,
} from '../../minimap';
import { ImmersiveControlsGroup } from './ImmersiveControls';
import { useImmersiveDestinations, useImmersiveManifest } from '../../../shared/api/immersive';
import type {
  ImmersiveActions,
  ImmersiveLocale,
  ImmersiveMode,
  ImmersiveViewVm,
  CameraTarget,
  DestinationPreviewVm,
  Map3DLocation,
  NetworkQuality,
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
  createMinimapEngine(): Promise<MinimapEnginePort>;
}

export interface ImmersiveExperienceProps {
  factories?: ImmersiveExperienceFactories;
  manifest?: ImmersiveManifestVm;
}

type ActiveEngine = Map3DEnginePort | PanoramaEnginePort;

function createDefaultFactories(): ImmersiveExperienceFactories {
  const usesFakeRenderers = import.meta.env.VITE_IMMERSIVE_RENDERER_MODE === 'fake';
  const usesDeterministicMapLibre =
    usesFakeRenderers && import.meta.env.VITE_IMMERSIVE_MINIMAP_MODE === 'maplibre';

  if (usesFakeRenderers) {
    return {
      createMap3DEngine: async () => new FakeMap3DEngine(),
      createPanoramaEngine: async () => new FakePanoramaEngine(),
      createMinimapEngine: usesDeterministicMapLibre
        ? () =>
            createLazyMapLibreMinimapEngine({
              style: resolveMinimapStyle({
                isProduction: true,
                styleUrl: import.meta.env.VITE_MINIMAP_STYLE_URL,
              }),
            })
        : async () => {
            const { FakeMinimapEngine } = await import('../../minimap');
            return new FakeMinimapEngine();
          },
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
    createMinimapEngine: () =>
      createLazyMapLibreMinimapEngine({
        style: resolveMinimapStyle({
          isProduction: import.meta.env.PROD,
          styleUrl: import.meta.env.VITE_MINIMAP_STYLE_URL,
        }),
      }),
  };
}

function getInitialSceneId(manifest: ImmersiveManifestVm): string | null {
  const defaultScene = manifest.defaultSceneId
    ? manifest.panoramaNodes.find((node) => node.id === manifest.defaultSceneId)
    : undefined;

  return defaultScene?.id ?? manifest.panoramaNodes[0]?.id ?? null;
}

function toMap3DLocation(destination: DestinationPreviewVm): Map3DLocation | null {
  if (!destination.geoPoint) {
    return null;
  }

  return {
    id: destination.id,
    label: destination.name,
    position: {
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
      altitude: 0,
    },
    target: {
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
      altitude: 120,
      heading: 0,
      tilt: 55,
      range: 900,
    },
  };
}

function mergeMapLocations(
  manifest: ImmersiveManifestVm,
  destinations: DestinationPreviewVm[],
): Map3DLocation[] {
  const locations = new Map<string, Map3DLocation>();

  for (const destination of destinations) {
    const location = toMap3DLocation(destination);
    if (location) {
      locations.set(location.id, location);
    }
  }

  const manifestLocation = toMap3DLocation(manifest.destination);
  if (manifestLocation) {
    locations.set(manifestLocation.id, manifestLocation);
  }

  return [...locations.values()];
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
  const currentScene =
    manifest.nodes.find((node) => node.id === navigation.committedSceneId) ?? null;
  const nodes = manifest.nodes.map((node) => ({
    ...node,
    isCurrent: node.id === navigation.committedSceneId,
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
    links:
      navigation.mode === 'panorama'
        ? getSceneLinks(manifest.links, navigation.committedSceneId)
        : [],
    hotspots:
      navigation.mode === 'panorama'
        ? manifest.hotspots.filter(
            (hotspot) =>
              hotspot.sceneId === undefined || hotspot.sceneId === navigation.committedSceneId,
          )
        : [],
    heading: navigation.committedView.heading,
    pitch: navigation.committedView.pitch,
    fov: navigation.committedView.fov,
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
    locationId: state.selectedLocationId,
    sceneId: state.committedSceneId,
    view: state.committedView,
  });

  navigate(href, { replace });
}

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  saveData?: boolean;
}

function resolveNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined' || navigator.onLine === false) {
    return 'offline';
  }

  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return connection?.saveData ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g'
    ? 'constrained'
    : 'good';
}

interface RendererHostProps {
  activeRenderer: ActiveRenderer;
  engine: ActiveEngine | null;
  initialView: PanoramaView;
  locations: Map3DLocation[];
  mode: ImmersiveMode;
  onLocationSelected(locationId: string): void;
  onNodeChange(nodeId: string, view: PanoramaView): void;
  onStatusChange(status: RendererStatus): void;
  onViewChange(view: PanoramaView): void;
  panoramaNode: PanoramaNode | null;
  panoramaNodes: PanoramaNode[];
  overviewTarget: CameraTarget;
  retryKey: number;
}

function RendererHost({
  activeRenderer,
  engine,
  initialView,
  locations,
  mode,
  onLocationSelected,
  onNodeChange,
  onStatusChange,
  onViewChange,
  panoramaNode,
  panoramaNodes,
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
          locations={locations}
          onLocationSelected={onLocationSelected}
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
          key={`panorama-${retryKey}`}
          engine={engine as PanoramaEnginePort}
          initialView={initialView}
          node={panoramaNode}
          onNodeChange={onNodeChange}
          onStatusChange={onStatusChange}
          onViewChange={onViewChange}
          tourNodes={panoramaNodes}
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

function useActiveMinimapEngine(
  mode: ImmersiveMode,
  createEngine: () => Promise<MinimapEnginePort>,
) {
  const [engine, setEngine] = useState<MinimapEnginePort | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEngine(null);

    if (mode !== 'panorama') {
      return undefined;
    }

    void createEngine().then(
      (nextEngine) => {
        if (cancelled) {
          nextEngine.destroy();
          return;
        }

        setEngine(nextEngine);
      },
      () => {
        if (!cancelled) {
          setEngine(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [createEngine, mode]);

  return engine;
}

function ManifestState({ kind }: { kind: 'loading' | 'error' | 'empty' }) {
  const messages = {
    loading: 'Đang tải hành trình immersive…',
    error: 'Không thể tải dữ liệu hành trình. Hãy thử lại sau.',
    empty: 'Điểm đến chưa có dữ liệu hành trình.',
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
  const [locale, setLocale] = useState<ImmersiveLocale>('vi');
  const [destinationSearchQuery, setDestinationSearchQuery] = useState('');
  const manifestQuery = useImmersiveManifest(destinationSlug, locale, !manifestOverride);
  const shouldFetchDestinations = !manifestOverride || destinationSearchQuery.trim().length >= 2;
  const destinationsQuery = useImmersiveDestinations(locale, shouldFetchDestinations);
  const manifest = manifestOverride ?? manifestQuery.data;
  const mapLocations = useMemo(
    () => (manifest ? mergeMapLocations(manifest, destinationsQuery.data) : []),
    [destinationsQuery.data, manifest],
  );
  const routeLocation = useMemo(
    () =>
      mapLocations.find((location) => location.id === manifest?.destination.id) ??
      (manifest ? toMap3DLocation(manifest.destination) : null),
    [manifest, mapLocations],
  );

  useEffect(() => {
    const syncNetworkQuality = () => {
      useImmersiveNavigation.getState().setNetworkQuality(resolveNetworkQuality());
    };
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection;

    syncNetworkQuality();
    window.addEventListener('online', syncNetworkQuality);
    window.addEventListener('offline', syncNetworkQuality);
    connection?.addEventListener('change', syncNetworkQuality);

    return () => {
      window.removeEventListener('online', syncNetworkQuality);
      window.removeEventListener('offline', syncNetworkQuality);
      connection?.removeEventListener('change', syncNetworkQuality);
    };
  }, []);

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
    const selectedLocation =
      mapLocations.find((candidate) => candidate.id === deepLink.locationId) ?? routeLocation;
    const sceneId = resolveSceneId(manifest, deepLink.sceneId);

    if (deepLink.mode === 'overview3d') {
      if (selectedLocation) {
        if (current.selectedLocationId !== selectedLocation.id || current.mode !== 'overview3d') {
          current.selectLocation(selectedLocation);
        }
      } else if (
        current.destinationId !== manifest.destination.id ||
        current.mode !== 'overview3d'
      ) {
        current.enterOverview(manifest.destination.id);
      }
      return;
    }

    if (!sceneId) {
      return;
    }

    if (selectedLocation && current.selectedLocationId !== selectedLocation.id) {
      current.selectLocation(selectedLocation);
    } else if (current.destinationId !== manifest.destination.id || current.mode !== 'panorama') {
      current.enterOverview(manifest.destination.id, selectedLocation ?? undefined);
    }

    const afterOverview = useImmersiveNavigation.getState();
    if (afterOverview.committedSceneId !== sceneId || afterOverview.mode !== 'panorama') {
      afterOverview.enterPanorama(sceneId);
    }

    useImmersiveNavigation.getState().updateView(deepLink.view);
  }, [destinationSlug, location.pathname, location.search, manifest, mapLocations, routeLocation]);

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
  const activeMinimapEngine = useActiveMinimapEngine(
    navigation.mode,
    resolvedFactories.createMinimapEngine,
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

  const selectLocation = useCallback(
    (locationId: string) => {
      const locationToSelect = mapLocations.find((candidate) => candidate.id === locationId);
      const destination =
        destinationsQuery.data.find((candidate) => candidate.id === locationId) ??
        (manifest?.destination.id === locationId ? manifest.destination : undefined);

      if (!locationToSelect || !destination) {
        return;
      }

      useImmersiveNavigation.getState().selectLocation(locationToSelect);
      navigate(
        `/explore/${encodeURIComponent(destination.slug)}?mode=overview3d&location=${encodeURIComponent(locationId)}`,
      );
    },
    [destinationsQuery.data, manifest, mapLocations, navigate],
  );

  const onEnter3D = useCallback(() => {
    if (!manifest) {
      return;
    }

    const state = useImmersiveNavigation.getState();
    const locationToRestore =
      mapLocations.find((candidate) => candidate.id === state.selectedLocationId) ?? routeLocation;
    if (locationToRestore) {
      state.selectLocation(locationToRestore);
    } else {
      state.enterOverview(manifest.destination.id);
    }
    writeDeepLink(navigate, destinationSlug, false);
  }, [destinationSlug, manifest, mapLocations, navigate, routeLocation]);

  const onEnterPanorama = useCallback(
    (sceneId?: string) => {
      if (!manifest) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      if (!state.selectedLocationId && routeLocation) {
        state.selectLocation(routeLocation);
      }

      const resolvedSceneId = resolveSceneId(
        manifest,
        sceneId ?? useImmersiveNavigation.getState().committedSceneId,
      );
      if (!resolvedSceneId) {
        return;
      }

      useImmersiveNavigation.getState().enterPanorama(resolvedSceneId);
      writeDeepLink(navigate, destinationSlug, false);
    },
    [destinationSlug, manifest, navigate, routeLocation],
  );

  const onNavigateScene = useCallback(
    (sceneId: string) => {
      if (!manifest || !manifest.panoramaNodes.some((node) => node.id === sceneId)) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      if (sceneId === state.committedSceneId || sceneId === state.requestedSceneId) {
        return;
      }

      state.navigateToScene(sceneId);
    },
    [manifest],
  );

  const onRendererNodeChange = useCallback(
    (sceneId: string, rendererView: PanoramaView) => {
      if (!manifest || !manifest.panoramaNodes.some((node) => node.id === sceneId)) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      if (
        (state.requestedSceneId && state.requestedSceneId !== sceneId) ||
        (!state.requestedSceneId && state.committedSceneId === sceneId)
      ) {
        return;
      }

      state.commitRendererScene(sceneId, rendererView);
      if (useImmersiveNavigation.getState().committedSceneId === sceneId) {
        writeDeepLink(navigate, destinationSlug, true);
      }
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
  const destinationSearchResults = useMemo(() => {
    const query = destinationSearchQuery.trim().toLocaleLowerCase('vi');
    if (query.length < 2) {
      return [];
    }

    return destinationsQuery.data.filter((destination) =>
      [destination.name, destination.summary, destination.categoryLabel ?? '']
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(query),
    );
  }, [destinationSearchQuery, destinationsQuery.data]);
  const onSelectDestination = useCallback(
    (destination: DestinationPreviewVm) => {
      setDestinationSearchQuery('');
      selectLocation(destination.id);
    },
    [selectLocation],
  );
  const onLocaleChange = useCallback((nextLocale: ImmersiveLocale) => {
    setLocale(nextLocale);
  }, []);

  if (!manifest) {
    return <ManifestState kind={manifestQuery.isPending ? 'loading' : 'error'} />;
  }

  const currentPanoramaNode =
    manifest.panoramaNodes.find(
      (node) => node.id === (navigation.requestedSceneId ?? navigation.committedSceneId),
    ) ?? null;
  const panoramaTargetView = navigation.requestedSceneId
    ? (currentPanoramaNode?.initialView ?? navigation.committedView)
    : navigation.committedView;
  const overviewTarget =
    navigation.selectedLocationTarget ??
    mapLocations.find((candidate) => candidate.id === navigation.selectedLocationId)?.target ??
    routeLocation?.target ??
    manifest.overviewTarget;
  const view = buildImmersiveView(manifest, destinationSlug, navigation);
  const selectedHotspot = view.hotspots.find(
    (hotspot) => hotspot.id === navigation.selectedHotspotId,
  );
  const selectedHotspotType =
    selectedHotspot?.type === 'information' ||
    selectedHotspot?.type === 'media' ||
    selectedHotspot?.type === 'audio'
      ? selectedHotspot.type
      : null;
  const rendererContent = (
    <RendererHost
      activeRenderer={navigation.activeRenderer}
      engine={activeEngine}
      initialView={panoramaTargetView}
      locations={mapLocations}
      mode={navigation.mode}
      onLocationSelected={selectLocation}
      onNodeChange={onRendererNodeChange}
      onStatusChange={(status) => {
        const state = useImmersiveNavigation.getState();
        const transitionId = state.transitionId;
        const requestedSceneId = state.requestedSceneId;
        if (state.activeRenderer === 'panorama' && requestedSceneId) {
          if (status === 'ready') {
            const requestedNode = manifest.panoramaNodes.find(
              (node) => node.id === requestedSceneId,
            );
            if (requestedNode) {
              state.commitSceneTransition(transitionId, requestedNode.initialView);
              if (useImmersiveNavigation.getState().committedSceneId === requestedSceneId) {
                writeDeepLink(navigate, destinationSlug, true);
              }
            }
          } else if (status === 'error') {
            state.rollbackSceneTransition(transitionId);
            writeDeepLink(navigate, destinationSlug, true);
          }
        }
        if (
          state.activeRenderer !== 'none' &&
          !(state.activeRenderer === 'panorama' && requestedSceneId && status === 'error')
        ) {
          state.setRendererStatus(state.activeRenderer, status);
        }
      }}
      onViewChange={(nextView) => {
        useImmersiveNavigation.getState().updateView(nextView);
        scheduleUrlSync();
      }}
      panoramaNode={currentPanoramaNode}
      panoramaNodes={manifest.panoramaNodes}
      overviewTarget={overviewTarget}
      retryKey={retryKey}
    />
  );

  return (
    <>
      <ExploreShell
        actions={actions}
        canEnterPanorama={manifest.panoramaNodes.length > 0}
        isSceneTransitioning={navigation.transition === 'navigating-scene'}
        locale={locale}
        map3dLocations={mapLocations}
        minimapEngine={navigation.mode === 'panorama' ? activeMinimapEngine : null}
        onLanguageToggle={() => onLocaleChange(locale === 'vi' ? 'en' : 'vi')}
        onLocationSelected={selectLocation}
        rendererContent={rendererContent}
        selectedLocationId={navigation.selectedLocationId}
        view={view}
      />
      {navigation.mode === 'panorama' ? (
        <ImmersiveControlsGroup
          currentSceneId={navigation.committedSceneId}
          destinations={destinationSearchResults}
          locale={locale}
          nodes={view.nodes}
          searchLoading={destinationsQuery.isPending}
          onLocaleChange={onLocaleChange}
          onNavigateScene={actions.onNavigateScene}
          onSearchDestination={setDestinationSearchQuery}
          onSelectDestination={onSelectDestination}
        />
      ) : null}
      {selectedHotspot && selectedHotspotType ? (
        <HotspotPanel
          content={selectedHotspot.content ?? selectedHotspot.label}
          isOpen
          mediaUrl={selectedHotspot.mediaUrl ?? undefined}
          onClose={actions.onCloseHotspot}
          title={selectedHotspot.label ?? 'Điểm khám phá'}
          type={selectedHotspotType}
        />
      ) : null}
    </>
  );
}

export type { ImmersiveDeepLinkState };
