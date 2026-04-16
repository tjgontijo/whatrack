import { describe, expect, it } from 'vitest'

import { signUpSchema } from '@/schemas/auth/sign-up'

describe('signUpSchema', () => {
  it('accepts payload without phone', () => {
    const parsed = signUpSchema.safeParse({
      name: 'Thiago',
      email: 'thiago@example.com',
      password: '12345678',
      confirmPassword: '12345678',
      documentType: 'CPF',
      documentNumber: '12345678901',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const parsed = signUpSchema.safeParse({
      name: 'Thiago',
      email: 'thiago@example.com',
      password: '12345678',
      confirmPassword: '87654321',
    })

    expect(parsed.success).toBe(false)
  })

  it('requires selecting fiscal data type before submitting', () => {
    const parsed = signUpSchema.safeParse({
      name: 'Thiago',
      email: 'thiago@example.com',
      password: '12345678',
      confirmPassword: '12345678',
      documentType: null,
      documentNumber: '',
    })

    expect(parsed.success).toBe(false)
  })
})
