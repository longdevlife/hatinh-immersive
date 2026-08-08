import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: process.env.VITE_IMMERSIVE_MINIMAP_MODE === 'maplibre' ? ['maplibre-gl'] : [],
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**', 'e2e/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
});
