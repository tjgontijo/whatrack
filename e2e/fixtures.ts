import { test as base } from '@playwright/test'
import { loginAsTestUser, logout } from './helpers/auth'

type AuthFixture = {
  authenticatedPage: void
}

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: login before test
    await loginAsTestUser(page)

    // Use in test
    await use()

    // Teardown: logout after test
    try {
      await logout(page)
    } catch {
      // Ignore errors during cleanup
    }
  },
})

export { expect } from '@playwright/test'
