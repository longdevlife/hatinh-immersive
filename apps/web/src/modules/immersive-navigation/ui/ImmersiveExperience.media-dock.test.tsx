import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine } from '../../panorama';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import type { ImmersiveExperienceFactories } from './ImmersiveExperience';
import { ImmersiveExperience } from './ImmersiveExperience';

describe('ImmersiveExperience Media Dock integration', () => {
  it('mounts one unified media dock and does not render the legacy audio/Auto Tour controls', async () => {
    const map3d = new FakeMap3DEngine();
    const minimap = new FakeMinimapEngine();
    const panorama = new FakePanoramaEngine();
    const factories: ImmersiveExperienceFactories = {
      createMap3DEngine: vi.fn(async () => map3d),
      createMinimapEngine: vi.fn(async () => minimap),
      createPanoramaEngine: vi.fn(async () => panorama),
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
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
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Media dock trải nghiệm' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bật thuyết minh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tự động tham quan' })).not.toBeInTheDocument();
  });
});
