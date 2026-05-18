import { expect, test } from '@playwright/test'

import {
  completePaidAcquisitionJourney,
  createProjectViaApi,
  getSubscriptionViaApi,
  listProjectsViaApi,
} from '../shared/acquisition'

test.describe('Billing - Project Growth Advanced', () => {
  test.setTimeout(180000)

  test('should keep subscription consistent while creating multiple projects', async ({ page }) => {
    await completePaidAcquisitionJourney(page)

    const subscriptionBefore = await getSubscriptionViaApi(page)
    expect(subscriptionBefore.response.ok()).toBeTruthy()
    expect(subscriptionBefore.body?.subscription?.isActive).toBe(true)
    const beforePlanCode = subscriptionBefore.body?.subscription?.planCode ?? null

    const createdSlugs: string[] = []
    for (let index = 1; index <= 3; index++) {
      const timestamp = Date.now() + index
      const slug = `growth-${timestamp}`
      const result = await createProjectViaApi(page, {
        name: `Growth Project ${index}`,
        slug,
      })

      expect(
        result.response.status(),
        `Project creation failed for ${slug}: ${JSON.stringify(result.body)}`
      ).toBe(201)

      createdSlugs.push(slug)
    }

    const projects = await listProjectsViaApi(page)
    expect(projects.response.ok()).toBeTruthy()

    const listedSlugs = (projects.body?.items ?? []).map((item: { slug?: string }) => item.slug)
    for (const createdSlug of createdSlugs) {
      expect(listedSlugs).toContain(createdSlug)
    }

    const subscriptionAfter = await getSubscriptionViaApi(page)
    expect(subscriptionAfter.response.ok()).toBeTruthy()
    expect(subscriptionAfter.body?.subscription?.isActive).toBe(true)
    expect(typeof subscriptionAfter.body?.subscription?.planCode).toBe('string')

    const afterPlanCode = subscriptionAfter.body?.subscription?.planCode
    if (beforePlanCode && afterPlanCode !== beforePlanCode) {
      expect(['pro_monthly', 'business_monthly']).toContain(afterPlanCode)
    }
  })
})
