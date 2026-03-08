import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountProfileCard } from '@/components/dashboard/account/account-profile-card'

describe('AccountProfileCard', () => {
  it('renders persisted account data and normalizes phone on submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AccountProfileCard
        account={{
          id: 'user-1',
          name: 'Thiago Alves',
          email: 'thiago@whatrack.com',
          phone: '11988887777',
          updatedAt: '2026-03-08T12:00:00.000Z',
        }}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Thiago Alves')
    expect(screen.getByLabelText('E-mail')).toHaveValue('thiago@whatrack.com')
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98888-7777')

    await user.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Thiago Alves',
      email: 'thiago@whatrack.com',
      phone: '11988887777',
    })
  })
})
