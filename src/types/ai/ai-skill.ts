export type AiSkillKind = 'SHARED' | 'AGENT'
export type AiSkillSource = 'SYSTEM' | 'CUSTOM'

export interface AiSkill {
  id: string
  organizationId: string
  slug: string
  name: string
  description?: string | null
  content: string
  kind: AiSkillKind
  source: AiSkillSource
  isActive: boolean
  createdAt: string
  updatedAt: string
}
