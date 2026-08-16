import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /explore-map-worker\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4178',
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
      'pnpm --filter @hatinh/web build && pnpm --filter @hatinh/web exec vite preview --host 127.0.0.1 --port 4178',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_E2E_HOOKS: 'true',
      VITE_EXPLORE_MAP_MODE: 'maplibre',
      VITE_EXPLORE_MAP_STYLE_URL: '/test/explore-map-style.json',
      VITE_IMMERSIVE_DATA_MODE: 'fake',
      VITE_IMMERSIVE_MAP3D_MODE: 'fake',
      VITE_IMMERSIVE_PANORAMA_MODE: 'fake',
      VITE_IMMERSIVE_RENDERER_MODE: 'fake',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4178',
  },
});
