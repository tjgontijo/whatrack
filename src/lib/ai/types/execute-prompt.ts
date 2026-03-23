export interface ExecutePromptInput {
  organizationId: string
  projectId?: string | null
  agentSlug: string
  prompt: string
  leadId?: string
  ticketId?: string
  maxSteps?: number
  modelSettings?: {
    temperature?: number
    topP?: number
    maxOutputTokens?: number
  }
}

export interface ExecutePromptResult {
  agentSlug: string
  text: string
  finishReason?: string
  modelId?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  durationMs: number
  runId?: string
  traceId?: string
}
