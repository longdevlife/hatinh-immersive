import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine, type PanoramaNode, type PanoramaView } from '../../panorama';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import { createFakeImmersiveManifest } from '../fake-mode/manifest';
import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import { useImmersiveNavigation } from '../index';
import { ImmersiveExperience, type ImmersiveExperienceFactories } from './ImmersiveExperience';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function RoutedImmersiveExperience({
  destinations,
  factories,
  manifests,
}: {
  destinations: DestinationPreviewVm[];
  factories: ImmersiveExperienceFactories;
  manifests: Record<string, ImmersiveManifestVm>;
}) {
  const { destinationSlug = '' } = useParams<{ destinationSlug: string }>();
  const manifest = manifests[destinationSlug];

  return manifest ? (
    <ImmersiveExperience destinations={destinations} factories={factories} manifest={manifest} />
  ) : null;
}

function DestinationDetailRoute() {
  const { destinationSlug = '' } = useParams<{ destinationSlug: string }>();

  return <main data-testid="destination-detail">Destination detail: {destinationSlug}</main>;
}

function renderRoutedExperience(
  initialEntry: string,
  factories: ImmersiveExperienceFactories,
  manifests: Record<string, ImmersiveManifestVm>,
  destinations: DestinationPreviewVm[],
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/explore/:destinationSlug" element={<DestinationDetailRoute />} />
          <Route
            path="/explore/:destinationSlug/immersive"
            element={
              <RoutedImmersiveExperience
                destinations={destinations}
                factories={factories}
                manifests={manifests}
              />
            }
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderExperience(
  initialEntry: string,
  factories: ImmersiveExperienceFactories,
  manifest = createFakeImmersiveManifest(),
  destinations?: DestinationPreviewVm[],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/explore/:destinationSlug"
            element={
              <ImmersiveExperience
                factories={factories}
                manifest={manifest}
                {...(destinations === undefined ? {} : { destinations })}
              />
            }
          />
          <Route
            path="/explore/:destinationSlug/immersive"
            element={
              <ImmersiveExperience
                factories={factories}
                manifest={manifest}
                {...(destinations === undefined ? {} : { destinations })}
              />
            }
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createFactories(panorama = new FakePanoramaEngine(), map3d = new FakeMap3DEngine()) {
  const minimap = new FakeMinimapEngine();

  const factories: ImmersiveExperienceFactories = {
    createMap3DEngine: vi.fn(async () => map3d),
    createMinimapEngine: vi.fn(async () => minimap),
    createPanoramaEngine: vi.fn(async () => panorama),
  };

  return { factories, map3d, minimap, panorama };
}

class PendingLocationsTimingMap3DEngine extends FakeMap3DEngine {
  private resolveLocationsStarted!: () => void;
  private resolveLocations!: () => void;
  readonly locationsStarted = new Promise<void>((resolve) => {
    this.resolveLocationsStarted = resolve;
  });
  private readonly locationsPending = new Promise<void>((resolve) => {
    this.resolveLocations = resolve;
  });
  readonly flightTimes: number[] = [];

  override async setLocations(locations: Parameters<FakeMap3DEngine['setLocations']>[0]) {
    await super.setLocations(locations);
    this.resolveLocationsStarted();
    await this.locationsPending;
  }

  override async flyTo(preset: Parameters<FakeMap3DEngine['flyTo']>[0]) {
    this.flightTimes.push(Date.now());
    await super.flyTo(preset);
  }

  releaseLocations() {
    this.resolveLocations();
  }
}

class DeferredPanoramaEngine extends FakePanoramaEngine {
  readonly loadRequests = new Map<
    string,
    { node: PanoramaNode; reject(): void; resolve(): void }
  >();

  override loadNode(node: PanoramaNode) {
    this.calls.push({ type: 'loadNode', node });

    return new Promise<void>((resolve, reject) => {
      this.loadRequests.set(node.id, {
        node,
        reject: () => reject(new Error(`Unable to load ${node.id}`)),
        resolve: () => {
          this.loadedNode = node;
          this.currentView = node.initialView;
          resolve();
        },
      });
    });
  }
}

class NativeNavigatingPanoramaEngine extends FakePanoramaEngine {
  private readonly nodeListeners = new Set<(nodeId: string, view?: PanoramaView) => void>();

  subscribeNodeChanged(listener: (nodeId: string, view?: PanoramaView) => void) {
    this.nodeListeners.add(listener);
    return () => {
      this.nodeListeners.delete(listener);
    };
  }

  emitNativeNodeChange(node: PanoramaNode, view: PanoramaView) {
    this.loadedNode = node;
    this.currentView = view;
    for (const listener of this.nodeListeners) {
      listener(node.id, view);
    }
  }
}

describe('ImmersiveExperience', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useImmersiveNavigation.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts the overview renderer, then hands off to one panorama renderer', async () => {
    const { factories, map3d, minimap, panorama } = createFactories();
    renderExperience('/explore/son-trang-co-dam/immersive?mode=overview3d', factories);

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true);
    });
    expect(factories.createMap3DEngine).toHaveBeenCalledTimes(1);
    expect(factories.createPanoramaEngine).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Khám phá 360°/ }));

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
      expect(minimap.calls.some((call) => call.type === 'mount')).toBe(true);
    });
    expect(screen.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeInTheDocument();
    expect(factories.createPanoramaEngine).toHaveBeenCalledTimes(1);
    expect(factories.createMinimapEngine).toHaveBeenCalledTimes(1);
    expect(map3d.calls.at(-1)).toEqual({ type: 'destroy' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01&h=0&p=0&fov=90',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));

    await waitFor(() => {
      expect(panorama.calls.filter((call) => call.type === 'loadNode')).toHaveLength(2);
    });
    expect(panorama.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    expect(panorama.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);
  });

  it('keeps the 3D overview available when no panorama media is ready yet', async () => {
    const { factories, map3d } = createFactories();
    const manifest = { ...createFakeImmersiveManifest(), panoramaNodes: [] };

    renderExperience('/explore/son-trang-co-dam/immersive?mode=overview3d', factories, manifest);

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true);
    });
    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
    expect(screen.getAllByText('360° đang được chuẩn bị')).toHaveLength(1);
  });

  it('routes a Google 3D marker selection through the location selection state', async () => {
    const { factories, map3d } = createFactories();
    renderExperience('/explore/son-trang-co-dam/immersive?mode=overview3d', factories);

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'setLocations')).toBe(true);
    });

    act(() => {
      map3d.emitLocationSelected('destination-son-trang-co-dam');
    });

    await waitFor(() => {
      expect(useImmersiveNavigation.getState()).toMatchObject({
        mode: 'overview3d',
        selectedLocationId: 'destination-son-trang-co-dam',
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-son-trang-co-dam',
      );
    });
  });

  it('derives a deterministic camera preset for destinations without a curated override', async () => {
    const { factories, map3d } = createFactories();
    const manifest = createFakeImmersiveManifest();
    const destinationWithoutPreset: DestinationPreviewVm = {
      id: 'destination-without-preset',
      slug: 'without-preset',
      name: 'Điểm không có góc máy',
      summary: 'Dùng góc máy mặc định trên bản đồ 3D.',
      coverImageUrl: null,
      categoryLabel: 'Thiên nhiên',
      defaultSceneId: null,
      geoPoint: { latitude: 18.4, longitude: 105.9 },
    };

    renderExperience('/explore/son-trang-co-dam/immersive?mode=overview3d', factories, manifest, [
      manifest.destination,
      destinationWithoutPreset,
    ]);

    await waitFor(() => {
      expect(map3d.calls.filter((call) => call.type === 'setLocations')).toHaveLength(1);
    });

    expect(map3d.calls.filter((call) => call.type === 'setLocations').at(-1)).toEqual({
      type: 'setLocations',
      locations: [
        expect.objectContaining({
          id: manifest.destination.id,
          cameraPreset: {
            center: { lat: 18.3421, lng: 105.9032, altitude: 420 },
            heading: 32,
            tilt: 48,
            range: 1800,
          },
        }),
        expect.objectContaining({
          id: destinationWithoutPreset.id,
          cameraPreset: {
            center: { lat: 18.4, lng: 105.9, altitude: 0 },
            heading: 0,
            tilt: 55,
            range: 1200,
          },
        }),
      ],
    });
    const flightCount = map3d.calls.filter((call) => call.type === 'flyTo').length;

    act(() => map3d.emitLocationSelected(destinationWithoutPreset.id));

    await waitFor(() => {
      expect(useImmersiveNavigation.getState().selectedLocationId).toBe(
        destinationWithoutPreset.id,
      );
      expect(map3d.calls.filter((call) => call.type === 'flyTo')).toHaveLength(flightCount + 1);
      expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toMatchObject({
        preset: {
          center: { lat: 18.4, lng: 105.9, altitude: 0 },
          heading: 0,
          tilt: 55,
          range: 1200,
        },
      });
    });
  });

  it('flies one persistent 3D map through marker selections without changing destination route', async () => {
    const { factories, map3d } = createFactories();
    const manifest = createFakeImmersiveManifest();
    const locations: DestinationPreviewVm[] = [
      manifest.destination,
      {
        id: 'destination-b',
        slug: 'location-b',
        name: 'Điểm B',
        summary: 'Điểm B tại Hà Tĩnh.',
        coverImageUrl: null,
        categoryLabel: 'Thiên nhiên',
        defaultSceneId: 'scene-b',
        geoPoint: { latitude: 18.4, longitude: 105.9 },
        cameraPreset: {
          center: { lat: 18.4, lng: 105.9, altitude: 240 },
          heading: 110,
          tilt: 50,
          range: 1200,
        },
      },
      {
        id: 'destination-c',
        slug: 'location-c',
        name: 'Điểm C',
        summary: 'Điểm C tại Hà Tĩnh.',
        coverImageUrl: null,
        categoryLabel: 'Văn hóa',
        defaultSceneId: 'scene-c',
        geoPoint: { latitude: 18.5, longitude: 106 },
        cameraPreset: {
          center: { lat: 18.5, lng: 106, altitude: 260 },
          heading: 205,
          tilt: 46,
          range: 1300,
        },
      },
    ];

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      manifest,
      locations,
    );

    await waitFor(() => {
      expect(map3d.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
      expect(map3d.calls.some((call) => call.type === 'setLocations')).toBe(true);
    });

    act(() => map3d.emitLocationSelected('destination-b'));

    await waitFor(() => {
      expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toMatchObject({
        preset: { center: { lat: 18.4, lng: 105.9 } },
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-b',
      );
    });

    act(() => map3d.emitLocationSelected('destination-c'));

    await waitFor(() => {
      expect(map3d.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
      expect(map3d.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);
      expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toMatchObject({
        preset: { center: { lat: 18.5, lng: 106 } },
      });
      expect(screen.getByRole('heading', { name: 'Điểm C' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=overview3d&location=destination-c',
      );
    });
  });

  it('flies to a selected marker within 100ms without remounting the 3D map', async () => {
    vi.useFakeTimers();
    const map3d = new PendingLocationsTimingMap3DEngine();
    const { factories } = createFactories(undefined, map3d);
    const manifest = getDemoManifest('bien-thien-cam');
    const locations = DEMO_DESTINATIONS.map(({ preview }) => preview);

    renderExperience(
      '/explore/bien-thien-cam/immersive?mode=overview3d',
      factories,
      manifest,
      locations,
    );

    try {
      await map3d.locationsStarted;
      await act(async () => {
        await Promise.resolve();
      });

      expect(map3d.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
      expect(map3d.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);
      for (const destination of DEMO_DESTINATIONS.slice(1)) {
        const flightsBeforeSelection = map3d.flightTimes.length;
        const selectedAt = Date.now();

        act(() => map3d.emitLocationSelected(destination.location.id));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
        });

        expect(map3d.flightTimes).toHaveLength(flightsBeforeSelection + 1);
        expect(map3d.flightTimes.at(-1)! - selectedAt).toBeLessThanOrEqual(100);
        expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toMatchObject({
          preset: destination.location.cameraPreset,
        });
      }

      expect(map3d.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/bien-thien-cam/immersive?mode=overview3d&location=dong-loc-junction',
      );
    } finally {
      await act(async () => {
        map3d.releaseLocations();
        await Promise.resolve();
      });
    }
  });

  it('enters the selected destination tour and exits to its destination detail path', async () => {
    const { factories, map3d, panorama } = createFactories();
    const manifestA = createFakeImmersiveManifest();
    const destinationB: DestinationPreviewVm = {
      id: 'destination-b',
      slug: 'location-b',
      name: 'Điểm B',
      summary: 'Điểm B tại Hà Tĩnh.',
      coverImageUrl: null,
      categoryLabel: 'Thiên nhiên',
      defaultSceneId: 'scene-b',
      geoPoint: { latitude: 18.4, longitude: 105.9 },
      cameraPreset: {
        center: { lat: 18.4, lng: 105.9, altitude: 240 },
        heading: 110,
        tilt: 50,
        range: 1200,
      },
    };
    const sourceScene = manifestA.nodes[0]!;
    const sourcePanorama = manifestA.panoramaNodes[0]!;
    const destinationBEntryView = { heading: 137, pitch: -8, fov: 76 };
    const manifestB: ImmersiveManifestVm = {
      destination: destinationB,
      defaultSceneId: 'scene-b',
      overviewTarget: {
        lat: 18.4,
        lng: 105.9,
        altitude: 120,
        heading: 0,
        tilt: 55,
        range: 900,
      },
      nodes: [{ ...sourceScene, id: 'scene-b', name: 'Toàn cảnh Điểm B', lat: 18.4, lng: 105.9 }],
      panoramaNodes: [
        {
          ...sourcePanorama,
          id: 'scene-b',
          name: 'Toàn cảnh Điểm B',
          lat: 18.4,
          lng: 105.9,
          initialView: destinationBEntryView,
          links: [],
        },
      ],
      links: [],
      hotspots: [],
    };
    const destinations = [manifestA.destination, destinationB];

    renderRoutedExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      {
        'son-trang-co-dam': manifestA,
        'location-b': manifestB,
      },
      destinations,
    );

    await waitFor(() => expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true));
    act(() => map3d.emitLocationSelected(destinationB.id));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: destinationB.name })).toBeVisible(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));

    await waitFor(() => {
      expect(panorama.loadedNode?.id).toBe('scene-b');
      expect(panorama.currentView).toEqual(destinationBEntryView);
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/location-b/immersive?mode=panorama&location=destination-b&scene=scene-b&h=137&p=-8&fov=76',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại Điểm B' }));

    await waitFor(() => {
      expect(screen.getByTestId('destination-detail')).toHaveTextContent('location-b');
      expect(screen.getByTestId('location')).toHaveTextContent('/explore/location-b');
    });
  });

  it('enters the real Nguyễn Du demo tour and exits to its destination detail path', async () => {
    const { factories, map3d, panorama } = createFactories();
    const thienCamManifest = getDemoManifest('bien-thien-cam');
    const nguyenDuManifest = getDemoManifest('khu-luu-niem-nguyen-du');
    const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

    renderRoutedExperience(
      '/explore/bien-thien-cam/immersive?mode=overview3d',
      factories,
      {
        'bien-thien-cam': thienCamManifest,
        'khu-luu-niem-nguyen-du': nguyenDuManifest,
      },
      destinations,
    );

    await waitFor(() => expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true));
    act(() => map3d.emitLocationSelected('nguyen-du-memorial'));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Khu lưu niệm Nguyễn Du' })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));

    await waitFor(() => {
      expect(panorama.loadedNode?.id).toBe('nguyen-du-courtyard');
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/khu-luu-niem-nguyen-du/immersive?mode=panorama&location=nguyen-du-memorial&scene=nguyen-du-courtyard',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại Khu lưu niệm Nguyễn Du' }));

    await waitFor(() => {
      expect(screen.getByTestId('destination-detail')).toHaveTextContent('khu-luu-niem-nguyen-du');
      expect(screen.getByTestId('location')).toHaveTextContent('/explore/khu-luu-niem-nguyen-du');
    });
  });

  it('restores the linked scene and camera after a refresh', async () => {
    const { factories, panorama } = createFactories();
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-02&h=123.4&p=-7&fov=82',
      factories,
    );

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
    });

    expect(screen.getByRole('heading', { name: 'Lối đi di sản 2' })).toBeInTheDocument();
    expect(panorama.currentView).toEqual({ heading: 123.4, pitch: -7, fov: 82 });
    expect(useImmersiveNavigation.getState()).toMatchObject({
      mode: 'panorama',
      sceneId: 'scene-02',
      view: { heading: 123.4, pitch: -7, fov: 82 },
    });
  });

  it('keeps the current scene when the next panorama fails', async () => {
    const { factories, panorama } = createFactories();
    const loadNode = panorama.loadNode.bind(panorama);
    vi.spyOn(panorama, 'loadNode').mockImplementation(async (node) => {
      if (node.id === 'scene-02') {
        throw new Error('tile failed');
      }

      return loadNode(node);
    });

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      factories,
    );

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
      expect(useImmersiveNavigation.getState().sceneId).toBe('scene-01');
    });
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01&h=0&p=0&fov=90',
      );
    });
  });

  it('keeps current and duplicate pending scene selections idempotent', async () => {
    const panorama = new DeferredPanoramaEngine();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=12&p=-3&fov=84',
      factories,
    );

    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-01')).toBeDefined();
    });
    panorama.loadRequests.get('scene-01')?.resolve();
    await waitFor(() => {
      expect(useImmersiveNavigation.getState().panoramaStatus).toBe('ready');
    });

    const committedState = useImmersiveNavigation.getState();
    const committedLoadCount = panorama.calls.filter((call) => call.type === 'loadNode').length;
    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 1' }));

    expect(useImmersiveNavigation.getState()).toBe(committedState);
    expect(panorama.calls.filter((call) => call.type === 'loadNode')).toHaveLength(
      committedLoadCount,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));
    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-02')).toBeDefined();
    });
    const pendingState = useImmersiveNavigation.getState();
    const pendingLoadCount = panorama.calls.filter((call) => call.type === 'loadNode').length;

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));

    expect(useImmersiveNavigation.getState()).toBe(pendingState);
    expect(panorama.calls.filter((call) => call.type === 'loadNode')).toHaveLength(
      pendingLoadCount,
    );

    panorama.loadRequests.get('scene-02')?.resolve();
    await waitFor(() => {
      expect(useImmersiveNavigation.getState()).toMatchObject({
        committedSceneId: 'scene-02',
        panoramaStatus: 'ready',
        requestedSceneId: null,
        transitionId: pendingState.transitionId,
      });
    });
  });

  it('keeps A committed when B resolves after C is requested and C fails', async () => {
    const panorama = new DeferredPanoramaEngine();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      factories,
    );

    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-01')).toBeDefined();
    });
    panorama.loadRequests.get('scene-01')?.resolve();

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));
    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-02')).toBeDefined();
    });

    act(() => {
      useImmersiveNavigation.getState().navigateToScene('scene-03');
    });
    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-03')).toBeDefined();
    });

    panorama.loadRequests.get('scene-02')?.resolve();
    panorama.loadRequests.get('scene-03')?.reject();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
      expect(useImmersiveNavigation.getState()).toMatchObject({
        committedSceneId: 'scene-01',
        requestedSceneId: null,
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01&h=0&p=0&fov=90',
      );
    });
  });

  it('keeps the committed URL while a requested panorama is pending', async () => {
    const panorama = new DeferredPanoramaEngine();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      factories,
    );

    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-01')).toBeDefined();
    });
    panorama.loadRequests.get('scene-01')?.resolve();

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));

    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-02')).toBeDefined();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
    );

    panorama.loadRequests.get('scene-02')?.resolve();

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-02&h=31&p=-2&fov=88',
      );
    });
    expect(panorama.currentView).toEqual({ heading: 31, pitch: -2, fov: 88 });
    expect(useImmersiveNavigation.getState().committedView).toEqual({
      heading: 31,
      pitch: -2,
      fov: 88,
    });
  });

  it('commits a native tour scene with the renderer camera before syncing the URL', async () => {
    const panorama = new NativeNavigatingPanoramaEngine();
    const manifest = createFakeImmersiveManifest();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&h=12&p=-3&fov=84',
      factories,
    );

    await waitFor(() => {
      expect(panorama.loadedNode?.id).toBe('scene-01');
    });

    const targetNode = manifest.panoramaNodes.find((node) => node.id === 'scene-02');
    expect(targetNode).toBeDefined();
    const rendererView = { heading: 214, pitch: -6, fov: 73 };

    await act(async () => {
      panorama.emitNativeNodeChange(targetNode!, rendererView);
    });

    await waitFor(() => {
      expect(useImmersiveNavigation.getState()).toMatchObject({
        committedSceneId: 'scene-02',
        committedView: rendererView,
        requestedSceneId: null,
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-02&h=214&p=-6&fov=73',
      );
    });
    expect(panorama.currentView).toEqual(rendererView);
    expect(
      panorama.calls.filter((call) => call.type === 'loadNode' && call.node.id === targetNode!.id),
    ).toHaveLength(0);
  });
});
