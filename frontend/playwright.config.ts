import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Run tests sequentially when connecting to external browser
  fullyParallel: !process.env.CDP_URL,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CDP_URL ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Connect to existing browser via CDP if CDP_URL is set
    ...(process.env.CDP_URL ? { connectOverCDP: process.env.CDP_URL } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Don't specify channel when using CDP connection
        ...(process.env.CDP_URL ? {} : { launchOptions: { args: ['--no-sandbox'] } }),
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
