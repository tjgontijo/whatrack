export const DEFAULT_DEAL_STAGES = [
  { name: 'Novo Lead', color: '#6366f1', order: 0, isDefault: true, isClosed: false },
  { name: 'Qualificado', color: '#8b5cf6', order: 1, isDefault: false, isClosed: false },
  { name: 'Orçamento Enviado', color: '#f59e0b', order: 2, isDefault: false, isClosed: false },
  { name: 'Agendado', color: '#0ea5e9', order: 3, isDefault: false, isClosed: false },
  { name: 'Venda Ganha', color: '#22c55e', order: 4, isDefault: false, isClosed: true },
  { name: 'Venda Perdida', color: '#ef4444', order: 5, isDefault: false, isClosed: true },
] as const
