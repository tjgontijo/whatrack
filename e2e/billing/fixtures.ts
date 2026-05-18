import { test as base, expect } from '@playwright/test'
import { loginAsTestUser } from '../shared/auth'

type AuthenticatedFixture = {
  authenticatedPage: undefined
}

export const test = base.extend<AuthenticatedFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await loginAsTestUser(page)
    await use()
  },
})

export { expect }
