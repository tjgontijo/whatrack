import { describe, expect, it } from 'vitest'

import { organizationOnboardingSchema } from '@/schemas/organization-onboarding'

describe('organizationOnboardingSchema', () => {
  it('validates individual payload with cpf', () => {
    const parsed = organizationOnboardingSchema.safeParse({
      entityType: 'individual',
      documentNumber: '529.982.247-25',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects individual payload with invalid cpf', () => {
    const parsed = organizationOnboardingSchema.safeParse({
      entityType: 'individual',
      documentNumber: '000.000.000-00',
    })

    expect(parsed.success).toBe(false)
  })

  it('validates company payload with lookup data', () => {
    const parsed = organizationOnboardingSchema.safeParse({
      entityType: 'company',
      documentNumber: '11.222.333/0001-81',
      companyLookupData: {
        cnpj: '11222333000181',
        razaoSocial: 'Empresa Exemplo LTDA',
        nomeFantasia: 'Empresa Exemplo',
        cnaeCode: '6201500',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'Sao Paulo',
        uf: 'SP',
      },
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects company payload without lookup data', () => {
    const parsed = organizationOnboardingSchema.safeParse({
      entityType: 'company',
      documentNumber: '11.222.333/0001-81',
    })

    expect(parsed.success).toBe(false)
  })
})
