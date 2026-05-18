import type { Page } from '@playwright/test'

type LoginCredentials = {
  email?: string
  password?: string
}

function resolveCredentials(input?: LoginCredentials) {
  const email = input?.email ?? process.env.E2E_LOGIN_EMAIL
  const password = input?.password ?? process.env.E2E_LOGIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing login credentials. Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD or pass explicit credentials.'
    )
  }

  return { email, password }
}

export async function loginAsTestUser(page: Page, credentials?: LoginCredentials) {
  const { email, password } = resolveCredentials(credentials)

  await page.goto('/sign-in')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.includes('/sign-in'))
}

export async function logout(page: Page) {
  await page.goto('/sign-in')
  await page.context().clearCookies()
}

export async function waitForAuth(page: Page) {
  await page.waitForURL((url) => !url.pathname.includes('/sign-in'))
}
