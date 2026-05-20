import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { listTemplatesService } from './list-templates.service'
import { applyTemplateService } from './apply-template.service'

describe('deal-stage-templates.service (Integration)', () => {
  let orgId: string
  let projectId: string
  let templateId: string

  beforeEach(async () => {
    // 1. Create Organization & Project
    const org = await prisma.organization.create({
      data: {
        name: 'Template Test Org',
        slug: `tpl-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: 'Template Test Project',
        slug: `tpl-project-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    projectId = project.id

    // 2. Create a Public Template
    const template = await prisma.dealStageTemplate.create({
      data: {
        name: 'Standard Funnel',
        category: 'Sales',
        icon: 'briefcase',
        isPersonal: false,
        items: {
          create: [
            { name: 'Lead', order: 0, color: '#000', statusGroup: 'ACTIVE', probability: 10 },
            { name: 'Closed', order: 1, color: '#f00', statusGroup: 'WON', probability: 100, suggestedMetaEventName: 'Purchase' },
          ],
        },
      },
    })
    templateId = template.id
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
    // Template might be reused or deleted, but since it's created in beforeEach with random data (not really random name yet but templateId is unique), we should clean it up if we want isolation.
    if (templateId) {
        await prisma.dealStageTemplate.delete({ where: { id: templateId } }).catch(() => {})
    }
  })

  it('lists public and personal templates', async () => {
    // Create another org for personal template isolation test
    const otherOrg = await prisma.organization.create({
      data: { name: 'Other Org', slug: 'other-org' }
    })
    const otherProject = await prisma.project.create({
      data: { organizationId: otherOrg.id, name: 'Other Proj', slug: 'other-proj' }
    })

    // Create a personal template for another org
    await prisma.dealStageTemplate.create({
      data: {
        name: 'Other Personal',
        isPersonal: true,
        organizationId: otherOrg.id,
        projectId: otherProject.id,
        items: { create: [{ name: 'Step', order: 0, color: '#ccc', statusGroup: 'ACTIVE', probability: 0 }] },
      },
    })

    // Create a personal template for current org
    await prisma.dealStageTemplate.create({
      data: {
        name: 'My Custom Template',
        isPersonal: true,
        organizationId: orgId,
        projectId: projectId,
        items: { create: [{ name: 'Custom Step', order: 0, color: '#eee', statusGroup: 'ACTIVE', probability: 0 }] },
      },
    })

    const result = await listTemplatesService(orgId, projectId)
    
    expect(result.data).toBeDefined()
    const names = result.data.map(t => t.name)
    expect(names).toContain('Standard Funnel')
    expect(names).toContain('My Custom Template')
    expect(names).not.toContain('Other Personal')

    // Cleanup other org
    await prisma.organization.delete({ where: { id: otherOrg.id } })
  })

  it('applies a template to a project', async () => {
    // 0. Get a lead source (required for Lead)
    const source = await prisma.leadSource.findFirst({ where: { name: 'live_message' } })

    // 0.1 Create a WhatsApp instance (required for Conversation)
    const instance = await prisma.whatsAppConfig.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        status: 'active',
      }
    })

    // 1. Create a lead and a conversation (required for Deal)
    const lead = await prisma.lead.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        phone: '5511999999999',
        source: { connect: { id: source!.id } },
      },
    })

    const conversation = await prisma.conversation.create({
      data: {
        organization: { connect: { id: orgId } },
        projectId,
        lead: { connect: { id: lead.id } },
        instance: { connect: { id: instance.id } },
      },
    })

    // 2. Pre-create some stages and a deal
    const oldStage = await prisma.dealStage.create({
      data: {
        organization: { connect: { id: orgId } },
        projectId,
        name: 'Old Stage',
        order: 0,
        color: '#888',
      },
    })

    const deal = await prisma.deal.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        lead: { connect: { id: lead.id } },
        conversation: { connect: { id: conversation.id } },
        stage: { connect: { id: oldStage.id } },
        status: { connect: { id: (await prisma.dealStatus.findFirst({ where: { name: 'open' } }))!.id } },
      },
    })

    // 3. Apply template
    const result = await applyTemplateService({
      organizationId: orgId,
      projectId,
      templateId,
    })

    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(2)
    
    const newStages = await prisma.dealStage.findMany({
      where: { organizationId: orgId, projectId },
      orderBy: { order: 'asc' },
    })

    expect(newStages).toHaveLength(2)
    expect(newStages[0].name).toBe('Lead')
    expect(newStages[1].name).toBe('Closed')

    // 4. Verify deal was moved to default stage (Lead)
    const updatedDeal = await prisma.deal.findUnique({
      where: { id: deal.id },
    })
    expect(updatedDeal?.stageId).toBe(newStages[0].id)

    // 5. Verify old stage was deleted
    const checkOld = await prisma.dealStage.findUnique({
      where: { id: oldStage.id },
    })
    expect(checkOld).toBeNull()
  })

  it('creates Meta rules if a pixel is active', async () => {
    // 1. Create an active pixel
    await prisma.metaPixel.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        pixelId: '123456789',
        capiToken: 'token',
        isActive: true,
      },
    })

    // 2. Apply template (which has 'Purchase' suggested for second stage)
    await applyTemplateService({
      organizationId: orgId,
      projectId,
      templateId,
    })

    // 3. Check rules
    const rules = await prisma.dealStageMetaRule.findMany({
      where: {
        stage: { organizationId: orgId, projectId },
      },
      include: { stage: true },
    })

    expect(rules).toHaveLength(1)
    expect(rules[0].eventName).toBe('Purchase')
    expect(rules[0].stage.name).toBe('Closed')
  })
})
