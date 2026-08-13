import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore:
    /(?:explore-map-real|immersive-(minimap|production)|selected-3d(?:-(?:local-anchors|public-runtime))?)\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @hatinh/web exec vite --host 127.0.0.1 --port 4173',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_MODE: 'fake',
      VITE_EXPLORE_MAP_E2E_HOOKS: 'true',
      VITE_IMMERSIVE_RENDERER_MODE: 'fake',
      VITE_IMMERSIVE_DATA_MODE: 'fake',
      VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES:
        'son-trang-co-dam=available,bien-thien-cam=available',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4173',
  },
});
