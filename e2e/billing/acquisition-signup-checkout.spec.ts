import { expect, test } from '@playwright/test'

import {
  cleanupAcquisitionAsaasResources,
  completePaidAcquisitionJourney,
} from '../shared/acquisition'

test.describe('Critical Acquisition Journey', () => {
  test.setTimeout(180000)

  test('home -> pricing plan -> sign-up -> credit card checkout -> dashboard', async ({ page }) => {
    let cleanupShouldBeStrict = false
    let cleanupResult: Awaited<ReturnType<typeof cleanupAcquisitionAsaasResources>> | null = null

    try {
      await completePaidAcquisitionJourney(page)
      cleanupShouldBeStrict = true
      await expect(page.getByRole('button', { name: /Dashboard/i })).toBeVisible()
    } finally {
      cleanupResult = await cleanupAcquisitionAsaasResources(page)
    }

    if (cleanupShouldBeStrict && cleanupResult) {
      expect(
        cleanupResult.cancelApi.ok,
        `Cancel API failed: status=${cleanupResult.cancelApi.status} body=${JSON.stringify(cleanupResult.cancelApi.body)}`
      ).toBeTruthy()
      expect(
        cleanupResult.asaas.subscription?.ok,
        `Asaas subscription cleanup failed: ${JSON.stringify(cleanupResult.asaas.subscription)}`
      ).toBeTruthy()
      expect(
        cleanupResult.asaas.customer?.ok,
        `Asaas customer cleanup failed: ${JSON.stringify(cleanupResult.asaas.customer)}`
      ).toBeTruthy()
    }
  })
})
