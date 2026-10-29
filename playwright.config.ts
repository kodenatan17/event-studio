import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

/** Software WebGL so headless CI renders the canvas without a GPU. */
const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: SWIFTSHADER_ARGS },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        hasTouch: true,
        launchOptions: { args: SWIFTSHADER_ARGS },
      },
    },
  ],
  webServer: {
    command: `pnpm --filter @undangan/web start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    env: { DEV_FIXTURE_MANIFESTS: '1' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
