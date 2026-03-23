import type { Prisma } from '@/lib/db/client'
import type { LongMemory } from '@/lib/ai/schemas/long-memory'

export interface LeadAiContextUpdate {
  profileSummary?: string | null
  detectedLanguage?: string | null
  sentimentTrend?: string | null
  longMemory?: LongMemory | Prisma.InputJsonValue | null
  lifecycleStage?: string
  aiScore?: number | null
  aiScoreReason?: string | null
  aiScoreUpdatedAt?: Date | null
  suggestedNextAction?: string | null
  suggestedNextActionAt?: Date | null
}

export interface LeadContextForPrompt {
  lead: {
    id: string
    organizationId: string
    projectId: string | null
    name: string | null
    mail: string | null
    phone: string | null
    waId: string | null
    pushName: string | null
  }
  context: {
    id: string
    profileSummary: string | null
    detectedLanguage: string | null
    sentimentTrend: string | null
    lifecycleStage: string
    aiScore: number | null
    aiScoreReason: string | null
    suggestedNextAction: string | null
    longMemory: LongMemory | null
  }
}
