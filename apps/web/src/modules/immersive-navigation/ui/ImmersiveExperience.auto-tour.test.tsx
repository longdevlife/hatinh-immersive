import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine, type PanoramaNode } from '../../panorama';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import { AutoTourController, type AutoTourControllerState } from '../model/auto-tour.controller';
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

class RuntimeUnavailablePanoramaEngine extends FakePanoramaEngine {
  readonly requestedSceneIds: string[] = [];

  override async loadNode(node: PanoramaNode) {
    this.requestedSceneIds.push(node.id);
    if (node.id === 'thien-cam-shore') {
      throw new Error('PANORAMA_PUBLIC_RESOLUTION_TOO_LOW:thien-cam-shore:256:4096');
    }

    return super.loadNode(node);
  }
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
    vi.restoreAllMocks();
  });

  it('moves forward through ordered scenes instead of bouncing on bidirectional links', async () => {
    const { factories, panorama } = createFactories();
    renderTour(factories);

    const autoTourButton = await screen.findByRole('button', {
      name: 'Bắt đầu tự động tham quan',
    });
    await waitFor(() => {
      expect(autoTourButton).not.toBeDisabled();
      expect(useImmersiveNavigation.getState().committedSceneId).toBe('thien-cam-boardwalk');
    });

    vi.useFakeTimers();
    fireEvent.click(autoTourButton);

    const advanceAutoTour = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
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

  it('stops Auto Tour when a requested scene becomes runtime-unavailable', async () => {
    const panorama = new RuntimeUnavailablePanoramaEngine();
    let unavailableController: AutoTourController | null = null;
    let stateAtUnavailable: AutoTourControllerState | null = null;
    const originalUnavailable = AutoTourController.prototype.onSceneTransitionUnavailable;
    const unavailableSpy = vi
      .spyOn(AutoTourController.prototype, 'onSceneTransitionUnavailable')
      .mockImplementation(function (
        this: AutoTourController,
        failedSceneId: string,
        committedSceneId: string | null,
      ) {
        unavailableController = this;
        stateAtUnavailable = this.getState();
        return originalUnavailable.call(this, failedSceneId, committedSceneId);
      });
    const map3d = new FakeMap3DEngine();
    const minimap = new FakeMinimapEngine();
    const factories: ImmersiveExperienceFactories = {
      createMap3DEngine: vi.fn(async () => map3d),
      createMinimapEngine: vi.fn(async () => minimap),
      createPanoramaEngine: vi.fn(async () => panorama),
    };

    renderTour(factories);

    const autoTourButton = await screen.findByRole('button', {
      name: 'Bắt đầu tự động tham quan',
    });
    await waitFor(() => {
      expect(autoTourButton).not.toBeDisabled();
      expect(useImmersiveNavigation.getState()).toMatchObject({
        committedSceneId: 'thien-cam-boardwalk',
        requestedSceneId: null,
      });
    });

    vi.useFakeTimers();
    fireEvent.click(autoTourButton);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(panorama.requestedSceneIds.filter((id) => id === 'thien-cam-shore')).toHaveLength(1);
    expect(useImmersiveNavigation.getState()).toMatchObject({
      committedSceneId: 'thien-cam-boardwalk',
      requestedSceneId: null,
    });
    expect(screen.getByTestId('location')).toHaveTextContent(/scene=thien-cam-boardwalk/);
    expect(unavailableSpy).toHaveBeenCalledWith('thien-cam-shore', 'thien-cam-boardwalk');
    expect(stateAtUnavailable).toMatchObject({
      isActive: true,
      phase: 'transitioning',
      currentSceneId: 'thien-cam-shore',
    });
    expect(unavailableController).not.toBeNull();
    expect(unavailableController!.getState()).toMatchObject({
      isActive: false,
      phase: 'idle',
      currentSceneId: null,
    });

    const failedSceneRequestCount = panorama.requestedSceneIds.filter(
      (id) => id === 'thien-cam-shore',
    ).length;
    await act(async () => {
      await vi.runAllTimersAsync();
      await Promise.resolve();
    });

    expect(panorama.requestedSceneIds.filter((id) => id === 'thien-cam-shore')).toHaveLength(
      failedSceneRequestCount,
    );
    expect(screen.getByRole('button', { name: 'Bắt đầu tự động tham quan' })).toBeInTheDocument();
    expect(screen.queryByTestId('immersive-media-dock-progress')).not.toBeInTheDocument();
  });
});
