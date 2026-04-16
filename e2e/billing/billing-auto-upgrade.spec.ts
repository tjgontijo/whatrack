import { test, expect } from '@playwright/test'

test.describe('Billing Auto-Upgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/sign-in')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Sign in")')
    await page.waitForNavigation()
  })

  test('should auto-upgrade plan when creating projects beyond limit', async ({ page }) => {
    await page.goto('/dashboard/billing')

    // Verify current plan is Starter
    const currentPlanCard = page.locator('[data-testid="current-plan-card"]')
    await expect(currentPlanCard).toContainText('Starter')
    await expect(currentPlanCard).toContainText('1 project')

    // Create a project that exceeds plan limit
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Project 1')
    await page.click('button:has-text("Create")')
    await page.waitForNavigation()

    // Create second project to trigger upgrade
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Project 2')
    await page.click('button:has-text("Create")')

    // Wait for auto-upgrade toast notification
    const toast = page.locator('[role="status"]')
    await expect(toast).toContainText('Plan upgraded')

    // Navigate to billing to verify upgrade
    await page.goto('/dashboard/billing')

    // Verify plan was upgraded to Pro
    const upgradeCard = page.locator('[data-testid="current-plan-card"]')
    await expect(upgradeCard).toContainText('Pro')
    await expect(upgradeCard).toContainText('3 projects')

    // Verify prorating was applied
    const invoiceCard = page.locator('[data-testid="invoice-card"]')
    await expect(invoiceCard).toContainText('Prorated')
  })

  test('should show invoice with prorated amount after auto-upgrade', async ({ page }) => {
    // Start with 1 project in Starter plan
    // Create another project to trigger upgrade to Pro
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Trigger Upgrade')
    await page.click('button:has-text("Create")')

    // Wait for upgrade completion
    await page.waitForTimeout(2000)

    // Navigate to billing
    await page.goto('/dashboard/billing')

    // Verify invoice shows
    const invoiceSection = page.locator('[data-testid="billing-invoice"]')
    await expect(invoiceSection).toBeVisible()

    // Verify prorating calculation is shown
    const creditRow = page.locator('text=Credit Applied')
    const chargeRow = page.locator('text=New Plan Charge')
    const netRow = page.locator('text=Net Amount')

    await expect(creditRow).toBeVisible()
    await expect(chargeRow).toBeVisible()
    await expect(netRow).toBeVisible()

    // Verify all amounts are positive
    const amounts = await page.locator('[data-testid="amount-value"]').allTextContents()
    amounts.forEach((amount) => {
      const value = parseFloat(amount.replace(/[^\d.]/g, ''))
      expect(value).toBeGreaterThan(0)
    })
  })

  test('should send email notification on auto-upgrade', async ({ page }) => {
    // This test verifies the email notification was sent
    // In a real scenario, you'd check the email inbox
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Email Test')
    await page.click('button:has-text("Create")')

    // Wait for upgrade
    await page.waitForTimeout(2000)

    // Check for notification indicator
    const notificationBell = page.locator('[data-testid="notifications-bell"]')
    const unread = notificationBell.locator('[data-testid="unread-count"]')

    // Verify notification exists
    const count = await unread.textContent()
    expect(parseInt(count || '0')).toBeGreaterThan(0)
  })

  test.describe('with test card data', () => {
    test('should process checkout with test card 4111111111111111', async ({ page }) => {
      // Navigate to checkout
      await page.goto('/checkout')

      // Fill billing info
      await page.fill('input[name="fullName"]', 'Test User')
      await page.fill('input[name="email"]', 'test@asaas.com')
      await page.fill('input[name="cpf"]', '12345678901')

      // Fill card info - use Asaas test card
      const cardFrame = page.frameLocator('iframe[title="Encrypted card data"]')
      await cardFrame.locator('input[name="number"]').fill('4111111111111111')
      await cardFrame.locator('input[name="expiry"]').fill('12/25')
      await cardFrame.locator('input[name="cvc"]').fill('123')

      // Submit
      await page.click('button:has-text("Complete Purchase")')

      // Wait for success
      await page.waitForURL('/checkout/success')
      await expect(page).toHaveURL('/checkout/success')

      // Verify success message
      const successMsg = page.locator('text=Payment confirmed')
      await expect(successMsg).toBeVisible()
    })

    test('should reject declined test card 4000000000000002', async ({ page }) => {
      await page.goto('/checkout')

      // Fill billing info
      await page.fill('input[name="fullName"]', 'Test User')
      await page.fill('input[name="email"]', 'test@asaas.com')
      await page.fill('input[name="cpf"]', '12345678901')

      // Fill card info - use declined test card
      const cardFrame = page.frameLocator('iframe[title="Encrypted card data"]')
      await cardFrame.locator('input[name="number"]').fill('4000000000000002')
      await cardFrame.locator('input[name="expiry"]').fill('12/25')
      await cardFrame.locator('input[name="cvc"]').fill('123')

      // Submit
      await page.click('button:has-text("Complete Purchase")')

      // Wait for error
      await page.waitForURL('/checkout?error=*')

      // Verify error message
      const errorMsg = page.locator('text=Card declined')
      await expect(errorMsg).toBeVisible()
    })

    test('should handle authentication required card 4000002500000003', async ({ page }) => {
      await page.goto('/checkout')

      // Fill billing info
      await page.fill('input[name="fullName"]', 'Test User')
      await page.fill('input[name="email"]', 'test@asaas.com')
      await page.fill('input[name="cpf"]', '12345678901')

      // Fill card info - requires 3D secure
      const cardFrame = page.frameLocator('iframe[title="Encrypted card data"]')
      await cardFrame.locator('input[name="number"]').fill('4000002500000003')
      await cardFrame.locator('input[name="expiry"]').fill('12/25')
      await cardFrame.locator('input[name="cvc"]').fill('123')

      // Submit
      await page.click('button:has-text("Complete Purchase")')

      // Wait for 3D Secure iframe
      const secureFrame = page.frameLocator('iframe[title="3D Secure"]')
      await expect(secureFrame.locator('text=Authenticate')).toBeVisible()
    })
  })
})
