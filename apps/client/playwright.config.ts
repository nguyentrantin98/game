import { defineConfig, devices } from '@playwright/test';

const CHROME = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['iPhone 14 landscape'],
    browserName: 'chromium',
    viewport: { width: 844, height: 390 },
    launchOptions: {
      executablePath: CHROME,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node ../server/dist/main.js',
      url: 'http://localhost:3000/api/health',
      env: { PORT: '3000', BOT_THINK_MS: '500' },
      reuseExistingServer: true,
    },
    {
      command: 'pnpm vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
    },
  ],
});
