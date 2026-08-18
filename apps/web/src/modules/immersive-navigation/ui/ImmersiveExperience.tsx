import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import '../../../app/styles/immersive.css';
import { ExploreShell } from '../../immersive';
import {
  createLazyGoogleMaps3DEngine,
  FakeMap3DEngine,
  LazyMap3DViewport,
  toDestinationMap3DLocations,
  type Map3DEnginePort,
  type Selected3DAnchor,
} from '../../map3d';
import {
  assertPanoramaRuntimeMediaAllowed,
  createLazyPhotoSphereViewerEngine,
  FakePanoramaEngine,
  HotspotPanel,
  LazyPanoramaViewport,
  type PanoramaRuntimeMediaPolicy,
  type PanoramaEnginePort,
} from '../../panorama';
import { type ImmersiveAudioSourcePolicy } from '../../immersive-audio';
import {
  FakeMinimapEngine,
  createLazyMapLibreMinimapEngine,
  resolveMinimapStyle,
  type MinimapEnginePort,
} from '../../minimap';
import { ImmersiveControlsGroup } from './ImmersiveControls';
import { ImmersiveMediaDock } from './ImmersiveMediaDock';
import { ReferenceParityControls } from './ReferenceParityControls';
import {
  buildImmersiveMediaDockVm,
  buildReferenceParityPresentationVm,
  type ImmersiveMediaDockActions,
  type ReferenceParityPresentationActions,
} from './reference-parity.presentation';
import { useImmersiveDestinations, useImmersiveManifest } from '../../../shared/api/immersive';
import type {
  ImmersiveActions,
  ImmersiveLocale,
  ImmersiveMode,
  ImmersiveViewVm,
  CameraTarget,
  DestinationPreviewVm,
  HotspotVm,
  LocationCameraPreset,
  Map3DLocation,
  NetworkQuality,
  PanoramaNode,
  PanoramaView,
  RendererStatus,
} from '../../../shared/contracts';

