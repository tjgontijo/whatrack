import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccountFiscalCard } from '@/components/dashboard/account/account-fiscal-card'

describe('AccountFiscalCard', () => {
  it('renders company fiscal information', () => {
    render(
      <AccountFiscalCard
        fiscalData={{
          organizationType: 'pessoa_juridica',
          documentType: 'cnpj',
          documentNumber: '11222333000181',
          legalName: 'Empresa Exemplo LTDA',
          tradeName: 'Empresa Exemplo',
          taxStatus: 'ATIVA',
          city: 'Sao Paulo',
          state: 'SP',
        }}
      />,
    )

    expect(screen.getByText('Dados fiscais')).toBeInTheDocument()
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument()
    expect(screen.getByText('Empresa Exemplo LTDA')).toBeInTheDocument()
    expect(screen.getByText('Empresa Exemplo')).toBeInTheDocument()
    expect(screen.getByText('Sao Paulo / SP')).toBeInTheDocument()
  })
})
