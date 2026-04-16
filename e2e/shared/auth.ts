import { Page } from '@playwright/test'

export async function loginAsTestUser(page: Page) {
  await page.goto('/sign-in')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button:has-text("Sign in")')
  await page.waitForNavigation()
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('text=Sign out')
  await page.waitForNavigation()
}

export async function waitForAuth(page: Page) {
  await page.waitForURL('**/dashboard/**')
}
