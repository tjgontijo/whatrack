import { describe, expect, it } from 'vitest'

import { welcomeOnboardingSchema } from '@/schemas/onboarding/welcome-onboarding'

describe('welcomeOnboardingSchema', () => {
  it('accepts pessoa fisica payload with valid cpf', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      organizationName: 'Whatrack',
      identityType: 'pessoa_fisica',
      documentNumber: '529.982.247-25',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects pessoa fisica payload with invalid cpf', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      organizationName: 'Whatrack',
      identityType: 'pessoa_fisica',
      documentNumber: '000.000.000-00',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts pessoa juridica payload without lookup data', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      organizationName: 'Whatrack',
      identityType: 'pessoa_juridica',
      documentNumber: '11.222.333/0001-81',
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts pessoa juridica payload with lookup data', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      organizationName: 'Whatrack',
      identityType: 'pessoa_juridica',
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

  it('rejects pessoa juridica payload with invalid cnpj', () => {
    const parsed = welcomeOnboardingSchema.safeParse({
      organizationName: 'Whatrack',
      identityType: 'pessoa_juridica',
      documentNumber: '11.111.111/1111-11',
    })

    expect(parsed.success).toBe(false)
  })
})
