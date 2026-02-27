export interface AiAgentSkillSnapshot {
  id: string
  slug: string
  name: string
  kind: string
  source: string
  isActive: boolean
}

export interface AiAgentSkillBinding {
  id: string
  agentId: string
  skillId: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  skill: AiAgentSkillSnapshot
}

export interface FormSkillBinding {
  skillId: string
  sortOrder: number
  isActive: boolean
  skill: AiAgentSkillSnapshot
}
