import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { UiButton } from '@hatinh/ui';
import '@hatinh/ui/styles.css';
import './styles/index.css';

function PublicHome() {
  return (
    <main className="public-home">
      <section className="public-home__intro" aria-labelledby="public-title">
        <p className="eyebrow">Hà Tĩnh Immersive</p>
        <h1 id="public-title">Di sản mở ra theo cách bạn muốn khám phá.</h1>
        <p>
          Một nền tảng location-first cho hành trình 3D, 360° và những câu chuyện văn hóa được tuyển
          chọn.
        </p>
        <UiButton tone="primary" type="button">
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
