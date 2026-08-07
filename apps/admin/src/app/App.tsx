import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { UiButton } from '@hatinh/ui';
import '@hatinh/ui/styles.css';
import { AdminWorkspace } from '../modules/catalog-management/ui/AdminWorkspace';
import './styles/index.css';

function AdminHome() {
  const navigate = useNavigate();

  return (
    <main className="admin-home" aria-labelledby="admin-title">
      <p className="admin-home__eyebrow">Hà Tĩnh Immersive / Admin</p>
      <h1 id="admin-title">Content workspace</h1>
      <p className="admin-home__description">
        Create destinations, shape panorama scenes and annotate the journey graph before publishing.
      </p>
      <UiButton type="button" onClick={() => navigate('/workspace')}>
        Open workspace
      </UiButton>
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
            <nav className="admin-app__nav" aria-label="Admin navigation">
              <a href="/workspace">Workspace</a>
              <span className="admin-app__status">Foundation editor</span>
            </nav>
          </header>
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/workspace" element={<AdminWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
