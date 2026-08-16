import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /explore-map-hybrid-controls\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @hatinh/web exec vite --host 127.0.0.1 --port 4177',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_MODE: 'fake',
      VITE_EXPLORE_MAP_E2E_HOOKS: 'true',
      VITE_EXPLORE_MAP_ALT_STYLE_URL: '/test/explore-map-alternate-style.json',
      VITE_IMMERSIVE_DATA_MODE: 'fake',
      VITE_IMMERSIVE_MAP3D_MODE: 'fake',
      VITE_IMMERSIVE_PANORAMA_MODE: 'fake',
      VITE_IMMERSIVE_RENDERER_MODE: 'fake',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4177',
  },
});
