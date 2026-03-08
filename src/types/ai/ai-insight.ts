export interface AiInsightPayload {
  reasoning?: string | null
  itemName?: string | null
  dealValue?: number | string | null
  intent?: string | null
}

export interface AiInsightSummary {
  id: string
  organizationId: string
  ticketId: string
  status: string
  payload: unknown
  createdAt: string
  updatedAt: string
  agent: {
    name: string | null
    icon: string | null
  } | null
  ticket: {
    id: string
    conversationId: string
    status: string
    conversation: {
      id: string
      lead: {
        name: string | null
        phone: string | null
        profilePicUrl: string | null
      } | null
    } | null
  } | null
}
