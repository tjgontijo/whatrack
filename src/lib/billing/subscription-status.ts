import type { SubscriptionStatus } from '@/types/billing/billing'

export const BILLING_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativo',
  paused: 'Aguardando confirmação',
  canceled: 'Cancelado',
  past_due: 'Pagamento pendente',
}

export function getBillingStatusLabel(status: SubscriptionStatus): string {
  return BILLING_STATUS_LABELS[status]
}
