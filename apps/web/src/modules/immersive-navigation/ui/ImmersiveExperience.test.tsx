import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine, type Selected3DAnchor } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine, type PanoramaNode, type PanoramaView } from '../../panorama';
import type { DestinationPreviewVm } from '../../../shared/contracts';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import { SON_TRANG_SELECTED_3D_ANCHORS } from '../fake-mode/selected-3d-demo-anchors';
import { createFakeImmersiveManifest } from '../fake-mode/manifest';
import type { Selected3DAnchorSource } from '../model/selected-3d-anchor-source';
import { useImmersiveNavigation } from '../index';
import { ImmersiveExperience, type ImmersiveExperienceFactories } from './ImmersiveExperience';

function LocationProbe() {
  const location = useLocation();
  const navigationType = useNavigationType();
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <output data-testid="navigation-type">{navigationType}</output>
    </>
  );
}

function renderExperience(
  initialEntry: string,
  factories: ImmersiveExperienceFactories,
  manifest = createFakeImmersiveManifest(),
  destinations?: DestinationPreviewVm[],
  selected3DAnchors: readonly Selected3DAnchor[] = [],
  selected3DAnchorSource: Selected3DAnchorSource = 'none',
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
                selected3DAnchors={selected3DAnchors}
                selected3DAnchorSource={selected3DAnchorSource}
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
                selected3DAnchors={selected3DAnchors}
                selected3DAnchorSource={selected3DAnchorSource}
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
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01&h=0&p=0&fov=90',
      );
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

  it('replaces a selected-3D to panorama handoff so exit does not reopen an intermediate 3D entry', async () => {
    const { factories } = createFactories();
    renderExperience('/explore/son-trang-co-dam/immersive?mode=overview3d', factories);

    await screen.findByRole('button', { name: /Khám phá 360°/ });
    fireEvent.click(screen.getByRole('button', { name: /Khám phá 360°/ }));

    await waitFor(() => {
      expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE');
    });
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

  it('uses the selected local anchor mapping as the only 360 handoff', async () => {
    const { factories, map3d, panorama } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');
    const mappedAnchors = SON_TRANG_SELECTED_3D_ANCHORS;

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      mappedAnchors,
    );

    await waitFor(() => expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true));
    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở 360° cho Cổng' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở 360° cho Cổng' }));

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
      expect(useImmersiveNavigation.getState()).toMatchObject({
        mode: 'panorama',
        committedSceneId: 'son-trang-gate',
        requestedSceneId: null,
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        'mode=panorama&location=son-trang-gate&scene=son-trang-gate',
      );
    });
  });

  it('routes a Google 3D marker selection through the location selection state', async () => {
    const { factories, map3d } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');
    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      SON_TRANG_SELECTED_3D_ANCHORS,
    );

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'setLocations')).toBe(true);
    });

    act(() => {
      map3d.emitLocationSelected('son-trang-culture');
    });

    await waitFor(() => {
      expect(useImmersiveNavigation.getState()).toMatchObject({
        mode: 'overview3d',
        destinationId: 'son-trang-co-dam',
        selectedLocationId: 'son-trang-culture',
      });
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-culture',
      );
    });

    expect(map3d.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toEqual({
      type: 'flyTo',
      preset: SON_TRANG_SELECTED_3D_ANCHORS[1].cameraPreset,
    });
  });

  it.each([
    ['missing', '/explore/son-trang-co-dam/immersive?mode=overview3d'],
    [
      'destination id',
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-co-dam',
    ],
    ['invalid id', '/explore/son-trang-co-dam/immersive?mode=overview3d&location=unknown-anchor'],
    [
      'foreign destination anchor',
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=foreign-anchor',
    ],
  ])(
    'canonicalizes a %s selected-3D location to Cổng with replace semantics',
    async (_case, url) => {
      const { factories, map3d } = createFactories();
      const manifest = getDemoManifest('son-trang-co-dam');
      const foreignAnchor: Selected3DAnchor = {
        ...SON_TRANG_SELECTED_3D_ANCHORS[0],
        id: 'foreign-anchor',
        destinationId: 'another-destination',
      };

      renderExperience(
        url,
        factories,
        manifest,
        DEMO_DESTINATIONS.map(({ preview }) => preview),
        [...SON_TRANG_SELECTED_3D_ANCHORS, foreignAnchor],
      );

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent(
          '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-gate',
        );
      });
      expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE');
      expect(screen.getByRole('button', { name: 'Cổng' })).toHaveAttribute('aria-pressed', 'true');
      expect(useImmersiveNavigation.getState().selectedLocationId).toBe('son-trang-gate');
      await waitFor(() => {
        expect(map3d.calls.filter((call) => call.type === 'flyTo').at(-1)).toEqual({
          type: 'flyTo',
          preset: SON_TRANG_SELECTED_3D_ANCHORS[0].cameraPreset,
        });
      });
    },
  );

  it('preserves a valid local-anchor deep link without replacing it', async () => {
    const { factories } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-culture',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      SON_TRANG_SELECTED_3D_ANCHORS,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Văn hóa' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-culture',
    );
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('POP');
  });

  it('replaces selected-3D anchor URLs instead of adding browser-history entries', async () => {
    const { factories } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d&location=son-trang-gate',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      SON_TRANG_SELECTED_3D_ANCHORS,
    );

    await screen.findByRole('navigation', { name: 'Các góc nhìn 3D' });
    fireEvent.click(screen.getByRole('button', { name: 'Văn hóa' }));

    await waitFor(() => {
      expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE');
    });
  });

  it('canonicalizes an invalid panorama scene and location with replace semantics', async () => {
    const { factories } = createFactories();
    const manifest = getDemoManifest('bien-thien-cam');
    const returnTo = '/explore?q=bi%E1%BB%83n&destination=bien-thien-cam&view=map';

    renderExperience(
      `/explore/bien-thien-cam/immersive?mode=panorama&location=unknown&scene=missing&returnTo=${encodeURIComponent(returnTo)}`,
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/explore/bien-thien-cam/immersive?mode=panorama&location=thien-cam-beach&scene=thien-cam-boardwalk&h=0&p=0&fov=90&returnTo=${encodeURIComponent(returnTo)}`,
      );
    });
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE');
  });

  it('preserves the trusted Explore context when panorama search opens another destination', async () => {
    const { factories } = createFactories();
    const returnTo = '/explore?q=Nguy%E1%BB%85n&destination=son-trang-co-dam&view=map';

    renderExperience(
      `/explore/son-trang-co-dam/immersive?mode=panorama&scene=scene-01&returnTo=${encodeURIComponent(returnTo)}`,
      factories,
      getDemoManifest('son-trang-co-dam'),
      DEMO_DESTINATIONS.map(({ preview }) => preview),
    );

    await screen.findByRole('button', { name: 'Mở tìm kiếm' });
    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Nhập tên điểm đến' }), {
      target: { value: 'Nguyễn' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Khu lưu niệm Nguyễn Du/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Khu lưu niệm Nguyễn Du/ }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      `/explore/khu-luu-niem-nguyen-du?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('only registers the four local Sơn Trang anchors in selected 3D', async () => {
    const { factories, map3d } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      SON_TRANG_SELECTED_3D_ANCHORS,
    );

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'setLocations')).toBe(true);
    });

    expect(map3d.calls.filter((call) => call.type === 'setLocations').at(-1)).toEqual({
      type: 'setLocations',
      locations: SON_TRANG_SELECTED_3D_ANCHORS.map((anchor) =>
        expect.objectContaining({ id: anchor.id, label: anchor.label }),
      ),
    });
    expect(screen.queryByRole('button', { name: 'Điểm nhìn ngoại lai' })).not.toBeInTheDocument();
  });

  it('does not expose a foreign destination anchor in the local rail', async () => {
    const { factories } = createFactories();
    const manifest = getDemoManifest('son-trang-co-dam');
    const foreignAnchor = {
      ...SON_TRANG_SELECTED_3D_ANCHORS[0],
      id: 'foreign-anchor',
      destinationId: 'another-destination',
      label: 'Điểm nhìn ngoại lai',
      shortLabel: 'Ngoại lai',
    };

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      manifest,
      DEMO_DESTINATIONS.map(({ preview }) => preview),
      [...SON_TRANG_SELECTED_3D_ANCHORS, foreignAnchor],
    );

    await screen.findByRole('navigation', { name: 'Các góc nhìn 3D' });
    expect(screen.queryByRole('button', { name: 'Ngoại lai' })).not.toBeInTheDocument();
  });

  it('derives a deterministic camera preset for the scoped destination without a curated override', async () => {
    const { factories, map3d } = createFactories();
    const manifest = createFakeImmersiveManifest();
    const { cameraPreset: _cameraPreset, ...destinationWithoutCameraPreset } = manifest.destination;
    const destinationWithoutPreset: DestinationPreviewVm = {
      ...destinationWithoutCameraPreset,
      geoPoint: { latitude: 18.4, longitude: 105.9 },
    };
    const scopedManifest = { ...manifest, destination: destinationWithoutPreset };

    renderExperience(
      '/explore/son-trang-co-dam/immersive?mode=overview3d',
      factories,
      scopedManifest,
      [destinationWithoutPreset],
    );

    await waitFor(() => {
      expect(map3d.calls.filter((call) => call.type === 'setLocations')).toHaveLength(1);
    });

    expect(map3d.calls.filter((call) => call.type === 'setLocations').at(-1)).toEqual({
      type: 'setLocations',
      locations: [
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
  });

  it('scopes selected 3D to the route destination and hides the all-destination browser', async () => {
    const { factories, map3d } = createFactories();
    const manifest = getDemoManifest('bien-thien-cam');
    const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);

    renderExperience(
      '/explore/bien-thien-cam/immersive?mode=overview3d',
      factories,
      manifest,
      destinations,
    );

    await waitFor(() =>
      expect(map3d.calls.some((call) => call.type === 'setLocations')).toBe(true),
    );

    const locationsCall = map3d.calls.find((call) => call.type === 'setLocations');
    expect(locationsCall?.type === 'setLocations' ? locationsCall.locations : []).toEqual([
      expect.objectContaining({ id: 'thien-cam-beach', label: 'Biển Thiên Cầm' }),
    ]);
    expect(screen.queryByRole('button', { name: 'Tìm kiếm địa điểm' })).not.toBeInTheDocument();
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
    await waitFor(() => {
      expect(useImmersiveNavigation.getState().committedSceneId).toBe('scene-01');
    });

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
    await waitFor(() => {
      expect(useImmersiveNavigation.getState().committedSceneId).toBe('scene-01');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 2' }));

    await waitFor(() => {
      expect(panorama.loadRequests.get('scene-02')).toBeDefined();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam/immersive?mode=panorama&location=destination-son-trang-co-dam&scene=scene-01&h=0&p=0&fov=90',
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
      expect(useImmersiveNavigation.getState().committedSceneId).toBe('scene-01');
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
