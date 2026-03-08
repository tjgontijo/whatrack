import { prisma } from '@/lib/db/prisma'

interface TokenCost {
  inputPrice: number  // $ per 1M tokens
  outputPrice: number // $ per 1M tokens
}

const TOKEN_COSTS: Record<string, TokenCost> = {
  'openai/gpt-4o-mini': { inputPrice: 0.15, outputPrice: 0.60 },
  'openai/gpt-4o': { inputPrice: 2.5, outputPrice: 10.0 },
  'groq/mixtral-8x7b': { inputPrice: 0.27, outputPrice: 0.27 },
}

function getTokenCosts(model: string): TokenCost {
  return TOKEN_COSTS[model] || TOKEN_COSTS['openai/gpt-4o-mini']
}

export interface RecordAiCostParams {
  organizationId: string
  aiInsightId: string
  feature: string         // "meta-ads-audit", "ticket-analysis", etc
  operation: string       // "account-analysis", "conversation-idle", etc
  agentName: string
  eventType: string
  modelUsed: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
}

export async function recordAiCost(params: RecordAiCostParams) {
  const costs = getTokenCosts(params.modelUsed)

  // Calculate costs in dollars
  const inputCost = (params.inputTokens * costs.inputPrice) / 1_000_000
  const outputCost = (params.outputTokens * costs.outputPrice) / 1_000_000
  const totalCost = inputCost + outputCost

  return prisma.aiInsightCost.create({
    data: {
      organizationId: params.organizationId,
      aiInsightId: params.aiInsightId,
      feature: params.feature,
      operation: params.operation,
      agentName: params.agentName,
      eventType: params.eventType,
      modelUsed: params.modelUsed,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: totalCost,
      latencyMs: params.latencyMs,
      status: params.status,
      errorMessage: params.errorMessage,
    },
  })
}

export async function getAiUsageStats(organizationId: string, daysBack: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const [totalStats, byFeature, dailyStats] = await Promise.all([
    // Total stats for period
    prisma.aiInsightCost.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        status: 'success',
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        totalCost: true,
      },
      _count: true,
    }),

    // Breakdown by feature
    prisma.aiInsightCost.groupBy({
      by: ['feature'],
      where: {
        organizationId,
        createdAt: { gte: startDate },
        status: 'success',
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      _count: true,
    }),

    // Daily breakdown
    prisma.$queryRaw<
      Array<{
        date: Date
        total_cost: number
        call_count: number
        total_tokens: number
      }>
    >`
      SELECT
        DATE(created_at) as date,
        SUM(total_cost) as total_cost,
        COUNT(*) as call_count,
        SUM(total_tokens) as total_tokens
      FROM ai_insight_costs
      WHERE organization_id = ${organizationId}
        AND status = 'success'
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
  ])

  return {
    totals: {
      calls: totalStats._count,
      inputTokens: totalStats._sum.inputTokens || 0,
      outputTokens: totalStats._sum.outputTokens || 0,
      totalTokens: totalStats._sum.totalTokens || 0,
      estimatedUSD: totalStats._sum.totalCost ? parseFloat(totalStats._sum.totalCost.toString()) : 0,
    },
    byFeature: byFeature.map((f) => ({
      feature: f.feature,
      calls: f._count,
      totalTokens: f._sum.totalTokens || 0,
      estimatedUSD: f._sum.totalCost ? parseFloat(f._sum.totalCost.toString()) : 0,
    })),
    daily: dailyStats.map((d) => ({
      date: d.date,
      estimatedUSD: parseFloat(d.total_cost.toString()),
      calls: d.call_count,
      totalTokens: d.total_tokens || 0,
    })),
  }
}

export async function getAiUsageLogs(
  organizationId: string,
  options: {
    page?: number
    limit?: number
    feature?: string
    status?: string
    eventType?: string
  } = {}
) {
  const page = options.page || 1
  const limit = options.limit || 10
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.aiInsightCost.findMany({
      where: {
        organizationId,
        ...(options.feature && { feature: options.feature }),
        ...(options.status && { status: options.status }),
        ...(options.eventType && { eventType: options.eventType }),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        feature: true,
        operation: true,
        agentName: true,
        eventType: true,
        modelUsed: true,
        totalTokens: true,
        totalCost: true,
        latencyMs: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    }),

    prisma.aiInsightCost.count({
      where: {
        organizationId,
        ...(options.feature && { feature: options.feature }),
        ...(options.status && { status: options.status }),
        ...(options.eventType && { eventType: options.eventType }),
      },
    }),
  ])

  return {
    logs: logs.map((log) => ({
      ...log,
      totalCost: log.totalCost ? parseFloat(log.totalCost.toString()) : 0,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}
