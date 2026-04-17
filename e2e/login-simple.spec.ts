import { test, expect } from '@playwright/test'
import {
  generateTestCpf,
  generateTestEmail,
  generateTestName,
  generateTestPassword,
  signUp,
  waitForSignUpSuccess,
} from './shared/signup'

test.describe('Simple Login Test', () => {
  test.setTimeout(120000)

  test('should login with a freshly created account', async ({ page, context }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()
    const name = generateTestName()

    await signUp(page, {
      name,
      email,
      password,
      documentType: 'CPF',
      documentNumber: generateTestCpf(),
    })
    await waitForSignUpSuccess(page, 90000)

    // Force a clean login by clearing session cookies.
    await context.clearCookies()

    await page.goto('/sign-in')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    const [signInResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/auth') &&
          response.request().method() === 'POST',
        { timeout: 30000 },
      ),
      page.locator('button[type="submit"]').click(),
    ])

    expect(
      signInResponse.ok(),
      `Sign-in request failed with status ${signInResponse.status()}`,
    ).toBeTruthy()

    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
      timeout: 60000,
    })
    await expect(page).not.toHaveURL(/\/sign-in/)
  })
})
