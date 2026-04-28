import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke UI local: suba API (3001) e web (3000), ex. `pnpm dev`, antes de rodar.
 * Instalação dos browsers: `pnpm exec playwright install chromium`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
