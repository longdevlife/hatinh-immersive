import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { UiButton } from '@hatinh/ui';
import '@hatinh/ui/styles.css';

import { ImmersiveExperience } from '../modules/immersive-navigation';
import { createFakeImmersiveManifest } from '../modules/immersive-navigation/fake-mode/manifest';
import './styles/index.css';

const DEFAULT_PUBLIC_DESTINATION_SLUG = 'son-trang-co-dam';
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

const fakeManifest =
  import.meta.env.VITE_IMMERSIVE_DATA_MODE === 'fake' && e2eFailure !== 'manifest'
    ? createFakeImmersiveManifest()
    : undefined;

function PublicHome() {
  const navigate = useNavigate();

  return (
    <main className="public-home">
      <section className="public-home__intro" aria-labelledby="public-title">
        <p className="eyebrow">Hà Tĩnh Immersive</p>
        <h1 id="public-title">Di sản mở ra theo cách bạn muốn khám phá.</h1>
        <p>
          Một nền tảng location-first cho hành trình 3D, 360° và những câu chuyện văn hóa được tuyển
          chọn.
        </p>
        <UiButton
          tone="primary"
          type="button"
          onClick={() => navigate(`/explore/${DEFAULT_PUBLIC_DESTINATION_SLUG}?mode=overview3d`)}
        >
          Bắt đầu khám phá
        </UiButton>
      </section>
    </main>
  );
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="public-app">
          <header className="public-app__topbar">
            <a className="public-app__brand" href="/">
              Hà Tĩnh / Immersive
            </a>
            <span className="public-app__status">Foundation preview</span>
          </header>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route
              path="/explore/:destinationSlug"
              element={
                fakeManifest ? (
                  <ImmersiveExperience manifest={fakeManifest} />
                ) : (
                  <ImmersiveExperience />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
