import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccountPageSkeleton } from '@/components/dashboard/account/account-page-skeleton'

describe('AccountPageSkeleton', () => {
  it('renders a stable placeholder layout for the account page', () => {
    render(<AccountPageSkeleton />)

    expect(screen.getByTestId('account-page-skeleton')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(8)
  })
})
