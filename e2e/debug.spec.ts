import { expect, test } from '@playwright/test'

test.describe('Debug - Sign Up Form Validation', () => {
  test('should load sign-up page and validate form fields exist', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page).toHaveURL(/\/sign-up/)
    await expect(page.getByTestId('sign-up-page')).toBeVisible()
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})
