import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccountBillingCard } from '@/components/dashboard/account/account-billing-card'

describe('AccountBillingCard', () => {
  it('shows the contracted plan details when a subscription exists', () => {
    render(
      <AccountBillingCard
        subscription={{
          id: 'sub-1',
          organizationId: 'org-1',
          planType: 'pro',
          status: 'active',
          canceledAtPeriodEnd: false,
          billingCycleStartDate: '2026-03-01T00:00:00.000Z',
          billingCycleEndDate: '2026-03-31T00:00:00.000Z',
          nextResetDate: '2026-03-31T00:00:00.000Z',
          eventLimitPerMonth: 500,
          eventsUsedInCurrentCycle: 42,
          createdAt: '2026-03-01T00:00:00.000Z',
          canceledAt: null,
          provider: 'stripe',
          providerSubscriptionId: 'bill-1',
        }}
      />,
    )

    expect(screen.getByText('Plano atual')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir billing' })).toHaveAttribute(
      'href',
      '/dashboard/billing',
    )
  })

  it('shows only a redirect to billing when there is no active subscription', () => {
    render(<AccountBillingCard subscription={null} />)

    expect(screen.getByText('Nenhum plano ativo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir billing' })).toHaveAttribute(
      'href',
      '/dashboard/billing',
    )
    expect(screen.queryByText('Escolha um plano para seguir com a configuração.')).not.toBeInTheDocument()
  })
})
