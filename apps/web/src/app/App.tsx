import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import '@hatinh/ui/styles.css';

import {
  createDestinationDetailHref,
  createExploreReturnHref,
} from '../shared/navigation/explore-context';

import {
  canEnterSelected3D,
  DEFAULT_DESTINATION_CAPABILITY_CONFIG,
  resolveDestinationCapabilityConfig,
} from '../modules/destination-detail/model/destination-capabilities';
import {
  getDemoDestinationPreviews,
  getDemoManifest,
} from '../modules/immersive-navigation/fake-mode/demo-catalog';
import { getDemoSelected3DAnchors } from '../modules/immersive-navigation/fake-mode/selected-3d-demo-anchors';
import { resolveSelected3DAnchorSource } from '../modules/immersive-navigation/model/selected-3d-anchor-source';
import {
  resolvePanoramaTourMediaMode,
  resolvePanoramaTourSource,
} from '../modules/immersive-navigation/model/panorama-tour-source';
import type { ImmersiveAudioSourcePolicy } from '../modules/immersive-audio';
import {
  DEMO_SON_TRANG_ZONE_MEDIA,
  getDemoDestinationMedia,
} from '../modules/immersive-navigation/fake-mode/demo-media';
import { createHomeDestinationVms } from '../modules/home/model/home-destination';
import { PUBLIC_NAV_ITEMS, PublicLayout } from '../modules/site-shell';
import { createFakeImmersiveManifest } from '../modules/immersive-navigation/fake-mode/manifest';
import './styles/index.css';

const LazyImmersiveExperience = lazy(() =>
  import('../modules/immersive-navigation').then(({ ImmersiveExperience }) => ({
    default: ImmersiveExperience,
  })),
);

const LazyExploreExperience = lazy(() =>
  import('../modules/explore').then(({ ExploreExperience }) => ({
    default: ExploreExperience,
  })),
);

const LazyDestinationDetailRoute = lazy(() =>
  import('../modules/destination-detail').then(({ DestinationDetailRoute }) => ({
    default: DestinationDetailRoute,
  })),
);

const LazyCinematicHome = lazy(() =>
  import('../modules/home/ui').then(({ CinematicHome }) => ({
    default: CinematicHome,
  })),
);

const DEFAULT_PUBLIC_DESTINATION_SLUG = 'bien-thien-cam';
const e2eFailure =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('e2eFailure')
    : null;

if (import.meta.env.VITE_IMMERSIVE_RENDERER_MODE === 'fake' && e2eFailure) {
  try {
    window.sessionStorage.setItem('hatinh-e2e-failure', e2eFailure);
  } catch {
    // Session storage is optional in privacy-restricted browsers.
  }
}

const useFakeData = import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake';
const selected3DAnchorSource = resolveSelected3DAnchorSource(import.meta.env);
const isExplicitSelected3DTestMode =
  selected3DAnchorSource === 'demo' &&
  import.meta.env.VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA === 'synthetic' &&
  import.meta.env.VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE === 'true';
const effectiveSelected3DAnchorSource = isExplicitSelected3DTestMode
  ? selected3DAnchorSource
  : 'none';
const destinationCapabilityConfig = isExplicitSelected3DTestMode
  ? resolveDestinationCapabilityConfig(import.meta.env)
  : DEFAULT_DESTINATION_CAPABILITY_CONFIG;
const panoramaTourSource = resolvePanoramaTourSource(import.meta.env);
const panoramaTourMediaMode = resolvePanoramaTourMediaMode(import.meta.env);
const fakeDemoMode = panoramaTourSource === 'demo' ? panoramaTourMediaMode : 'public';
const audioSourcePolicy: ImmersiveAudioSourcePolicy =
  panoramaTourSource === 'demo' ? 'demo-speech-synthesis' : 'browser-file';
const HOME_DESTINATIONS = createHomeDestinationVms(getDemoDestinationPreviews('public'));

