import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './performance',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-performance',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
