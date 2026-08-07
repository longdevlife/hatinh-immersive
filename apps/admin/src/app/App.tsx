import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { UiButton } from '@hatinh/ui';
import '@hatinh/ui/styles.css';
import './styles/index.css';

function AdminHome() {
  return (
    <main className="admin-home" aria-labelledby="admin-title">
      <p className="admin-home__eyebrow">Hà Tĩnh Immersive / Admin</p>
      <h1 id="admin-title">Content workspace</h1>
      <p className="admin-home__description">
        Destination, panorama scene và hotspot editor sẽ được kết nối ở các task backend/admin tiếp
        theo.
      </p>
      <UiButton type="button">Open workspace</UiButton>
    </main>
  );
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="admin-app">
          <header className="admin-app__topbar">
            <a className="admin-app__brand" href="/">
              Immersive CMS
            </a>
            <span className="admin-app__status">Foundation preview</span>
          </header>
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
