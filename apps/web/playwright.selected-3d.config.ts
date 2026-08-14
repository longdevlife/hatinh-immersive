import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /selected-3d-local-anchors\.spec\.ts/,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4176',
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
      'pnpm --filter @hatinh/web build && pnpm --filter @hatinh/web exec vite preview --host 127.0.0.1 --port 4176',
    env: {
      ...process.env,
      VITE_EXPLORE_MAP_MODE: 'fake',
      VITE_IMMERSIVE_DATA_MODE: 'fake',
      VITE_IMMERSIVE_RENDERER_MODE: 'fake',
      VITE_IMMERSIVE_SELECTED_3D_CAPABILITIES: 'son-trang-co-dam=available',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4176',
  },
});