import { getSceneLinks, type ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import {
  createDestinationDetailHref,
  createExploreReturnHref,
  parseExploreReturnHref,
} from '../../../shared/navigation/explore-context';
import {
  decodeImmersiveDeepLink,
  encodeImmersiveDeepLink,
  type ImmersiveDeepLinkState,
} from '../lib/deep-link';
import { resolveRendererModes } from '../lib/renderer-mode';
import { useImmersiveNavigation } from '../model/navigation.store';
import { DEFAULT_NAVIGATION_VIEW } from '../model/navigation.view';
import type { ActiveRenderer, ImmersiveNavigationState } from '../model/navigation.types';
import {
  resolvePublicSelected3DAnchors,
  type Selected3DAnchorSource,
} from '../model/selected-3d-anchor-source';
import {
  composePanoramaTourDestination,
  composePanoramaTourManifest,
  type PanoramaTourMediaMode,
  type PanoramaTourSource,
} from '../model/panorama-tour-source';
import {
  getPanoramaRenderableNodes,
  getPanoramaTourLinks,
  isPanoramaSceneUsable,
  resolvePanoramaSceneForAnchor,
  resolveTourSceneId,
  validatePanoramaTourGraph,
} from '../../panorama-tour';
import { shareImmersiveScene, toggleImmersiveFullscreen } from '../model/reference-parity.actions';
import { useImmersiveAudioTour } from './useImmersiveAudioTour';

export interface ImmersiveExperienceFactories {
  createMap3DEngine(): Promise<Map3DEnginePort>;
  createPanoramaEngine(): Promise<PanoramaEnginePort>;
  createMinimapEngine(): Promise<MinimapEnginePort>;
}

export interface ImmersiveExperienceProps {
  destinations?: DestinationPreviewVm[];
  factories?: ImmersiveExperienceFactories;
  manifest?: ImmersiveManifestVm;
  selected3DAnchors?: readonly Selected3DAnchor[];
  selected3DAnchorSource?: Selected3DAnchorSource;
  panoramaTourSource?: PanoramaTourSource;
  panoramaTourMediaMode?: PanoramaTourMediaMode;
  audioSourcePolicy?: ImmersiveAudioSourcePolicy;
}

const EMPTY_SELECTED_3D_ANCHORS: readonly Selected3DAnchor[] = [];
const EMPTY_AUDIO_TRACKS = [] as const;
const EMPTY_PANORAMA_NODES: readonly PanoramaNode[] = [];

type ActiveEngine = Map3DEnginePort | PanoramaEnginePort;

interface PanoramaEntryRouteState {
  entrySceneId: string;
  origin?: 'destination-detail' | 'explore';
}

function createDefaultFactories(
  initialTarget?: CameraTarget,
  panoramaRuntimeMediaPolicy: PanoramaRuntimeMediaPolicy = 'public',
): ImmersiveExperienceFactories {
  const rendererModes = resolveRendererModes(import.meta.env);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  return {
    createMap3DEngine:
      rendererModes.map3d === 'fake'
        ? async () => new FakeMap3DEngine()
        : () =>
            createLazyGoogleMaps3DEngine({
              ...(apiKey ? { apiKey } : {}),
              ...(initialTarget ? { initialTarget } : {}),
              ...(mapId ? { mapId } : {}),
            }),
    createPanoramaEngine:
      rendererModes.panorama === 'fake'
        ? async () => new FakePanoramaEngine()
        : () =>
            createLazyPhotoSphereViewerEngine({
              validatePanorama: (node, manifest) =>
                assertPanoramaRuntimeMediaAllowed(node, manifest, panoramaRuntimeMediaPolicy),
            }),
    createMinimapEngine:
      rendererModes.minimap === 'fake'
        ? async () => new FakeMinimapEngine()
        : () =>
            createLazyMapLibreMinimapEngine({
              style: resolveMinimapStyle({
                allowDemoFallback: import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake',
                isProduction: import.meta.env.PROD,
                styleUrl: import.meta.env.VITE_MINIMAP_STYLE_URL,
              }),
            }),
  };
}

function toMap3DLocation(destination: DestinationPreviewVm): Map3DLocation | null {
  if (!destination.geoPoint) {
    return null;
  }

  const cameraPreset =
    destination.cameraPreset ??
    buildDefaultLocationCamera({
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
    });

  return {
    id: destination.id,
    label: destination.name,
    position: {
      lat: destination.geoPoint.latitude,
      lng: destination.geoPoint.longitude,
      altitude: 0,
    },
    cameraPreset,
  };
}

function buildDefaultLocationCamera(location: Pick<Map3DLocation['position'], 'lat' | 'lng'>) {
  return {
    center: { lat: location.lat, lng: location.lng, altitude: 0 },
    heading: 0,
    tilt: 55,
    range: 1200,
  } satisfies LocationCameraPreset;
}

function mergeMapLocations(
  manifest: ImmersiveManifestVm,
  destinations: DestinationPreviewVm[],
  scopeToDestination = false,
): Map3DLocation[] {
  const locations = new Map<string, Map3DLocation>();

  const candidates = scopeToDestination
    ? destinations.filter((destination) => destination.id === manifest.destination.id)
    : destinations;
  for (const destination of candidates) {
    const location = toMap3DLocation(destination);
    if (location) {
      locations.set(location.id, location);
    }
  }

  const manifestLocation = toMap3DLocation(manifest.destination);
  if (manifestLocation && !scopeToDestination) {
    locations.set(manifestLocation.id, manifestLocation);
  }

  if (scopeToDestination && manifestLocation && locations.size === 0) {
    locations.set(manifestLocation.id, manifestLocation);
  }

  return [...locations.values()];
}

function resolveSceneId(manifest: ImmersiveManifestVm, sceneId: string | null): string | null {
  return resolveTourSceneId(manifest.panoramaNodes, manifest.defaultSceneId, sceneId);
}

function buildImmersiveView(
  manifest: ImmersiveManifestVm,
  destinationSlug: string,
  navigation: ImmersiveNavigationState,
  overviewDestination?: DestinationPreviewVm,
  displaySceneId: string | null = navigation.committedSceneId,
): ImmersiveViewVm {
  const currentScene = manifest.nodes.find((node) => node.id === displaySceneId) ?? null;
  const nodes = manifest.nodes.map((node) => ({
    ...node,
    isCurrent: node.id === displaySceneId,
    isVisited: navigation.visitedSceneIds.includes(node.id),
  }));

  return {
    mode: navigation.mode,
    destination:
      navigation.mode === 'overview3d' && overviewDestination
        ? overviewDestination
        : {
            ...manifest.destination,
            slug: destinationSlug,
          },
    currentScene: navigation.mode === 'panorama' ? currentScene : null,
    nodes,
    links: navigation.mode === 'panorama' ? getSceneLinks(manifest.links, displaySceneId) : [],
    hotspots:
      navigation.mode === 'panorama'
        ? manifest.hotspots.filter(
            (hotspot) => hotspot.sceneId === undefined || hotspot.sceneId === displaySceneId,
          )
        : [],
    heading: navigation.committedView.heading,
    pitch: navigation.committedView.pitch,
    fov: navigation.committedView.fov,
    rendererStatus:
      navigation.activeRenderer === 'map3d'
        ? navigation.map3dStatus
        : navigation.mode === 'panorama'
          ? navigation.panoramaStatus
          : 'idle',
    networkQuality: navigation.networkQuality,
  };
}

function writeDeepLink(
  navigate: ReturnType<typeof useNavigate>,
  destinationSlug: string,
  replace: boolean,
  returnTo?: string,
  routeState?: PanoramaEntryRouteState | null,
  expectedHrefRef?: { current: string | null },
) {
  const state = useImmersiveNavigation.getState();
  const href = encodeImmersiveDeepLink({
    destinationSlug,
    mode: state.mode,
    locationId: state.selectedLocationId,
    sceneId: state.committedSceneId,
    view: state.committedView,
    ...(returnTo ? { returnTo } : {}),
  });

  if (expectedHrefRef) {
    expectedHrefRef.current = href;
  }

  navigate(href, { replace, ...(routeState ? { state: routeState } : {}) });
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
  hotspots: HotspotVm[];
  initialView: PanoramaView;
  locations: Map3DLocation[];
  mode: ImmersiveMode;
  onHotspotSelect(hotspotId: string): void;
  onCameraTransitionChange(isTransitioning: boolean): void;
  onLocationSelected(locationId: string): void;
  onNodeChange(nodeId: string, view: PanoramaView): void;
  onStatusChange(status: RendererStatus, nodeId?: string): void;
  onViewChange(view: PanoramaView): void;
  panoramaNode: PanoramaNode | null;
  panoramaNodes: PanoramaNode[];
  cameraPreset: LocationCameraPreset | undefined;
  retryKey: number;
}

function RendererHost({
  activeRenderer,
  engine,
  hotspots,
  initialView,
  locations,
  mode,
  onHotspotSelect,
  onCameraTransitionChange,
  onLocationSelected,
  onNodeChange,
  onStatusChange,
  onViewChange,
  panoramaNode,
  panoramaNodes,
  cameraPreset,
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
          onCameraTransitionChange={onCameraTransitionChange}
          onStatusChange={onStatusChange}
          {...(cameraPreset ? { cameraPreset } : {})}
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
          fallback={null}
          hotspots={hotspots}
          initialView={initialView}
          node={panoramaNode}
          onHotspotSelect={onHotspotSelect}
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
  destinations: destinationsOverride,
  factories,
  manifest: manifestOverride,
  selected3DAnchors = EMPTY_SELECTED_3D_ANCHORS,
  selected3DAnchorSource = 'none',
  panoramaTourSource = 'none',
  panoramaTourMediaMode = 'public',
  audioSourcePolicy,
}: ImmersiveExperienceProps) {
  const { destinationSlug: routeDestinationSlug } = useParams<{ destinationSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const destinationSlug = routeDestinationSlug ?? 'son-trang-co-dam';
  const navigation = useImmersiveNavigation();
  const [locale, setLocale] = useState<ImmersiveLocale>('vi');
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isCameraTransitioning, setIsCameraTransitioning] = useState(false);
  const [destinationSearchQuery, setDestinationSearchQuery] = useState('');
  const manifestQuery = useImmersiveManifest(destinationSlug, locale, !manifestOverride);
  const shouldFetchDestinations =
    destinationsOverride === undefined &&
    (!manifestOverride || destinationSearchQuery.trim().length >= 2);
  const destinationsQuery = useImmersiveDestinations(locale, shouldFetchDestinations);
  const destinations = destinationsOverride ?? destinationsQuery.data;
  const sourceManifest = manifestOverride ?? manifestQuery.data;
  const resolvedAudioSourcePolicy =
    audioSourcePolicy ?? (panoramaTourSource === 'demo' ? 'demo-speech-synthesis' : 'browser-file');
  const manifest = useMemo(
    () =>
      sourceManifest
        ? composePanoramaTourManifest(sourceManifest, panoramaTourSource, panoramaTourMediaMode)
        : undefined,
    [panoramaTourMediaMode, panoramaTourSource, sourceManifest],
  );
  const composedSelected3DAnchors = useMemo(
    () =>
      selected3DAnchors.length > 0
        ? selected3DAnchors
        : manifest
          ? resolvePublicSelected3DAnchors(
              { id: manifest.destination.id, slug: manifest.destination.slug },
              selected3DAnchorSource,
            )
          : EMPTY_SELECTED_3D_ANCHORS,
    [manifest, selected3DAnchorSource, selected3DAnchors],
  );
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const isDestinationScopedSelected3D = requestedMode === 'overview3d';
  const destinationAnchors = useMemo(
    () =>
      manifest
        ? composedSelected3DAnchors.filter(
            (anchor) => anchor.destinationId === manifest.destination.id,
          )
        : [],
    [composedSelected3DAnchors, manifest],
  );

  const panoramaTourLinks = useMemo(
    () => (manifest ? getPanoramaTourLinks(manifest.panoramaNodes, manifest.links) : []),
    [manifest],
  );
  const panoramaRenderableNodes = useMemo(
    () => (manifest ? getPanoramaRenderableNodes(manifest.panoramaNodes) : []),
    [manifest],
  );
  const panoramaTourGraph = useMemo(
    () =>
      manifest
        ? validatePanoramaTourGraph(manifest.panoramaNodes, panoramaTourLinks)
        : { valid: true, issues: [] },
    [manifest, panoramaTourLinks],
  );
  const mapLocations = useMemo(() => {
    if (!manifest) {
      return [];
    }
    if (isDestinationScopedSelected3D && destinationAnchors.length > 0) {
      return toDestinationMap3DLocations(destinationAnchors, manifest.destination.id);
    }
    return mergeMapLocations(manifest, destinations, isDestinationScopedSelected3D);
  }, [destinationAnchors, destinations, isDestinationScopedSelected3D, manifest]);
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

  const defaultFactories = useMemo(
    () =>
      createDefaultFactories(
        manifest?.overviewTarget,
        panoramaTourMediaMode === 'synthetic' ? 'demo' : 'public',
      ),
    [manifest?.overviewTarget, panoramaTourMediaMode],
  );
  const resolvedFactories = factories ?? defaultFactories;
  const audioTracks = manifest?.audioTracks ?? EMPTY_AUDIO_TRACKS;
  const [retryKey, setRetryKey] = useState(0);
  const pendingUrlFrame = useRef<number | null>(null);
  const expectedDeepLinkRef = useRef<string | null>(null);
  const trustedExploreReturnHref = useMemo(() => {
    const rawReturnTo = new URLSearchParams(location.search).get('returnTo');
    const context = rawReturnTo ? parseExploreReturnHref(rawReturnTo) : null;
    return context ? createExploreReturnHref(context) : undefined;
  }, [location.search]);
  const hasImmersiveEntryHistory = Boolean(
    (location.state as PanoramaEntryRouteState | null)?.origin === 'destination-detail',
  );

  useEffect(() => {
    if (!manifest) {
      return;
    }

    const deepLink = decodeImmersiveDeepLink(`${location.pathname}${location.search}`);
    if (!deepLink || deepLink.destinationSlug !== destinationSlug) {
      return;
    }

    const currentHref = `${location.pathname}${location.search}`;
    if (expectedDeepLinkRef.current) {
      if (expectedDeepLinkRef.current !== currentHref) {
        return;
      }
      expectedDeepLinkRef.current = null;
    }

    const current = useImmersiveNavigation.getState();
    const selectedLocation =
      mapLocations.find((candidate) => candidate.id === deepLink.locationId) ??
      destinationAnchors.find((candidate) => candidate.id === deepLink.locationId) ??
      (deepLink.mode === 'overview3d' ? mapLocations[0] : routeLocation);
    const sceneId = resolveSceneId(manifest, deepLink.sceneId);

    if (deepLink.mode === 'overview3d') {
      if (selectedLocation) {
        if (current.selectedLocationId !== selectedLocation.id || current.mode !== 'overview3d') {
          current.selectLocation(selectedLocation, manifest.destination.id);
        }
        if (deepLink.locationId !== selectedLocation.id) {
          writeDeepLink(
            navigate,
            destinationSlug,
            true,
            trustedExploreReturnHref,
            location.state,
            expectedDeepLinkRef,
          );
        }
      } else if (
        current.destinationId !== manifest.destination.id ||
        current.mode !== 'overview3d'
      ) {
        current.enterOverview(manifest.destination.id);
      }
      return;
    }

    const scene = sceneId
      ? manifest.panoramaNodes.find((candidate) => candidate.id === sceneId)
      : undefined;
    if (!sceneId || !scene || !isPanoramaSceneUsable(scene)) {
      if (current.mode !== 'panorama' || current.panoramaStatus !== 'unavailable') {
        current.markPanoramaUnavailable();
      }
      return;
    }

    if (
      current.mode === 'panorama' &&
      current.panoramaStatus === 'error' &&
      current.committedSceneId === null &&
      current.requestedSceneId === null
    ) {
      return;
    }

    if (selectedLocation && current.selectedLocationId !== selectedLocation.id) {
      current.selectLocation(selectedLocation);
    } else if (current.destinationId !== manifest.destination.id || current.mode !== 'panorama') {
      current.enterOverview(manifest.destination.id, selectedLocation ?? undefined);
    }

    const afterOverview = useImmersiveNavigation.getState();
    if (afterOverview.mode !== 'panorama') {
      afterOverview.requestPanoramaEntry(sceneId, deepLink.view);
    } else if (
      afterOverview.committedSceneId !== sceneId &&
      afterOverview.requestedSceneId !== sceneId
    ) {
      if (afterOverview.committedSceneId) {
        afterOverview.navigateToScene(sceneId);
      } else {
        afterOverview.requestPanoramaEntry(sceneId, deepLink.view);
      }
    }

    const entrySceneView =
      (location.state as PanoramaEntryRouteState | null)?.entrySceneId === sceneId
        ? manifest.panoramaNodes.find((node) => node.id === sceneId)?.initialView
        : undefined;
    const stateBeforeViewSync = useImmersiveNavigation.getState();
    const canSyncDeepLinkedView =
      stateBeforeViewSync.requestedSceneId === null ||
      stateBeforeViewSync.requestedSceneId === sceneId ||
      stateBeforeViewSync.committedSceneId === sceneId;
    if (canSyncDeepLinkedView) {
      stateBeforeViewSync.updateView(entrySceneView ?? deepLink.view);
    }
    const canonicalLocationId = selectedLocation?.id ?? null;
    const needsCanonicalization =
      deepLink.locationId !== canonicalLocationId ||
      deepLink.sceneId !== sceneId ||
      (entrySceneView !== undefined &&
        (deepLink.view.heading !== entrySceneView.heading ||
          deepLink.view.pitch !== entrySceneView.pitch ||
          deepLink.view.fov !== entrySceneView.fov));
    const entryIsPending =
      useImmersiveNavigation.getState().requestedSceneId === sceneId &&
      useImmersiveNavigation.getState().committedSceneId !== sceneId;
    if (needsCanonicalization && !entryIsPending) {
      writeDeepLink(
        navigate,
        destinationSlug,
        true,
        trustedExploreReturnHref,
        location.state,
        expectedDeepLinkRef,
      );
    }
  }, [
    destinationSlug,
    location.pathname,
    location.search,
    location.state,
    manifest,
    mapLocations,
    navigate,
    retryKey,
    routeLocation,
    destinationAnchors,
    trustedExploreReturnHref,
  ]);

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
      writeDeepLink(
        navigate,
        destinationSlug,
        true,
        trustedExploreReturnHref,
        location.state,
        expectedDeepLinkRef,
      );
    });
  }, [destinationSlug, location.state, navigate, trustedExploreReturnHref]);

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
      if (!locationToSelect || !manifest) {
        return;
      }

      useImmersiveNavigation.getState().selectLocation(locationToSelect, manifest.destination.id);
      navigate(
        encodeImmersiveDeepLink({
          destinationSlug,
          mode: 'overview3d',
          locationId,
          sceneId: null,
          view: DEFAULT_NAVIGATION_VIEW,
          ...(trustedExploreReturnHref ? { returnTo: trustedExploreReturnHref } : {}),
        }),
        { replace: true, state: location.state },
      );
    },
    [destinationSlug, location.state, manifest, mapLocations, navigate, trustedExploreReturnHref],
  );

  const onReturnToDestination = useCallback(() => {
    if (hasImmersiveEntryHistory) {
      navigate(-1);
      return;
    }

    navigate(createDestinationDetailHref(destinationSlug, trustedExploreReturnHref), {
      replace: true,
    });
  }, [destinationSlug, hasImmersiveEntryHistory, navigate, trustedExploreReturnHref]);

  const onEnterPanorama = useCallback(
    (sceneId?: string) => {
      if (!manifest) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      if (!state.selectedLocationId && routeLocation) {
        state.selectLocation(routeLocation);
      }
      const currentState = useImmersiveNavigation.getState();

      const selectedDestination = composePanoramaTourDestination(
        destinations.find((destination) => destination.id === currentState.selectedLocationId) ??
          manifest.destination,
        panoramaTourSource,
      );

      if (selectedDestination.id !== manifest.destination.id) {
        const destinationSceneId = sceneId ?? selectedDestination.defaultSceneId;
        if (!destinationSceneId) {
          return;
        }

        navigate(
          encodeImmersiveDeepLink({
            destinationSlug: selectedDestination.slug,
            mode: 'panorama',
            locationId: selectedDestination.id,
            sceneId: destinationSceneId,
            view: DEFAULT_NAVIGATION_VIEW,
            ...(trustedExploreReturnHref ? { returnTo: trustedExploreReturnHref } : {}),
          }),
          {
            state: {
              ...(location.state as PanoramaEntryRouteState | null),
              entrySceneId: destinationSceneId,
              origin: 'destination-detail',
            } satisfies PanoramaEntryRouteState,
          },
        );
        return;
      }

      const resolvedSceneId = resolveSceneId(
        manifest,
        sceneId ?? useImmersiveNavigation.getState().committedSceneId,
      );
      if (!resolvedSceneId) {
        return;
      }

      if (currentState.mode === 'panorama' && currentState.committedSceneId) {
        currentState.navigateToScene(resolvedSceneId);
        return;
      }

      const replaceModeTransition = currentState.mode === 'overview3d';
      currentState.requestPanoramaEntry(resolvedSceneId, DEFAULT_NAVIGATION_VIEW);
      navigate(
        encodeImmersiveDeepLink({
          destinationSlug,
          mode: 'panorama',
          locationId: currentState.selectedLocationId,
          sceneId: null,
          view: DEFAULT_NAVIGATION_VIEW,
          ...(trustedExploreReturnHref ? { returnTo: trustedExploreReturnHref } : {}),
        }),
        { replace: replaceModeTransition, state: location.state },
      );
    },
    [
      destinationSlug,
      destinations,
      location.state,
      manifest,
      navigate,
      panoramaTourSource,
      routeLocation,
      trustedExploreReturnHref,
    ],
  );

  const navigateScene = useCallback(
    (sceneId: string) => {
      const targetNode = manifest?.panoramaNodes.find((node) => node.id === sceneId);
      if (!manifest || !panoramaTourGraph.valid || !targetNode) {
        return;
      }
      if (!isPanoramaSceneUsable(targetNode)) {
        return;
      }

      const state = useImmersiveNavigation.getState();
      if (sceneId === state.committedSceneId || sceneId === state.requestedSceneId) {
        return;
      }

      state.navigateToScene(sceneId);
    },
    [manifest, panoramaTourGraph.valid],
  );

  const audioTour = useImmersiveAudioTour({
    destinationSlug,
    audioSourcePolicy: resolvedAudioSourcePolicy,
    destinationAmbientTrackId: audioTracks.find((track) => track.type === 'ambient')?.id ?? null,
    audioTracks,
    locale,
    panoramaNodes: manifest?.panoramaNodes ?? EMPTY_PANORAMA_NODES,
    panoramaRenderableNodes,
    panoramaTourLinks,
    navigationMode: navigation.mode,
    committedSceneId: navigation.committedSceneId,
    onNavigateScene: navigateScene,
  });
  const {
    audioState,
    autoTourController,
    autoTourState,
    startAutoTour,
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
    seekNarration,
    toggleNarration,
    setMasterMuted,
    enableAudio,
    toggleAmbient,
    toggleAutoTour: onToggleAutoTour,
  } = audioTour;
  const onNavigateScene = useCallback((sceneId: string) => jumpToScene(sceneId), [jumpToScene]);

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
        autoTourController.onSceneCommitted(sceneId);
        writeDeepLink(
          navigate,
          destinationSlug,
          true,
          trustedExploreReturnHref,
          location.state,
          expectedDeepLinkRef,
        );
      }
    },
    [
      autoTourController,
      destinationSlug,
      location.state,
      manifest,
      navigate,
      trustedExploreReturnHref,
    ],
  );

  const onRetryRenderer = useCallback(() => {
    const state = useImmersiveNavigation.getState();
    state.clearError();
    if (state.mode === 'panorama') {
      state.setRendererStatus('panorama', 'loading');
    } else if (state.activeRenderer !== 'none') {
      state.setRendererStatus(state.activeRenderer, 'loading');
    }
    setRetryKey((current) => current + 1);
  }, []);

  const onSelectHotspot = useCallback(
    (hotspotId: string) => {
      const hotspot = manifest?.hotspots.find((candidate) => candidate.id === hotspotId);
      if (!hotspot) {
        return;
      }

      if (hotspot.type === 'scene-navigation' && hotspot.targetSceneId) {
        onNavigateScene(hotspot.targetSceneId);
        return;
      }

      useImmersiveNavigation.getState().selectHotspot(hotspotId);
      if (manifest && hotspot.type === 'audio' && hotspot.audioTrackId) {
        const track = manifest.audioTracks?.find(
          (candidate) => candidate.id === hotspot.audioTrackId,
        );
        if (track) {
          void playNarration(track);
        }
      }
    },
    [manifest, onNavigateScene, playNarration],
  );

  const onToggleMinimap = useCallback(() => {
    onViewportInteraction();
    useImmersiveNavigation.getState().toggleMinimap();
  }, [onViewportInteraction]);

  const onToggleMasterMute = useCallback(() => {
    setMasterMuted(!audioState.masterMuted);
  }, [audioState.masterMuted, setMasterMuted]);

  const onEnableAudio = useCallback(() => enableAudio(), [enableAudio]);

  const onToggleAmbient = useCallback(() => {
    toggleAmbient();
  }, [toggleAmbient]);

  const onToggleNarration = useCallback(() => {
    toggleNarration();
  }, [toggleNarration]);

  const actions = useMemo<ImmersiveActions>(
    () => ({
      onCloseHotspot: () => useImmersiveNavigation.getState().closeHotspot(),
      onCloseDestinationInfo: () => undefined,
      onReturnToDestination,
      onEnterPanorama,
      onNavigateScene,
      onOpenDestinationInfo: () => undefined,
      onRetryRenderer,
      onSelectHotspot,
      onToggleMinimap,
    }),
    [
      onEnterPanorama,
      onNavigateScene,
      onRetryRenderer,
      onReturnToDestination,
      onSelectHotspot,
      onToggleMinimap,
    ],
  );
  const destinationSearchResults = useMemo(() => {
    const query = destinationSearchQuery.trim().toLocaleLowerCase('vi');
    if (query.length < 2) {
      return [];
    }

    return destinations.filter((destination) =>
      [destination.name, destination.summary, destination.categoryLabel ?? '']
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(query),
    );
  }, [destinationSearchQuery, destinations]);
  const onSelectDestination = useCallback(
    (destination: DestinationPreviewVm) => {
      setDestinationSearchQuery('');

      if (navigation.mode === 'panorama') {
        if (destination.id !== manifest?.destination.id) {
          navigate(createDestinationDetailHref(destination.slug, trustedExploreReturnHref));
        }
        return;
      }

      selectLocation(destination.id);
    },
    [manifest, navigate, navigation.mode, selectLocation, trustedExploreReturnHref],
  );
  const onLocaleChange = useCallback((nextLocale: ImmersiveLocale) => {
    setLocale(nextLocale);
  }, []);

  const referenceParityActions = useMemo<ReferenceParityPresentationActions>(
    () => ({
      onBack: onReturnToDestination,
      onToggleLocale: () => onLocaleChange(locale === 'vi' ? 'en' : 'vi'),
      onSelectScene: onNavigateScene,
      onSelectHotspot,
      onToggleMinimap,
      onToggleMasterMute,
      onEnableAudio,
      onToggleAmbient,
      onToggleNarration,
      onToggleAutoTour,
      onRetry: onRetryRenderer,
      onShare: () =>
        shareImmersiveScene({
          title: manifest?.destination.name ?? destinationSlug,
          url: window.location.href,
          ...(typeof navigator.share === 'function'
            ? { share: (data) => navigator.share(data) }
            : {}),
          ...(navigator.clipboard
            ? { copy: (text: string) => navigator.clipboard.writeText(text) }
            : {}),
        }),
      onFullscreen: () => {
        void toggleImmersiveFullscreen(document);
      },
    }),
    [
      destinationSlug,
      manifest,
      locale,
      onEnableAudio,
      onLocaleChange,
      onNavigateScene,
      onRetryRenderer,
      onReturnToDestination,
      onSelectHotspot,
      onToggleAmbient,
      onToggleAutoTour,
      onToggleMasterMute,
      onToggleMinimap,
      onToggleNarration,
    ],
  );

  const mediaDockActions = useMemo<ImmersiveMediaDockActions>(
    () => ({
      onEnableSound: onEnableAudio,
      onContinueMuted: () => setMasterMuted(true),
      onPlayNarration: () => {
        void playNarration();
      },
      onResumeNarration: () => {
        void resumeNarration();
      },
      onPauseNarration: pauseNarration,
      onToggleMasterMute,
      onSeekNarration: seekNarration,
      onToggleCaptions: () => setCaptionsEnabled((enabled) => !enabled),
      onOpenTranscript: () => undefined,
      onCloseTranscript: () => undefined,
      onStartAutoTour: () => {
        startAutoTour();
      },
      onPauseAutoTour: pauseAutoTour,
      onResumeAutoTour: resumeAutoTour,
      onSkipStory: () => {
        skipStory();
      },
      onPreviousScene: () => {
        previousScene();
      },
      onNextScene: () => {
        nextScene();
      },
      onExitAutoTour: stopAutoTour,
      onListenInLocale: setLocale,
    }),
    [
      nextScene,
      onEnableAudio,
      pauseAutoTour,
      pauseNarration,
      playNarration,
      previousScene,
      resumeNarration,
      resumeAutoTour,
      seekNarration,
      setMasterMuted,
      skipStory,
      startAutoTour,
      stopAutoTour,
      onToggleMasterMute,
    ],
  );

  if (!manifest) {
    return <ManifestState kind={manifestQuery.isPending ? 'loading' : 'error'} />;
  }

  const selectedDestination = composePanoramaTourDestination(
    destinations.find((candidate) => candidate.id === navigation.selectedLocationId) ??
      manifest.destination,
    panoramaTourSource,
  );
  const selectedAnchor = destinationAnchors.find(
    (anchor) => anchor.id === navigation.selectedLocationId,
  );
  const hasDestinationScopedSelected3D =
    isDestinationScopedSelected3D && destinationAnchors.length > 0;
  const selectedAnchorHasPanorama = Boolean(
    selectedAnchor && resolvePanoramaSceneForAnchor(selectedAnchor, manifest.panoramaNodes),
  );
  const canEnterDestinationPanorama =
    selectedDestination.defaultSceneId !== null &&
    (selectedDestination.id !== manifest.destination.id ||
      Boolean(
        manifest.panoramaNodes.find((node) => node.id === selectedDestination.defaultSceneId) &&
        isPanoramaSceneUsable(
          manifest.panoramaNodes.find((node) => node.id === selectedDestination.defaultSceneId)!,
        ),
      ));
  const canEnterSelectedPanorama = hasDestinationScopedSelected3D
    ? selectedAnchorHasPanorama
    : canEnterDestinationPanorama;
  const selected3DViewpointRail = hasDestinationScopedSelected3D
    ? {
        anchors: destinationAnchors.map((anchor) => ({
          id: anchor.id,
          label: anchor.label,
          ...(anchor.shortLabel ? { shortLabel: anchor.shortLabel } : {}),
          hasPanorama: Boolean(resolvePanoramaSceneForAnchor(anchor, manifest.panoramaNodes)),
        })),
        selectedAnchorId: selectedAnchor?.id ?? destinationAnchors[0]?.id ?? '',
        isTransitioning: isCameraTransitioning,
        onSelectAnchor: selectLocation,
        onOpenPanorama: (anchorId: string) => {
          const anchor = destinationAnchors.find((candidate) => candidate.id === anchorId);
          const panoramaScene = anchor
            ? resolvePanoramaSceneForAnchor(anchor, manifest.panoramaNodes)
            : null;
          if (anchor && panoramaScene) {
            selectLocation(anchor.id);
            onEnterPanorama(panoramaScene.id);
          }
        },
      }
    : undefined;

  const deepLinkForPresentation = decodeImmersiveDeepLink(`${location.pathname}${location.search}`);
  const failedSceneForPresentation =
    navigation.mode === 'panorama' &&
    navigation.panoramaStatus === 'error' &&
    navigation.committedSceneId === null
      ? resolveSceneId(manifest, deepLinkForPresentation?.sceneId ?? null)
      : null;
  const presentationSceneId = failedSceneForPresentation ?? navigation.committedSceneId;
  const currentPanoramaNode =
    panoramaRenderableNodes.find(
      (node) => node.id === (navigation.requestedSceneId ?? presentationSceneId),
    ) ?? null;
  const panoramaTargetView = navigation.requestedSceneId
    ? (navigation.requestedView ?? currentPanoramaNode?.initialView ?? navigation.committedView)
    : navigation.committedView;
  const selectedLocationPreset =
    navigation.selectedLocationPreset ??
    mapLocations.find((candidate) => candidate.id === navigation.selectedLocationId)
      ?.cameraPreset ??
    routeLocation?.cameraPreset;
  const view = buildImmersiveView(
    manifest,
    destinationSlug,
    navigation,
    selectedDestination,
    failedSceneForPresentation ?? navigation.committedSceneId,
  );
  const selectedHotspot = view.hotspots.find(
    (hotspot) => hotspot.id === navigation.selectedHotspotId,
  );
  const selectedHotspotType =
    selectedHotspot?.type === 'information' ||
    selectedHotspot?.type === 'media' ||
    selectedHotspot?.type === 'audio'
      ? selectedHotspot.type
      : null;
  const referenceParityPresentation =
    navigation.mode === 'panorama'
      ? buildReferenceParityPresentationVm({
          destination: manifest.destination,
          nodes: manifest.panoramaNodes,
          currentSceneId: presentationSceneId,
          visitedSceneIds: navigation.visitedSceneIds,
          status: navigation.panoramaStatus,
          isTransitioning: navigation.transition === 'navigating-scene',
          locale,
          audioState,
          audioTracks,
          autoTour: autoTourState,
          hotspots: view.hotspots,
        })
      : undefined;
  const committedPanoramaNode =
    panoramaRenderableNodes.find((node) => node.id === presentationSceneId) ?? null;
  const mediaDockVm =
    referenceParityPresentation &&
    !referenceParityPresentation.mediaUnavailable &&
    committedPanoramaNode
      ? buildImmersiveMediaDockVm({
          mode: autoTourState.isActive ? 'auto-tour' : 'free-explore',
          scene: committedPanoramaNode,
          tourEligibleNodes: panoramaRenderableNodes,
          currentSceneId: committedPanoramaNode.id,
          destinationAmbientTrackId:
            audioTracks.find((track) => track.type === 'ambient')?.id ?? null,
          locale,
          audioTracks,
          canPlayTrack: audioTour.canPlayTrack,
          audioState,
          autoTour: {
            isActive: autoTourState.isActive,
            isPaused: autoTourState.isPaused,
            phase: autoTourState.phase,
            currentSceneId: autoTourState.currentSceneId,
            capabilities: {
              canStart:
                !autoTourState.isActive &&
                Boolean(navigation.committedSceneId) &&
                panoramaRenderableNodes.length > 1,
              canPause: autoTourState.isActive && !autoTourState.isPaused,
              canResume: autoTourState.isActive && autoTourState.isPaused,
              canSkipStory: autoTourController.canSkipStory(),
              canPrevious: autoTourController.canPrevious(),
              canNext: autoTourController.canNext(),
              canExit: autoTourState.isActive,
            },
          },
          captionsEnabled,
        })
      : undefined;
  const rendererContent = (
    <RendererHost
      activeRenderer={navigation.activeRenderer}
      engine={activeEngine}
      hotspots={view.hotspots}
      initialView={panoramaTargetView}
      locations={mapLocations}
      mode={navigation.mode}
      onHotspotSelect={actions.onSelectHotspot}
      onCameraTransitionChange={setIsCameraTransitioning}
      onLocationSelected={selectLocation}
      onNodeChange={onRendererNodeChange}
      onStatusChange={(status, statusNodeId) => {
        const state = useImmersiveNavigation.getState();
        if (state.activeRenderer === 'panorama' && statusNodeId) {
          const isCurrentScene =
            state.requestedSceneId === statusNodeId || state.committedSceneId === statusNodeId;
          const isInitialRendererReady =
            status === 'ready' &&
            state.committedSceneId === null &&
            state.requestedSceneId === null;
          if (!isCurrentScene && !isInitialRendererReady) {
            return;
          }
        }
        if (
          state.activeRenderer === 'panorama' &&
          statusNodeId &&
          state.requestedSceneId &&
          statusNodeId !== state.requestedSceneId
        ) {
          return;
        }
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
                autoTourController.onSceneCommitted(requestedSceneId);
                writeDeepLink(
                  navigate,
                  destinationSlug,
                  true,
                  trustedExploreReturnHref,
                  location.state,
                  expectedDeepLinkRef,
                );
              }
            }
          } else if (status === 'error' || status === 'unavailable') {
            const hadCommittedScene = state.committedSceneId !== null;
            const failedSceneId = requestedSceneId;
            const committedSceneId = state.committedSceneId;
            state.rollbackSceneTransition(transitionId);
            if (hadCommittedScene) {
              if (failedSceneId && committedSceneId) {
                if (status === 'error') {
                  autoTourController.onSceneTransitionFailed(failedSceneId, committedSceneId);
                } else {
                  autoTourController.onSceneTransitionUnavailable(failedSceneId, committedSceneId);
                }
              }
              writeDeepLink(
                navigate,
                destinationSlug,
                true,
                trustedExploreReturnHref,
                location.state,
                expectedDeepLinkRef,
              );
            }
            if (!hadCommittedScene && status === 'unavailable') {
              state.markPanoramaUnavailable();
            }
          }
        }
        if (
          state.activeRenderer !== 'none' &&
          !(
            state.activeRenderer === 'panorama' &&
            requestedSceneId &&
            (status === 'error' || status === 'unavailable')
          )
        ) {
          state.setRendererStatus(state.activeRenderer, status);
        }
      }}
      onViewChange={(nextView) => {
        useImmersiveNavigation.getState().updateView(nextView);
        scheduleUrlSync();
      }}
      panoramaNode={currentPanoramaNode}
      panoramaNodes={panoramaRenderableNodes}
      cameraPreset={selectedLocationPreset}
      retryKey={retryKey}
    />
  );

  return (
    <>
      <ExploreShell
        actions={actions}
        canEnterPanorama={canEnterSelectedPanorama}
        isSceneTransitioning={navigation.transition === 'navigating-scene'}
        locale={locale}
        map3dLocations={mapLocations}
        minimapEngine={navigation.mode === 'panorama' ? activeMinimapEngine : null}
        onLanguageToggle={() => onLocaleChange(locale === 'vi' ? 'en' : 'vi')}
        onLocationSelected={selectLocation}
        showLocationBrowser={!isDestinationScopedSelected3D}
        rendererContent={rendererContent}
        hasPanoramaTourControls={referenceParityPresentation !== undefined}
        selectedLocationId={navigation.selectedLocationId}
        {...(selected3DViewpointRail ? { selected3DViewpointRail } : {})}
        view={view}
      />
      {navigation.mode === 'panorama' ? (
        referenceParityPresentation ? (
          <>
            <ReferenceParityControls
              vm={referenceParityPresentation}
              actions={referenceParityActions}
              minimapOpen={navigation.minimapOpen}
            />
            {mediaDockVm ? (
              <ImmersiveMediaDock vm={mediaDockVm} actions={mediaDockActions} />
            ) : null}
          </>
        ) : (
          <ImmersiveControlsGroup
            currentSceneId={navigation.committedSceneId}
            destinations={destinationSearchResults}
            links={view.links}
            locale={locale}
            nodes={view.nodes}
            destinationName={manifest.destination.name}
            searchLoading={shouldFetchDestinations && destinationsQuery.isPending}
            onLocaleChange={onLocaleChange}
            onNavigateScene={actions.onNavigateScene}
            onSearchDestination={setDestinationSearchQuery}
            onSelectDestination={onSelectDestination}
          />
        )
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
