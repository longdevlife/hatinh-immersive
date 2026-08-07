import { createRoot } from 'react-dom/client';

import { UiButton } from './UiButton';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('UI preview root is missing.');
}

createRoot(root).render(
  <main style={{ padding: '2rem' }}>
    <h1>Shared UI preview</h1>
    <p>Accessible primitives are previewed here without application or renderer dependencies.</p>
    <UiButton tone="primary">Explore</UiButton>
  </main>,
);
