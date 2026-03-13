import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.hoisted(() => vi.fn())
const pathnameMock = vi.hoisted(() => vi.fn())
const searchParamsMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock(),
  useSearchParams: () => searchParamsMock(),
}))

vi.mock('@/components/dashboard/whatsapp/settings/whatsapp-settings-page', () => ({
  WhatsAppSettingsPage: ({ organizationId }: { organizationId?: string }) => (
    <div>whatsapp:{organizationId}</div>
  ),
}))

vi.mock('@/components/dashboard/meta-ads/settings/meta-ads-settings-content', () => ({
  MetaAdsSettingsContent: ({ organizationId }: { organizationId?: string }) => (
    <div>meta-ads:{organizationId}</div>
  ),
}))

import { IntegrationsHub } from '@/components/dashboard/integrations/integrations-hub'

describe('IntegrationsHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pathnameMock.mockReturnValue('/dashboard/settings/integrations')
    searchParamsMock.mockReturnValue(new URLSearchParams())
  })

  it('renders the requested initial tab content', () => {
    render(<IntegrationsHub organizationId="org-1" initialTab="meta-ads" />)

    expect(screen.getByText('meta-ads:org-1')).toBeInTheDocument()
    expect(screen.queryByText('whatsapp:org-1')).not.toBeInTheDocument()
  })

  it('preserves the existing query string when switching tabs', async () => {
    const user = userEvent.setup()

    searchParamsMock.mockReturnValue(new URLSearchParams('tab=whatsapp&project=alpha'))

    render(<IntegrationsHub organizationId="org-1" initialTab="whatsapp" />)

    await user.click(screen.getByRole('tab', { name: 'Meta Ads' }))

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard/settings/integrations?tab=meta-ads&project=alpha',
      { scroll: false }
    )
  })
})
