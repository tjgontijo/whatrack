import { describe, expect, it } from 'vitest'

import { updateOrganizationSchema } from '@/schemas/organizations/organization-schemas'

describe('updateOrganizationSchema', () => {
  it('accepts company lookup data for fiscal identity updates', () => {
    const parsed = updateOrganizationSchema.safeParse({
      organizationType: 'pessoa_juridica',
      documentType: 'cnpj',
      documentNumber: '11.222.333/0001-81',
      companyLookupData: {
        cnpj: '11222333000181',
        razaoSocial: 'Empresa Exemplo LTDA',
        nomeFantasia: 'Empresa Exemplo',
        municipio: 'Sao Paulo',
        uf: 'SP',
        situacao: 'ATIVA',
      },
    })

    expect(parsed.success).toBe(true)
  })
})
