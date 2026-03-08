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

vi.mock('@/components/dashboard/billing/usage-progress', () => ({
  UsageProgress: () => <div>usage-progress</div>,
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
    expect(screen.getByText('usage-progress')).toBeInTheDocument()
  })
})
