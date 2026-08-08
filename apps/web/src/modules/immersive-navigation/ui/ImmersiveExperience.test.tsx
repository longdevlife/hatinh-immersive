import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakePanoramaEngine } from '../../panorama';
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

function createFactories() {
  const map3d = new FakeMap3DEngine();
  const panorama = new FakePanoramaEngine();

  const factories: ImmersiveExperienceFactories = {
    createMap3DEngine: vi.fn(async () => map3d),
    createPanoramaEngine: vi.fn(async () => panorama),
  };

  return { factories, map3d, panorama };
}

describe('ImmersiveExperience', () => {
  beforeEach(() => {
    useImmersiveNavigation.getState().reset();
  });

  it('mounts the overview renderer, then hands off to one panorama renderer', async () => {
    const { factories, map3d, panorama } = createFactories();
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
    expect(factories.createPanoramaEngine).toHaveBeenCalledTimes(1);
    expect(map3d.calls.at(-1)).toEqual({ type: 'destroy' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/son-trang-co-dam?mode=panorama&scene=scene-01&h=0&p=0&fov=90',
    );
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
});
