import { expect, test } from '@playwright/test'

import { completePaidAcquisitionJourney, getSubscriptionViaApi } from '../shared/acquisition'

test.describe('Full User Journey', () => {
  test.setTimeout(180000)

  test('should complete paid onboarding and access dashboard billing area', async ({ page }) => {
    const { workspaceBasePath } = await completePaidAcquisitionJourney(page)

    await page.goto(`${workspaceBasePath}/billing`)
    await expect(page.getByRole('heading', { name: /Assinatura/i })).toBeVisible()

    const billingContent = page.getByTestId('billing-page-content')
    const billingEmptyState = page.getByTestId('billing-page-empty-state')
    const hasBillingContent = await billingContent.isVisible().catch(() => false)

    if (hasBillingContent) {
      await expect(billingContent).toBeVisible()
    } else {
      await expect(billingEmptyState).toBeVisible()
    }

    await page.goto(`${workspaceBasePath}/projects`)
    await expect(page.getByRole('heading', { name: /Projetos/i })).toBeVisible()

    const subscription = await getSubscriptionViaApi(page)
    expect(subscription.response.ok()).toBeTruthy()
    expect(subscription.body?.subscription?.isActive).toBe(true)
    expect(subscription.body?.subscription?.paymentMethod).toBe('CREDIT_CARD')
  })
})
