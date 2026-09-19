import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './portfolio',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PORTFOLIO_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-portfolio',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
