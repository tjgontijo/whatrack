import { test, expect } from '@playwright/test'

import {
  completePaidAcquisitionJourney,
  createProjectViaApi,
  getSubscriptionViaApi,
  listProjectsViaApi,
} from '../shared/acquisition'

test.describe('Billing - Project Expansion', () => {
  test.setTimeout(180000)

  test('should create an extra project after paid checkout', async ({ page }) => {
    await completePaidAcquisitionJourney(page)

    const subscriptionBefore = await getSubscriptionViaApi(page)
    expect(subscriptionBefore.response.ok()).toBeTruthy()
    expect(subscriptionBefore.body?.subscription?.isActive).toBe(true)

    const projectName = `Auto Upgrade Project ${Date.now()}`
    const projectSlug = `auto-upgrade-${Date.now()}`

    const createdProject = await createProjectViaApi(page, {
      name: projectName,
      slug: projectSlug,
    })

    expect(
      createdProject.response.status(),
      `Unexpected project creation response: ${JSON.stringify(createdProject.body)}`,
    ).toBe(201)

    const projects = await listProjectsViaApi(page)
    expect(projects.response.ok()).toBeTruthy()

    const projectSlugs = (projects.body?.items ?? []).map(
      (item: { slug?: string }) => item.slug,
    )
    expect(projectSlugs).toContain(projectSlug)

    const subscriptionAfter = await getSubscriptionViaApi(page)
    expect(subscriptionAfter.response.ok()).toBeTruthy()
    expect(subscriptionAfter.body?.subscription?.isActive).toBe(true)
    expect(typeof subscriptionAfter.body?.subscription?.planCode).toBe('string')
  })
})
