import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useMemo } from 'react';
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

import { UiButton } from '@hatinh/ui';
import '@hatinh/ui/styles.css';

import {
  canEnterSelected3D,
  resolveDestinationCapabilityConfig,
} from '../modules/destination-detail/model/destination-capabilities';
import {
  DEMO_DESTINATIONS,
  getDemoManifest,
} from '../modules/immersive-navigation/fake-mode/demo-catalog';
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
const destinationCapabilityConfig = resolveDestinationCapabilityConfig(import.meta.env);

function FakeImmersiveExperience() {
  const { destinationSlug = DEFAULT_PUBLIC_DESTINATION_SLUG } = useParams();
  const demoDestination = DEMO_DESTINATIONS.find(({ preview }) => preview.slug === destinationSlug);
  const manifest = demoDestination
    ? getDemoManifest(destinationSlug)
    : createFakeImmersiveManifest();
  const destinations = demoDestination
    ? DEMO_DESTINATIONS.map(({ preview }) => preview)
    : [manifest.destination, ...DEMO_DESTINATIONS.map(({ preview }) => preview)];

  return (
    <Suspense fallback={<ImmersiveRouteLoading />}>
      <LazyImmersiveExperience destinations={destinations} manifest={manifest} />
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
      <LazyImmersiveExperience />
    </Suspense>
  );
}

function ImmersiveRoute() {
  const { destinationSlug = '' } = useParams();
  const location = useLocation();
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const canEnterPanorama = requestedMode === 'panorama';
  const canEnterSelected3D = canEnterSelected3DForSlug(destinationSlug, requestedMode);

  if (!canEnterPanorama && !canEnterSelected3D) {
    return <Navigate replace to={`/explore/${encodeURIComponent(destinationSlug)}`} />;
  }

  return useFakeData && e2eFailure !== 'manifest' ? (
    <FakeImmersiveExperience />
  ) : (
    <PublicImmersiveExperience />
  );
}

function canEnterSelected3DForSlug(destinationSlug: string, requestedMode: string | null): boolean {
  return (
    requestedMode !== 'panorama' && canEnterSelected3D(destinationSlug, destinationCapabilityConfig)
  );
}

function PublicExplore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destinations = useFakeData ? DEMO_DESTINATIONS.map(({ preview }) => preview) : undefined;
  const initialDestinationSlug = searchParams.get('destination') ?? undefined;

  return (
    <Suspense fallback={<ImmersiveRouteLoading />}>
      <LazyExploreExperience
        {...(destinations ? { destinations } : {})}
        {...(initialDestinationSlug ? { initialDestinationSlug } : {})}
        onOpenDestination={(destination) =>
          navigate(`/explore/${encodeURIComponent(destination.slug)}`)
        }
      />
    </Suspense>
  );
}

function PublicDestinationDetail() {
  const destinations = useFakeData ? DEMO_DESTINATIONS.map(({ preview }) => preview) : undefined;

  return (
    <Suspense fallback={<DestinationRouteLoading />}>
      <LazyDestinationDetailRoute
        {...(destinations ? { destinations } : {})}
        capabilityConfig={destinationCapabilityConfig}
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
      return <Navigate replace to={`/explore/${encodeURIComponent(destinationSlug)}`} />;
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

function PublicHome() {
  const navigate = useNavigate();

  return (
    <>
      <header className="public-app__topbar">
        <a className="public-app__brand" href="/">
          Hà Tĩnh / Immersive
        </a>
        <span className="public-app__status">Foundation preview</span>
      </header>
      <main className="public-home">
        <section className="public-home__intro" aria-labelledby="public-title">
          <p className="eyebrow">Hà Tĩnh Immersive</p>
          <h1 id="public-title">Di sản mở ra theo cách bạn muốn khám phá.</h1>
          <p>
            Một không gian khám phá các điểm đến Hà Tĩnh và những câu chuyện văn hóa được tuyển
            chọn.
          </p>
          <UiButton tone="primary" type="button" onClick={() => navigate('/explore')}>
            Bắt đầu khám phá
          </UiButton>
        </section>
      </main>
    </>
  );
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="public-app">
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/explore" element={<PublicExplore />} />
            <Route path="/explore/:destinationSlug/immersive" element={<ImmersiveRoute />} />
            <Route path="/explore/:destinationSlug" element={<DestinationRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
