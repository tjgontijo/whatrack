'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


interface VolumeDataPoint {
  date: string
  leads: number
  tickets: number
  sales: number
}

interface StatusData {
  open: number
  closed: number
  won: number
  lost: number
}

interface DashboardCards {
  totalLeads: number
  activeConversations: number
  openTickets: number
  conversionRate: number
  messagesReceived: number
  messagesSent: number
}

interface DashboardCharts {
  volumeByDay: VolumeDataPoint[]
  byStatus: StatusData
}

interface DashboardAnalyticsResponse {
  cards: DashboardCards
  charts: DashboardCharts
  avgResponseTime: number | null
  avgLeadScore: number | null
}

interface AgentMetrics {
  userId: string
  name: string
  email: string
  image: string | null
  ticketsAssigned: number
  ticketsClosed: number
  ticketsWon: number
  salesCount: number
  messagesSent: number
  avgResponseTimeMs: number | null
  avgSentimentScore: number | null
  conversionRate: number
}

interface AgentsAnalyticsResponse {
  agents: AgentMetrics[]
  period: string
  totalAgents: number
}

export type Period = '7d' | '30d' | '90d'



async function fetchDashboardAnalytics(period: Period, orgId: string): Promise<DashboardAnalyticsResponse> {
  const data = await apiFetch(`/api/v1/dashboard/analytics?period=${period}`, {
    orgId,
  })
  return data as DashboardAnalyticsResponse
}

async function fetchAgentsAnalytics(period: Period, orgId: string): Promise<AgentsAnalyticsResponse> {
  const data = await apiFetch(`/api/v1/dashboard/analytics/agents?period=${period}`, {
    orgId,
  })
  return data as AgentsAnalyticsResponse
}


export function useDashboardAnalytics(period: Period = '7d') {
  const { data: org } = useOrganization()

  return useQuery<DashboardAnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', period, org?.id],
    queryFn: () => fetchDashboardAnalytics(period, org!.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!org?.id,
  })
}

export function useAgentsAnalytics(period: Period = '7d') {
  const { data: org } = useOrganization()

  return useQuery<AgentsAnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', 'agents', period, org?.id],
    queryFn: () => fetchAgentsAnalytics(period, org!.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!org?.id,
  })
}

export type {
  DashboardAnalyticsResponse,
  AgentsAnalyticsResponse,
  DashboardCards,
  DashboardCharts,
  VolumeDataPoint,
  StatusData,
  AgentMetrics,
}
