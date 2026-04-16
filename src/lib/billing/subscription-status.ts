import type { SubscriptionStatus } from '@/types/billing/billing'

export const BILLING_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: 'Inativo',
  PENDING: 'Aguardando confirmação',
  ACTIVE: 'Ativo',
  OVERDUE: 'Pagamento pendente',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
  FAILED: 'Falha',
}

export function getBillingStatusLabel(status: SubscriptionStatus): string {
  return BILLING_STATUS_LABELS[status]
}
