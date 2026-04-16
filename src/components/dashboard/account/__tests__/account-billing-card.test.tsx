import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRequiredProjectPathMock = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/project/project-route-context', () => ({
  useRequiredProjectPath: useRequiredProjectPathMock,
}))

import { AccountBillingCard } from '@/components/dashboard/account/account-billing-card'

describe('AccountBillingCard', () => {
  beforeEach(() => {
    useRequiredProjectPathMock.mockReturnValue('/acme/projeto-a/settings/subscription')
  })

  it('shows the contracted plan details when a subscription exists', () => {
    render(
      <AccountBillingCard
        subscription={{
          id: 'sub-1',
          organizationId: 'org-1',
          planType: 'monthly',
          planName: 'WhaTrack Base',
          status: 'active',
          canceledAtPeriodEnd: false,
          billingCycleStartDate: '2026-03-01T00:00:00.000Z',
          billingCycleEndDate: '2026-03-31T00:00:00.000Z',
          nextResetDate: '2026-03-31T00:00:00.000Z',
          createdAt: '2026-03-01T00:00:00.000Z',
          canceledAt: null,
          provider: 'asaas',
          paymentMethod: 'CREDIT_CARD',
          isActive: true,
          failureCount: 0,
          lastInvoice: null,
        }}
      />,
    )

    expect(screen.getByText('Plano atual')).toBeInTheDocument()
    expect(screen.getByText('WhaTrack Base')).toBeInTheDocument()
    expect(screen.getByText('Cartão de crédito')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir assinatura' })).toHaveAttribute(
      'href',
      '/acme/projeto-a/settings/subscription',
    )
  })

  it('shows only a redirect to subscription management when there is no active subscription', () => {
    render(<AccountBillingCard subscription={null} />)

    expect(screen.getByText('Nenhum plano ativo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir assinatura' })).toHaveAttribute(
      'href',
      '/acme/projeto-a/settings/subscription',
    )
    expect(screen.queryByText('Escolha um plano para seguir com a configuração.')).not.toBeInTheDocument()
  })

  it('shows PIX Automático as the payment method when applicable', () => {
    render(
      <AccountBillingCard
        subscription={{
          id: 'sub-1',
          organizationId: 'org-1',
          planType: 'monthly',
          planName: 'WhaTrack Base',
          status: 'pending',
          canceledAtPeriodEnd: false,
          billingCycleStartDate: '2026-03-01T00:00:00.000Z',
          billingCycleEndDate: '2026-03-31T00:00:00.000Z',
          nextResetDate: '2026-03-31T00:00:00.000Z',
          createdAt: '2026-03-01T00:00:00.000Z',
          canceledAt: null,
          provider: 'asaas',
          paymentMethod: 'PIX_AUTOMATIC',
          isActive: false,
          failureCount: 0,
          lastInvoice: null,
        }}
      />,
    )

    expect(screen.getByText('PIX Automático')).toBeInTheDocument()
  })
})
