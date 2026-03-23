import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountTab } from '../account-tab'

describe('AccountTab', () => {
  it('calls the connect handler from the empty state button', async () => {
    const user = userEvent.setup()
    const onConnectClick = vi.fn()

    render(
      <AccountTab
        instance={null}
        canStartOnboarding
        onConnectClick={onConnectClick}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Conectar WhatsApp' }))

    expect(onConnectClick).toHaveBeenCalledTimes(1)
  })
})
