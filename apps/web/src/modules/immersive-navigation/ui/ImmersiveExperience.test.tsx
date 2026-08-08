import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine, type PanoramaNode } from '../../panorama';
import { createFakeImmersiveManifest } from '../fake-mode/manifest';
import { useImmersiveNavigation } from '../index';
import { ImmersiveExperience, type ImmersiveExperienceFactories } from './ImmersiveExperience';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderExperience(initialEntry: string, factories: ImmersiveExperienceFactories) {
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
              <ImmersiveExperience factories={factories} manifest={createFakeImmersiveManifest()} />
            }
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createFactories(panorama = new FakePanoramaEngine()) {
  const map3d = new FakeMap3DEngine();
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

describe('ImmersiveExperience', () => {
  beforeEach(() => {
    useImmersiveNavigation.getState().reset();
  });

  it('mounts the overview renderer, then hands off to one panorama renderer', async () => {
    const { factories, map3d, minimap, panorama } = createFactories();
    renderExperience('/explore/son-trang-co-dam?mode=overview3d', factories);

    await waitFor(() => {
      expect(map3d.calls.some((call) => call.type === 'mount')).toBe(true);
    });
    expect(factories.createMap3DEngine).toHaveBeenCalledTimes(1);
    expect(factories.createPanoramaEngine).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Khám phá 360°' })[0]!);

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
    });
    await waitFor(() => {
      expect(minimap.calls.some((call) => call.type === 'mount')).toBe(true);
    });
    expect(factories.createPanoramaEngine).toHaveBeenCalledTimes(1);
    expect(factories.createMinimapEngine).toHaveBeenCalledTimes(1);
    expect(map3d.calls.at(-1)).toEqual({ type: 'destroy' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đi tiếp' }));

    await waitFor(() => {
      expect(panorama.calls.filter((call) => call.type === 'loadNode')).toHaveLength(2);
    });
    expect(panorama.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    expect(panorama.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);
  });

  it('restores the linked scene and camera after a refresh', async () => {
    const { factories, panorama } = createFactories();
    renderExperience(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-02&h=123.4&p=-7&fov=82',
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
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      factories,
    );

    await waitFor(() => {
      expect(panorama.calls.some((call) => call.type === 'loadNode')).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đi tiếp' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
      expect(useImmersiveNavigation.getState().sceneId).toBe('scene-01');
    });
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      );
    });
  });

  it('keeps A committed when B resolves after C is requested and C fails', async () => {
    const panorama = new DeferredPanoramaEngine();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
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

    fireEvent.click(screen.getByRole('button', { name: 'Lối đi di sản 3' }));
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
        '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
      );
    });
  });

  it('keeps the committed URL while a requested panorama is pending', async () => {
    const panorama = new DeferredPanoramaEngine();
    const { factories } = createFactories(panorama);
    renderExperience(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
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
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
    );

    panorama.loadRequests.get('scene-02')?.resolve();

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore/son-trang-co-dam?mode=panorama&scene=scene-02&h=31&p=-2&fov=88',
      );
    });
  });
});
