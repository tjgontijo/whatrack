import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountOrganizationCard } from '@/components/dashboard/account/account-organization-card'

describe('AccountOrganizationCard', () => {
  it('renders current fiscal information and opens the edit flow on demand', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <AccountOrganizationCard
        organization={{
          id: 'org-1',
          name: 'Empresa Exemplo',
          organizationType: 'pessoa_juridica',
          documentType: 'cnpj',
          documentNumber: '11222333000181',
          legalName: 'Empresa Exemplo LTDA',
          tradeName: 'Empresa Exemplo',
          taxStatus: 'ATIVA',
          city: 'Sao Paulo',
          state: 'SP',
          updatedAt: '2026-03-08T12:00:00.000Z',
        }}
        canManageOrganizationSettings
        onEdit={onEdit}
      />,
    )

    expect(screen.getByText('Dados fiscais')).toBeInTheDocument()
    expect(screen.getByText('Nome da conta')).toBeInTheDocument()
    expect(screen.getAllByText('Empresa Exemplo')).toHaveLength(2)
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument()
    expect(screen.getByText('Empresa Exemplo LTDA')).toBeInTheDocument()
    expect(screen.getByText('Sao Paulo / SP')).toBeInTheDocument()
    expect(screen.queryByLabelText('Razão social / Nome fantasia')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar dados fiscais' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
