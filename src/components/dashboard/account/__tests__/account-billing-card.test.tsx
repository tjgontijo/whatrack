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
          planType: 'platform_base',
          planName: 'WhaTrack Base',
          status: 'active',
          canceledAtPeriodEnd: false,
          billingCycleStartDate: '2026-03-01T00:00:00.000Z',
          billingCycleEndDate: '2026-03-31T00:00:00.000Z',
          nextResetDate: '2026-03-31T00:00:00.000Z',
          createdAt: '2026-03-01T00:00:00.000Z',
          canceledAt: null,
          provider: 'stripe',
          providerSubscriptionId: 'bill-1',
          items: [],
          entitlements: {
            includedProjects: 3,
            activeProjects: 2,
            additionalProjects: 0,
            includedWhatsAppPerProject: 1,
            additionalWhatsAppNumbers: 0,
            includedMetaAdAccountsPerProject: 1,
            additionalMetaAdAccounts: 0,
            includedConversionsPerProject: 300,
            includedAiCreditsPerProject: 10000,
          },
        }}
      />,
    )

    expect(screen.getByText('Plano atual')).toBeInTheDocument()
    expect(screen.getByText('WhaTrack Base')).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
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

  it('shows local trial status when the organization is in the free trial window', () => {
    render(
      <AccountBillingCard
        subscription={{
          id: 'sub-1',
          organizationId: 'org-1',
          planType: 'platform_base',
          planName: 'WhaTrack Base',
          status: 'active',
          canceledAtPeriodEnd: false,
          billingCycleStartDate: '2026-03-01T00:00:00.000Z',
          billingCycleEndDate: '2026-03-31T00:00:00.000Z',
          nextResetDate: '2026-03-31T00:00:00.000Z',
          trialEndsAt: '2099-03-31T00:00:00.000Z',
          createdAt: '2026-03-01T00:00:00.000Z',
          canceledAt: null,
          provider: 'stripe',
          providerSubscriptionId: null,
          items: [],
          entitlements: {
            includedProjects: 3,
            activeProjects: 1,
            additionalProjects: 0,
            includedWhatsAppPerProject: 1,
            additionalWhatsAppNumbers: 0,
            includedMetaAdAccountsPerProject: 1,
            additionalMetaAdAccounts: 0,
            includedConversionsPerProject: 300,
            includedAiCreditsPerProject: 10000,
          },
        }}
      />,
    )

    expect(screen.getByText('Teste grátis ativo')).toBeInTheDocument()
  })
})
