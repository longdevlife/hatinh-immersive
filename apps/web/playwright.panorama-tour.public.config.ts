import { defineConfig, devices } from '@playwright/test';

/** Public-media quality gate: low-resolution demo media must fail closed. */
export default defineConfig({
  testDir: './e2e',
  testMatch: /panorama-tour\.spec\.ts/,
  grep: /shows a recoverable unavailable state/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4182',
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
      'pnpm --filter @hatinh/web build && pnpm --filter @hatinh/web exec vite preview --host 127.0.0.1 --port 4182',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_MODE: 'fake',
      VITE_IMMERSIVE_DATA_MODE: 'api',
      VITE_IMMERSIVE_MAP3D_MODE: 'fake',
      VITE_IMMERSIVE_MINIMAP_MODE: 'fake',
      VITE_IMMERSIVE_PANORAMA_MODE: 'fake',
      VITE_IMMERSIVE_PANORAMA_TOUR_SOURCE: 'demo',
      VITE_IMMERSIVE_PANORAMA_TOUR_MEDIA: 'public',
      VITE_IMMERSIVE_PANORAMA_TOUR_TEST_MODE: 'false',
      VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES: 'son-trang-co-dam=available',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4182',
  },
});
