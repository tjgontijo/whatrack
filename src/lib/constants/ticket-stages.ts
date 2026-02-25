export const DEFAULT_TICKET_STAGES = [
  { name: 'Novo', color: '#6366f1', order: 1, isDefault: true, isClosed: false },
  { name: 'Em Atendimento', color: '#f59e0b', order: 2, isDefault: false, isClosed: false },
  { name: 'Negociação', color: '#8b5cf6', order: 3, isDefault: false, isClosed: false },
  { name: 'Fechado/Ganho', color: '#22c55e', order: 4, isDefault: false, isClosed: true },
  { name: 'Fechado/Perdido', color: '#ef4444', order: 5, isDefault: false, isClosed: true },
] as const
