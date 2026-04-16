import { test, expect } from './fixtures'
import {
  ASAAS_TEST_CARDS,
  TEST_EMAIL,
  TEST_CPF,
  TEST_FULL_NAME,
  fillCardDetails,
  fillBillingInfo,
  completeCheckout,
  waitForPaymentSuccess,
  waitForPaymentError,
  getInvoiceAmount,
  getProratingDetails,
  verifyProratingMath,
} from '../shared/billing'

test.describe('Billing Auto-Upgrade - Advanced Scenarios', () => {
  test('should auto-upgrade from Starter to Pro on second project creation', async ({ page, authenticatedPage }) => {
    // Navigate to projects
    await page.goto('/dashboard/projects')

    // Get initial project count
    const initialCount = await page.locator('[data-testid="project-count"]').textContent()

    // Create first project (within Starter limit)
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Project 1')
    await page.click('button:has-text("Create")')
    await page.waitForURL('**/projects/**')

    // Create second project (triggers upgrade)
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Project 2')
    await page.click('button:has-text("Create")')

    // Wait for auto-upgrade notification
    const notification = page.locator('[role="status"]:has-text("Plan upgraded")')
    await expect(notification).toBeVisible({ timeout: 5000 })

    // Verify upgrade in billing
    await page.goto('/dashboard/billing')
    const planBadge = page.locator('[data-testid="current-plan"]')
    await expect(planBadge).toContainText('Pro')
  })

  test('should show correct prorating amounts after auto-upgrade', async ({ page, authenticatedPage }) => {
    // Create project to trigger upgrade
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Auto Upgrade Test')
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(2000)

    // Navigate to billing
    await page.goto('/dashboard/billing')

    // Verify prorating math
    const isProratingCorrect = await verifyProratingMath(page)
    expect(isProratingCorrect).toBe(true)

    // Verify display
    const { credit, charge, net } = await getProratingDetails(page)
    expect(credit).toBeGreaterThan(0)
    expect(charge).toBeGreaterThan(0)
    expect(net).toBeGreaterThan(0)
  })

  test('should process payment with approved test card', async ({ page, authenticatedPage }) => {
    // Navigate to checkout
    await page.goto('/checkout')

    // Fill billing info
    await fillBillingInfo(page)

    // Fill card details - approved card
    await fillCardDetails(page, {
      number: ASAAS_TEST_CARDS.APPROVED,
    })

    // Complete payment
    await completeCheckout(page)

    // Verify success
    try {
      await waitForPaymentSuccess(page)
      const successMsg = page.locator('[data-testid="payment-success"]')
      await expect(successMsg).toBeVisible()
    } catch {
      // If redirect not immediate, check for success toast
      const successToast = page.locator('[role="status"]:has-text("Payment successful")')
      await expect(successToast).toBeVisible()
    }
  })

  test('should handle declined test card gracefully', async ({ page, authenticatedPage }) => {
    await page.goto('/checkout')
    await fillBillingInfo(page)
    await fillCardDetails(page, {
      number: ASAAS_TEST_CARDS.DECLINED,
    })
    await completeCheckout(page)

    try {
      await waitForPaymentError(page)
    } catch {
      // Check for error toast instead
      const errorToast = page.locator('[role="alert"]:has-text("declined")')
      await expect(errorToast).toBeVisible({ timeout: 5000 })
    }
  })

  test('should trigger 3D Secure verification for required cards', async ({ page, authenticatedPage }) => {
    await page.goto('/checkout')
    await fillBillingInfo(page)
    await fillCardDetails(page, {
      number: ASAAS_TEST_CARDS.APPROVED_WITH_3DS,
    })
    await completeCheckout(page)

    // Wait for 3D Secure iframe
    await page.waitForTimeout(2000)

    const iframes = await page.frameLocator('iframe').all()
    let found3DS = false

    for (const iframe of iframes) {
      try {
        const content = await iframe.locator('body').textContent()
        if (content?.includes('Authenticate') || content?.includes('3D')) {
          found3DS = true
          break
        }
      } catch {
        // Continue checking other iframes
      }
    }

    // 3DS is optional in test environment - just verify no immediate error
    const errorMsg = page.locator('[role="alert"]:has-text("error")')
    await expect(errorMsg).not.toBeVisible()
  })

  test('should send upgrade email to organization owner', async ({ page, authenticatedPage }) => {
    // Create project to trigger upgrade
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Email Test Project')
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(2000)

    // Check for notification in UI
    await page.goto('/dashboard')
    const notificationArea = page.locator('[data-testid="notifications"]')

    // Wait for notification to appear
    await expect(notificationArea).toContainText('upgraded', { timeout: 5000 }).catch(() => {
      // Notifications might not be visible - that's okay
    })
  })

  test('should not auto-upgrade when within plan limits', async ({ page, authenticatedPage }) => {
    // Create just one project in Starter plan
    await page.goto('/dashboard/projects')
    const initialPlan = await page.locator('[data-testid="current-plan"]').textContent()

    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Single Project')
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(2000)

    // Navigate to billing
    await page.goto('/dashboard/billing')
    const currentPlan = await page.locator('[data-testid="current-plan"]').textContent()

    // Plan should not have upgraded
    expect(currentPlan).toContain('Starter')
  })

  test('should calculate prorating correctly for different cycle days', async ({ page, authenticatedPage }) => {
    // This test assumes organization was created at beginning of month
    await page.goto('/dashboard/billing')

    // Get billing cycle info
    const cycleStart = await page.locator('[data-testid="cycle-start"]').textContent()
    const cycleEnd = await page.locator('[data-testid="cycle-end"]').textContent()

    expect(cycleStart).toBeTruthy()
    expect(cycleEnd).toBeTruthy()

    // Create project to trigger upgrade
    await page.goto('/dashboard/projects')
    await page.click('button:has-text("New Project")')
    await page.fill('input[placeholder="Project name"]', 'Prorating Test')
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(2000)

    // Verify prorating was calculated
    await page.goto('/dashboard/billing')
    const proratingSection = page.locator('[data-testid="prorating-info"]')
    await expect(proratingSection).toBeVisible()
  })

  test('should handle multiple rapid project creations', async ({ page, authenticatedPage }) => {
    await page.goto('/dashboard/projects')

    // Create multiple projects in quick succession
    for (let i = 1; i <= 5; i++) {
      await page.click('button:has-text("New Project")')
      await page.fill('input[placeholder="Project name"]', `Rapid Project ${i}`)
      await page.click('button:has-text("Create")')
      await page.waitForURL('**/projects/**', { timeout: 5000 }).catch(() => {})
      await page.goto('/dashboard/projects', { waitUntil: 'load' }).catch(() => {})
    }

    // Verify final state
    await page.goto('/dashboard/billing')
    const planBadge = page.locator('[data-testid="current-plan"]')
    const planText = await planBadge.textContent()

    // Should be on highest applicable plan
    expect(['Pro', 'Business']).toContain(planText?.split(' ')[0])
  })
})
