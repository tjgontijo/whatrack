import { describe, expect, it } from 'vitest'

import { signUpSchema } from '@/schemas/sign-up'

describe('signUpSchema', () => {
  it('accepts payload without phone', () => {
    const parsed = signUpSchema.safeParse({
      name: 'Thiago',
      email: 'thiago@example.com',
      password: '12345678',
      confirmPassword: '12345678',
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
})
