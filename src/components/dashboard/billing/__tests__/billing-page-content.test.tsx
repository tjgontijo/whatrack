import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useBillingSubscriptionMock = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/organization/use-organization', () => ({
  useOrganization: useOrganizationMock,
}))

vi.mock('@/hooks/billing/use-billing-subscription', () => ({
  useBillingSubscription: useBillingSubscriptionMock,
}))

vi.mock('@/components/dashboard/billing/billing-status', () => ({
  BillingStatus: () => <div>billing-status</div>,
}))

vi.mock('@/components/dashboard/billing/plan-selector', () => ({
  PlanSelector: () => <div>plan-selector</div>,
}))

import { BillingPageContent } from '@/components/dashboard/billing/billing-page-content'

describe('BillingPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders billing blocks with stable vertical spacing when a subscription exists', () => {
    useOrganizationMock.mockReturnValue({
      data: { id: 'org-1' },
      isLoading: false,
    })
    useBillingSubscriptionMock.mockReturnValue({
      subscription: { id: 'sub-1' },
      isLoading: false,
    })

    render(<BillingPageContent />)

    const content = screen.getByTestId('billing-page-content')

    expect(content).toHaveClass('space-y-6')
    expect(screen.getByText('billing-status')).toBeInTheDocument()
  })

  it('keeps plan selection visible while the local trial is active', () => {
    useOrganizationMock.mockReturnValue({
      data: { id: 'org-1' },
      isLoading: false,
    })
    useBillingSubscriptionMock.mockReturnValue({
      subscription: {
        id: 'sub-1',
        trialEndsAt: '2099-03-31T00:00:00.000Z',
        providerSubscriptionId: null,
      },
      isLoading: false,
    })

    render(<BillingPageContent availablePlans={[]} />)

    expect(screen.getByText('billing-status')).toBeInTheDocument()
    expect(screen.getByText('plan-selector')).toBeInTheDocument()
  })

  it('shows the shared empty state before the plan selector when there is no active subscription', () => {
    useOrganizationMock.mockReturnValue({
      data: { id: 'org-1' },
      isLoading: false,
    })
    useBillingSubscriptionMock.mockReturnValue({
      subscription: null,
      isLoading: false,
    })

    render(<BillingPageContent availablePlans={[]} />)

    expect(screen.getByText('Nenhuma assinatura encontrada.')).toBeInTheDocument()
    expect(
      screen.getByText('Tente buscar por termos diferentes ou verifique os filtros.'),
    ).toBeInTheDocument()
    expect(screen.getByText('plan-selector')).toBeInTheDocument()
  })
})
