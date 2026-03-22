import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useIsMobileMock = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/ui/use-mobile', () => ({
  useIsMobile: useIsMobileMock,
}))

import { ViewSwitcher } from '@/components/dashboard/crud/view-switcher'

describe('ViewSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('switches away from hidden mobile views automatically', async () => {
    const setView = vi.fn()
    useIsMobileMock.mockReturnValue(true)

    render(<ViewSwitcher view="list" setView={setView} enabledViews={['list', 'cards']} />)

    await waitFor(() => {
      expect(setView).toHaveBeenCalledWith('cards')
    })
  })

  it('hides itself on mobile when only one visible option remains', () => {
    useIsMobileMock.mockReturnValue(true)

    render(<ViewSwitcher view="cards" setView={vi.fn()} enabledViews={['list', 'cards', 'kanban']} />)

    expect(screen.queryByRole('button', { name: 'Lista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cards' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kanban' })).not.toBeInTheDocument()
  })

  it('lets the user change views on desktop', async () => {
    const user = userEvent.setup()
    const setView = vi.fn()
    useIsMobileMock.mockReturnValue(false)

    render(<ViewSwitcher view="list" setView={setView} enabledViews={['list', 'cards']} />)

    await user.click(screen.getByRole('button', { name: 'Cards' }))

    expect(setView).toHaveBeenCalledWith('cards')
  })
})
