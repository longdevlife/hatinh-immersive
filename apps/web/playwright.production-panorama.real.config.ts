import { defineConfig, devices } from '@playwright/test';

/**
 * Production-like public-media gate using the real Photo Sphere Viewer
 * adapter. The API fixture points at the committed low-resolution Sơn Trang
 * manifest and must fail closed before PSV renders it.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /immersive-production-panorama-real\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4184',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      'pnpm --filter @hatinh/web build && pnpm --filter @hatinh/web exec vite preview --host 127.0.0.1 --port 4184',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_MODE: 'fake',
      VITE_IMMERSIVE_DATA_MODE: 'api',
      VITE_IMMERSIVE_MAP3D_MODE: 'fake',
      VITE_IMMERSIVE_MINIMAP_MODE: 'fake',
      VITE_IMMERSIVE_PANORAMA_MODE: 'photo-sphere-viewer',
      VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE: 'none',
      VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA: 'public',
      VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE: 'false',
      VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES: 'son-trang-co-dam=unavailable',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4184',
  },
});
