/**
 * API Routes - /api/v1/settings/followup-config
 *
 * GET   - Get organization's follow-up configuration
 * POST  - Create/update follow-up configuration
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSyncUser, getCurrentOrganization } from '@/lib/auth/server'

interface FollowupConfigRequest {
  isActive: boolean
  businessHoursOnly: boolean
  businessStartHour: number
  businessEndHour: number
  businessDays: number[]
  aiTone: string
  businessType?: string
  productDescription?: string
  steps: Array<{
    order: number
    delayMinutes: number
  }>
}

interface FollowupConfigResponse {
  id: string
  isActive: boolean
  businessHoursOnly: boolean
  businessStartHour: number
  businessEndHour: number
  businessDays: number[]
  aiTone: string
  businessType: string | null
  productDescription: string | null
  steps: Array<{
    id: string
    order: number
    delayMinutes: number
  }>
}

/**
 * GET - Get organization's follow-up configuration
 */
export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const config = await prisma.followUpConfig.findUnique({
      where: { organizationId: organization.id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!config) {
      // Return default config if not set up yet
      return NextResponse.json({
        isActive: false,
        businessHoursOnly: true,
        businessStartHour: 9,
        businessEndHour: 18,
        businessDays: [1, 2, 3, 4, 5],
        aiTone: 'professional',
        businessType: null,
        productDescription: null,
        steps: [
          { order: 1, delayMinutes: 30 },
          { order: 2, delayMinutes: 120 },
          { order: 3, delayMinutes: 1440 },
        ],
      })
    }

    const response: FollowupConfigResponse = {
      id: config.id,
      isActive: config.isActive,
      businessHoursOnly: config.businessHoursOnly,
      businessStartHour: config.businessStartHour,
      businessEndHour: config.businessEndHour,
      businessDays: config.businessDays,
      aiTone: config.aiTone,
      businessType: config.businessType,
      productDescription: config.productDescription,
      steps: config.steps.map((s) => ({
        id: s.id,
        order: s.order,
        delayMinutes: s.delayMinutes,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get follow-up config:', error)
    return NextResponse.json({ error: 'Failed to get follow-up config' }, { status: 500 })
  }
}

/**
 * POST - Create/update follow-up configuration
 */
export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const body: FollowupConfigRequest = await request.json()

    // Validate steps
    if (!body.steps || body.steps.length === 0) {
      return NextResponse.json({ error: 'At least one step is required' }, { status: 400 })
    }

    if (body.steps.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 steps allowed' }, { status: 400 })
    }

    // Validate business hours
    if (body.businessStartHour >= body.businessEndHour) {
      return NextResponse.json(
        { error: 'Business start hour must be before end hour' },
        { status: 400 }
      )
    }

    // Validate business days
    if (body.businessDays.length === 0) {
      return NextResponse.json({ error: 'At least one business day is required' }, { status: 400 })
    }

    // Upsert config
    const config = await prisma.followUpConfig.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        isActive: body.isActive,
        businessHoursOnly: body.businessHoursOnly,
        businessStartHour: body.businessStartHour,
        businessEndHour: body.businessEndHour,
        businessDays: body.businessDays,
        aiTone: body.aiTone,
        businessType: body.businessType,
        productDescription: body.productDescription,
      },
      update: {
        isActive: body.isActive,
        businessHoursOnly: body.businessHoursOnly,
        businessStartHour: body.businessStartHour,
        businessEndHour: body.businessEndHour,
        businessDays: body.businessDays,
        aiTone: body.aiTone,
        businessType: body.businessType,
        productDescription: body.productDescription,
      },
    })

    // Delete existing steps and create new ones
    await prisma.followUpStep.deleteMany({
      where: { configId: config.id },
    })

    await prisma.followUpStep.createMany({
      data: body.steps.map((step) => ({
        configId: config.id,
        order: step.order,
        delayMinutes: step.delayMinutes,
      })),
    })

    // Fetch updated config with steps
    const updatedConfig = await prisma.followUpConfig.findUnique({
      where: { id: config.id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    })
  } catch (error) {
    console.error('Failed to save follow-up config:', error)
    return NextResponse.json({ error: 'Failed to save follow-up config' }, { status: 500 })
  }
}
