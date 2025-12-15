'use client'

import { useQuery } from '@tanstack/react-query'

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

async function fetchDashboardAnalytics(
  period: Period
): Promise<DashboardAnalyticsResponse> {
  const response = await fetch(`/api/v1/dashboard/analytics?period=${period}`)
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard analytics')
  }
  return response.json()
}

async function fetchAgentsAnalytics(
  period: Period
): Promise<AgentsAnalyticsResponse> {
  const response = await fetch(
    `/api/v1/dashboard/analytics/agents?period=${period}`
  )
  if (!response.ok) {
    throw new Error('Failed to fetch agents analytics')
  }
  return response.json()
}

export function useDashboardAnalytics(period: Period = '7d') {
  return useQuery<DashboardAnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', period],
    queryFn: () => fetchDashboardAnalytics(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useAgentsAnalytics(period: Period = '7d') {
  return useQuery<AgentsAnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', 'agents', period],
    queryFn: () => fetchAgentsAnalytics(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
