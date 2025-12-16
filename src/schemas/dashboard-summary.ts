import { z } from 'zod'

const salesByServiceSliceSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().nonnegative(),
})

const productFilterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const productFiltersSchema = z.object({
  categories: z.array(productFilterOptionSchema),
  productsByCategory: z.record(z.string(), z.array(productFilterOptionSchema)),
})

const originSummarySchema = z.object({
  label: z.string(),
  sourceType: z.string().nullable(),
  leads: z.number().int().nonnegative(),
  schedules: z.number().int().nonnegative(),
  attendances: z.number().int().nonnegative(),
  sales: z.number().int().nonnegative(),
  revenue: z.number(),
  cost: z.number(),
  roas: z.number().nullable(),
  cac: z.number().nullable(),
})

const paidCampaignSummarySchema = z.object({
  campaignId: z.string().nullable(),
  adsetId: z.string().nullable(),
  adId: z.string().nullable(),
  campaign: z.string().nullable(),
  adset: z.string().nullable(),
  ad: z.string().nullable(),
  investment: z.number(),
  revenue: z.number(),
  profit: z.number(),
  roas: z.number().nullable(),
  cac: z.number().nullable(),
  leads: z.number().int().nonnegative(),
  schedules: z.number().int().nonnegative(),
  attendances: z.number().int().nonnegative(),
  sales: z.number().int().nonnegative(),
  conversion: z.number().nullable(),
})

export const dashboardSummaryResponseSchema = z.object({
  netRevenue: z.number(),
  sales: z.number().int().nonnegative(),
  investment: z.number(),

  servicesCount: z.number().int().nonnegative(),

  productsCost: z.number(),
  grossProfit: z.number(),
  netProfit: z.number(),

  roas: z.number().nullable(),
  roi: z.number().nullable(),
  returnOnInvestment: z.number().nullable(),

  salesByService: z.array(salesByServiceSliceSchema),

  trafficSources: z.array(z.string().nullable()),

  trafficTypes: z.array(z.string()),

  period: z
    .object({
      gte: z.string(),
      lte: z.string(),
    })
    .nullable(),

  cards: z.object({
    revenue: z.number(),
    investment: z.number(),
    roas: z.number().nullable(),
    cac: z.number().nullable(),
    ticket: z.number().nullable(),
  }),

  funnel: z.object({
    leads: z.number().int().nonnegative(),
    schedules: z.number().int().nonnegative(),
    attendances: z.number().int().nonnegative(),
    sales: z.number().int().nonnegative(),
  }),

  productFilters: productFiltersSchema,

  origins: z.array(originSummarySchema),

  paidCampaigns: z.array(paidCampaignSummarySchema),
})

export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>
