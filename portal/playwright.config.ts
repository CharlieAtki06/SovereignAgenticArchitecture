import {defineConfig, devices} from '@playwright/test';

const basePath = '/SovereignAgenticArchitecture';
const buildDirectory = process.env.PORTAL_E2E_BUILD_DIR ?? 'build';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const outputDirectory = process.env.PORTAL_E2E_OUTPUT_DIR ?? 'test-results';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: outputDirectory,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', {open: 'never'}], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:3000${basePath}/`,
    launchOptions: executablePath ? {executablePath} : undefined,
    trace: 'retain-on-failure',
  },
  projects: [
    {name: 'desktop-chromium', use: {...devices['Desktop Chrome']}},
    {name: 'mobile-chromium', use: {...devices['Pixel 7']}},
  ],
  webServer: {
    command: `bun run serve -- --dir ${JSON.stringify(buildDirectory)} --host 127.0.0.1 --port 3000`,
    url: `http://127.0.0.1:3000${basePath}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
