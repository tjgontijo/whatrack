export const AI_EVENT_TYPES = [
  'MESSAGE_SENT',
  'TEMPLATE_SENT',
  'SKILL_EXECUTED',
  'CONTEXT_UPDATED',
  'CADENCE_ENROLLED',
  'CADENCE_STEP_EXECUTED',
  'CADENCE_INTERRUPTED',
  'CADENCE_COMPLETED',
  'CRISIS_DETECTED',
  'LEAD_SCORED',
  'LEAD_STAGED',
  'SUGGESTION_MADE',
  'TRIAGE_COMPLETED',
  'ERROR',
] as const

export type AiEventType = (typeof AI_EVENT_TYPES)[number]

export const AI_EVENT_CHANNELS = ['whatsapp', 'internal', 'system'] as const
export type AiEventChannel = (typeof AI_EVENT_CHANNELS)[number]

export const AI_EVENT_DIRECTIONS = ['inbound', 'outbound', 'internal'] as const
export type AiEventDirection = (typeof AI_EVENT_DIRECTIONS)[number]
