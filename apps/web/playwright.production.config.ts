import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch:
    /(?:immersive-(production|parity|failure-modes)|selected-3d(?:-public-runtime)?)\.spec\.ts/,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
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
      'pnpm --filter @hatinh/web build && pnpm --filter @hatinh/web exec vite preview --host 127.0.0.1 --port 4174',
    env: {
      ...process.env,
      VITE_IMMERSIVE_RENDERER_MODE: 'fake',
      VITE_IMMERSIVE_DATA_MODE: 'api',
      VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES:
        'son-trang-co-dam=available,bien-thien-cam=unavailable',
      VITE_IMMERSIVE_SELECTED_3D_ANCHOR_SOURCE: 'demo',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4174',
  },
});
