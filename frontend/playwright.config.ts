import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour les tests E2E de CulturiaQuests
 * Documentation: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Dossier contenant les tests
  testDir: './tests/e2e',

  // Timeout global pour chaque test
  timeout: 30 * 1000,

  // Timeout pour les assertions expect()
  expect: {
    timeout: 5000,
  },

  // Exécuter les tests en parallèle
  fullyParallel: true,

  // Ne pas autoriser test.only en CI
  forbidOnly: !!process.env.CI,

  // Nombre de retries en cas d'échec
  retries: process.env.CI ? 2 : 0,

  // Nombre de workers parallèles
  workers: process.env.CI ? 1 : undefined,

  // Reporter pour les résultats
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Configuration partagée pour tous les tests
  use: {
    // URL de base de l'application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Traces pour le debugging
    trace: 'on-first-retry',

    // Screenshots en cas d'échec
    screenshot: 'only-on-failure',

    // Vidéos en cas d'échec
    video: 'on-first-retry',
  },

  // Configuration des navigateurs
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Tests mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Démarrer le serveur de dev avant les tests (optionnel)
  // Décommenter si vous voulez que Playwright lance le serveur automatiquement
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
