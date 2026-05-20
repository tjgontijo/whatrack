import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load shared environment and map test database URL if provided
dotenv.config({ path: '.env' })
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

const shouldStartCloudflareTunnel = ['1', 'true', 'yes', 'on'].includes(
  (process.env.E2E_START_CLOUDFLARE_TUNNEL || '').toLowerCase()
)

const cloudflareConfigPath = existsSync('.cloudflared-config.yml')
  ? '.cloudflared-config.yml'
  : 'cloudflared-config.yml'

const appServer = {
  command: 'node scripts/dev/e2e.mjs',
  url: 'http://localhost:3000',
  reuseExistingServer: false,
  timeout: 120 * 1000,
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
  },
}

const tunnelServer = {
  command:
    process.env.E2E_CLOUDFLARE_TUNNEL_COMMAND ||
    `cloudflared tunnel --config ${cloudflareConfigPath} run webhook`,
  url: process.env.E2E_CLOUDFLARE_TUNNEL_URL || 'https://webhook.whatrack.com',
  reuseExistingServer: true,
  timeout: 90 * 1000,
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // Run sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30 * 1000,
  outputDir: 'e2e/test-results',
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report' }],
    ['json', { outputFile: 'e2e/test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: shouldStartCloudflareTunnel ? [appServer, tunnelServer] : appServer,
})