function FakeImmersiveExperience() {
  const { destinationSlug = DEFAULT_PUBLIC_DESTINATION_SLUG } = useParams();
  const demoDestination = getDemoDestinationPreviews(fakeDemoMode).find(
    (destination) => destination.slug === destinationSlug,
  );
  const manifest = demoDestination
    ? getDemoManifest(destinationSlug, fakeDemoMode)
    : createFakeImmersiveManifest();
  const destinations = demoDestination
    ? getDemoDestinationPreviews(fakeDemoMode)
    : [manifest.destination, ...getDemoDestinationPreviews(fakeDemoMode)];

  return (
    <Suspense fallback={<ImmersiveRouteLoading />}>
      <LazyImmersiveExperience
        destinations={destinations}
        manifest={manifest}
        {...(isExplicitSelected3DTestMode
          ? { selected3DAnchors: getDemoSelected3DAnchors(destinationSlug) }
          : {})}
        selected3DAnchorSource={effectiveSelected3DAnchorSource}
        panoramaTourSource={panoramaTourSource}
        panoramaTourMediaMode={fakeDemoMode}
        audioSourcePolicy={audioSourcePolicy}
      />
    </Suspense>
  );
}

function ImmersiveRouteLoading() {
  return (
    <main className="immersive-manifest-state" aria-live="polite" role="status">
      <p>Đang mở hành trình…</p>
    </main>
  );
}

function PublicImmersiveExperience() {
  return (
    <Suspense fallback={<ImmersiveRouteLoading />}>
      <LazyImmersiveExperience
        panoramaTourSource={panoramaTourSource}
        panoramaTourMediaMode={panoramaTourMediaMode}
        audioSourcePolicy={audioSourcePolicy}
        selected3DAnchorSource={effectiveSelected3DAnchorSource}
      />
    </Suspense>
  );
}

function ImmersiveRoute() {
  const { destinationSlug = '' } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const requestedMode = searchParams.get('mode');
  const isUnverifiedPublicFakePanorama =
    useFakeData &&
    requestedMode === 'panorama' &&
    destinationSlug === 'son-trang-co-dam' &&
    fakeDemoMode !== 'synthetic';
  const canEnterPanorama = requestedMode === 'panorama' && !isUnverifiedPublicFakePanorama;
  const canEnterSelected3D = canEnterSelected3DForSlug(destinationSlug, requestedMode);

  if (!canEnterPanorama && !canEnterSelected3D) {
    return (
      <Navigate
        replace
        to={createDestinationDetailHref(destinationSlug, searchParams.get('returnTo') ?? undefined)}
      />
    );
  }

  return useFakeData && e2eFailure !== 'manifest' ? (
    <FakeImmersiveExperience />
  ) : (
    <PublicImmersiveExperience />
  );
}

function canEnterSelected3DForSlug(destinationSlug: string, requestedMode: string | null): boolean {
  return (
    requestedMode === 'overview3d' &&
    canEnterSelected3D(destinationSlug, destinationCapabilityConfig)
  );
}

function PublicExplore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destinations = useFakeData ? getDemoDestinationPreviews(fakeDemoMode) : undefined;
  const initialDestinationSlug = searchParams.get('destination') ?? undefined;
  const initialQuery = searchParams.get('q') ?? undefined;
  const initialCategory = searchParams.get('category') ?? undefined;
  const initialViewParam = searchParams.get('view');
  const initialView =
    initialViewParam === 'cards' || initialViewParam === 'map' ? initialViewParam : undefined;

  return (
    <Suspense fallback={<ImmersiveRouteLoading />}>
      <LazyExploreExperience
        {...(destinations ? { destinations } : {})}
        {...(initialDestinationSlug ? { initialDestinationSlug } : {})}
        {...(initialQuery ? { initialQuery } : {})}
        {...(initialCategory ? { initialCategory } : {})}
        {...(initialView ? { initialView } : {})}
        onDiscoveryStateChange={({ query, category, destinationSlug, view }) => {
          const params = new URLSearchParams();
          if (query.trim()) {
            params.set('q', query.trim());
          }
          if (category.trim()) {
            params.set('category', category.trim());
          }
          if (destinationSlug) {
            params.set('destination', destinationSlug);
          }
          params.set('view', view);
          navigate(`/explore?${params.toString()}`, { replace: true });
        }}
        onOpenDestination={(destination, returnHref) => {
          const params = new URLSearchParams({
            returnTo: returnHref ?? createExploreReturnHref({ destinationSlug: destination.slug }),
          });
          navigate(`/explore/${encodeURIComponent(destination.slug)}?${params.toString()}`, {
            state: { origin: 'explore' },
          });
        }}
      />
    </Suspense>
  );
}

function PublicPageLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <PublicLayout activePath={location.pathname} items={PUBLIC_NAV_ITEMS}>
      {children}
    </PublicLayout>
  );
}

function PublicDestinationDetail() {
  const destinations = useFakeData ? getDemoDestinationPreviews(fakeDemoMode) : undefined;
  const sonTrangMedia = useFakeData
    ? {
        hero: getDemoDestinationMedia('son-trang-co-dam')?.hero ?? null,
        zoneMedia: DEMO_SON_TRANG_ZONE_MEDIA,
      }
    : undefined;

  return (
    <Suspense fallback={<DestinationRouteLoading />}>
      <LazyDestinationDetailRoute
        {...(destinations ? { destinations } : {})}
        capabilityConfig={destinationCapabilityConfig}
        {...(sonTrangMedia ? { sonTrangMedia } : {})}
      />
    </Suspense>
  );
}

function DestinationRouteLoading() {
  return (
    <main className="destination-detail-state" aria-live="polite" role="status">
      <p>Đang tải thông tin điểm đến…</p>
    </main>
  );
}

function hasLegacyImmersiveQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  return ['mode', 'location', 'scene', 'h', 'p', 'fov', 'e2eFailure'].some((key) =>
    params.has(key),
  );
}

function DestinationRoute() {
  const { destinationSlug = '' } = useParams();
  const location = useLocation();
  const requestedMode = new URLSearchParams(location.search).get('mode');

  if (hasLegacyImmersiveQuery(location.search)) {
    if (
      requestedMode === 'overview3d' &&
      !canEnterSelected3D(destinationSlug, destinationCapabilityConfig)
    ) {
      const searchParams = new URLSearchParams(location.search);
      return (
        <Navigate
          replace
          to={createDestinationDetailHref(
            destinationSlug,
            searchParams.get('returnTo') ?? undefined,
          )}
        />
      );
    }

    return (
      <Navigate
        replace
        to={`/explore/${encodeURIComponent(destinationSlug)}/immersive${location.search}`}
      />
    );
  }

  return <PublicDestinationDetail />;
}
function HomeRouteLoading() {
  return (
    <main className="home-cinematic-state" aria-live="polite">
      <p>Loading Ha Tinh discovery...</p>
    </main>
  );
}

function PublicHome() {
  return (
    <Suspense fallback={<HomeRouteLoading />}>
      <LazyCinematicHome destinations={HOME_DESTINATIONS} exploreHref="/explore" />
    </Suspense>
  );
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="public-app editorial-system">
          <Routes>
            <Route
              path="/"
              element={
                <PublicPageLayout>
                  <PublicHome />
                </PublicPageLayout>
              }
            />
            <Route
              path="/explore"
              element={
                <PublicPageLayout>
                  <PublicExplore />
                </PublicPageLayout>
              }
            />
            <Route path="/explore/:destinationSlug/immersive" element={<ImmersiveRoute />} />
            <Route
              path="/explore/:destinationSlug"
              element={
                <PublicPageLayout>
                  <DestinationRoute />
                </PublicPageLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
