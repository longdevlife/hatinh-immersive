import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine } from '../../panorama';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import { useImmersiveNavigation } from '../index';
import { ImmersiveExperience, type ImmersiveExperienceFactories } from './ImmersiveExperience';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function createFactories() {
  const map3d = new FakeMap3DEngine();
  const minimap = new FakeMinimapEngine();
  const panorama = new FakePanoramaEngine();
  const factories: ImmersiveExperienceFactories = {
    createMap3DEngine: vi.fn(async () => map3d),
    createMinimapEngine: vi.fn(async () => minimap),
    createPanoramaEngine: vi.fn(async () => panorama),
  };

  return { factories, panorama };
}

function renderTour(factories: ImmersiveExperienceFactories) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          '/explore/bien-thien-cam/immersive?mode=panorama&scene=thien-cam-boardwalk',
        ]}
      >
        <Routes>
          <Route
            path="/explore/:destinationSlug/immersive"
            element={
              <ImmersiveExperience
                factories={factories}
                manifest={getDemoManifest('bien-thien-cam', 'synthetic')}
                destinations={DEMO_DESTINATIONS.map(({ preview }) => preview)}
                panoramaTourSource="demo"
                panoramaTourMediaMode="synthetic"
              />
            }
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ImmersiveExperience Auto Tour progression', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useImmersiveNavigation.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves forward through ordered scenes instead of bouncing on bidirectional links', async () => {
    const { factories, panorama } = createFactories();
    renderTour(factories);

    const autoTourButton = await screen.findByRole('button', { name: 'Tự động tham quan' });
    await waitFor(() => expect(autoTourButton).not.toBeDisabled());
    vi.useFakeTimers();
    fireEvent.click(autoTourButton);

    const advanceAutoTour = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6500);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    };

    await advanceAutoTour();
    expect(screen.getByTestId('location')).toHaveTextContent(/scene=thien-cam-shore/);

    await advanceAutoTour();
    expect(screen.getByTestId('location')).toHaveTextContent(/scene=thien-cam-lookout/);

    await advanceAutoTour();
    expect(screen.getByTestId('location')).toHaveTextContent(/scene=thien-cam-lookout/);
    expect(panorama.calls.filter((call) => call.type === 'mount')).toHaveLength(1);
    expect(panorama.calls.filter((call) => call.type === 'destroy')).toHaveLength(0);
  });
});
