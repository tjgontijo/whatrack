import type { SubscriptionStatus } from '@/types/billing/billing'

export const BILLING_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativo',
  pending: 'Aguardando confirmacao',
  paused: 'Aguardando confirmação',
  canceled: 'Cancelado',
  past_due: 'Pagamento pendente',
  inactive: 'Inativo',
}

export function getBillingStatusLabel(status: SubscriptionStatus): string {
  return BILLING_STATUS_LABELS[status]
}
