import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FakeMap3DEngine } from '../../map3d';
import { FakeMinimapEngine } from '../../minimap';
import { FakePanoramaEngine } from '../../panorama';
import { DEMO_DESTINATIONS, getDemoManifest } from '../fake-mode/demo-catalog';
import type { ImmersiveAudioTrack, ImmersiveTranscriptContent } from '../../../shared/contracts';
import type { ImmersiveManifestVm } from '../api/immersive-manifest.mapper';
import type { ImmersiveExperienceFactories } from './ImmersiveExperience';
import { ImmersiveExperience } from './ImmersiveExperience';

describe('ImmersiveExperience Media Dock integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts the unified media dock for a non-demo panorama source', async () => {
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
                  panoramaTourSource="none"
                  panoramaTourMediaMode="public"
                  audioSourcePolicy="browser-file"
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

    expect(screen.getByRole('button', { name: 'Bắt đầu tự động tham quan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bật âm thanh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tự động tham quan' })).not.toBeInTheDocument();
  });

  it('exposes production file-backed narration and keeps transcript-only EN non-playable', async () => {
    class TestAudioElement {
      currentTime = 0;
      duration = 30;
      loop = false;
      preload = 'auto';
      volume = 1;
      play = vi.fn(async () => undefined);
      pause = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
    }

    vi.stubGlobal('Audio', TestAudioElement);

    const baseManifest = getDemoManifest('bien-thien-cam', 'synthetic');
    const englishTranscript: ImmersiveTranscriptContent = {
      id: 'transcript-production-en',
      locale: 'en',
      title: 'The shore story',
      timingMode: 'plain',
      segments: [
        {
          id: 'segment-production-en',
          startMs: null,
          endMs: null,
          text: 'A quiet story of the shore.',
        },
      ],
    };
    const ambientTrack: ImmersiveAudioTrack = {
      id: 'ambient-production',
      type: 'ambient',
      label: 'Thiên Cầm ambience',
      locale: null,
      src: '/audio/production/ambient.mp3',
      durationMs: 120_000,
      rights: 'customer-owned',
      readiness: 'ready',
      publicationStatus: 'published',
      voiceId: null,
      version: 'v1',
    };
    const narrationTrack: ImmersiveAudioTrack = {
      id: 'narration-production-vi',
      type: 'narration',
      label: 'Thuyết minh Thiên Cầm',
      locale: 'vi',
      src: '/audio/production/thien-cam-vi.mp3',
      durationMs: 30_000,
      rights: 'customer-owned',
      readiness: 'ready',
      publicationStatus: 'published',
      voiceId: 'approved-vi-voice',
      version: 'v1',
    };
    const productionManifest: ImmersiveManifestVm = {
      ...baseManifest,
      ambientTrackId: ambientTrack.id,
      audioTracks: [ambientTrack, narrationTrack],
      panoramaNodes: baseManifest.panoramaNodes.map((node) =>
        node.id === 'thien-cam-boardwalk'
          ? {
              ...node,
              narrationTrackIds: { vi: narrationTrack.id },
              transcripts: { en: englishTranscript },
            }
          : node,
      ),
    };
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
                  manifest={productionManifest}
                  destinations={DEMO_DESTINATIONS.map(({ preview }) => preview)}
                  panoramaTourSource="none"
                  panoramaTourMediaMode="public"
                  audioSourcePolicy="browser-file"
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Việt' }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở bản chép lời' })).toBeInTheDocument();
  });

  it('mounts one unified media dock and does not render the legacy audio/Auto Tour controls', async () => {
    vi.stubGlobal('speechSynthesis', {});
    vi.stubGlobal('SpeechSynthesisUtterance', class SpeechSynthesisUtterance {});

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

  it('keeps hook order stable when the manifest resolves after the loading render', async () => {
    const map3d = new FakeMap3DEngine();
    const minimap = new FakeMinimapEngine();
    const panorama = new FakePanoramaEngine();
    const factories: ImmersiveExperienceFactories = {
      createMap3DEngine: vi.fn(async () => map3d),
      createMinimapEngine: vi.fn(async () => minimap),
      createPanoramaEngine: vi.fn(async () => panorama),
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const destinations = DEMO_DESTINATIONS.map(({ preview }) => preview);
    const manifest = getDemoManifest('bien-thien-cam', 'synthetic');
    const renderRoute = (resolvedManifest?: typeof manifest) => (
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
                  {...(resolvedManifest ? { manifest: resolvedManifest } : {})}
                  destinations={destinations}
                  panoramaTourSource="demo"
                  panoramaTourMediaMode="synthetic"
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const view = render(renderRoute());
    view.rerender(renderRoute(manifest));

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Media dock trải nghiệm' })).toBeInTheDocument();
    });
  });
});
