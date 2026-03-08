import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountOrganizationCard } from '@/components/dashboard/account/account-organization-card'

describe('AccountOrganizationCard', () => {
  it('renders fiscal information and submits edited fiscal data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

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
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('Dados fiscais')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Empresa Exemplo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('11.222.333/0001-81')).toBeInTheDocument()
    expect(screen.getByText('Empresa Exemplo LTDA')).toBeInTheDocument()
    expect(screen.getByText('Sao Paulo / SP')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Razão social / Nome fantasia'))
    await user.type(screen.getByLabelText('Razão social / Nome fantasia'), 'Nova Razão')
    await user.click(screen.getByRole('button', { name: 'Salvar dados fiscais' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Nova Razão',
      organizationType: 'pessoa_juridica',
      documentType: 'cnpj',
      documentNumber: '11222333000181',
    })
  })
})
