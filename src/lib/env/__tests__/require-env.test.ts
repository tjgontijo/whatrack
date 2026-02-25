import { afterEach, describe, expect, it } from 'vitest'

import { requireEnv } from '@/lib/env/require-env'

describe('requireEnv', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns value when env exists', () => {
    process.env.APP_NAME = 'Whatrack'

    expect(requireEnv('APP_NAME')).toBe('Whatrack')
  })

  it('throws when env is missing', () => {
    delete process.env.APP_NAME

    expect(() => requireEnv('APP_NAME')).toThrowError(
      '[env] Missing required environment variable: APP_NAME'
    )
  })

  it('throws when env is blank', () => {
    process.env.APP_NAME = '   '

    expect(() => requireEnv('APP_NAME')).toThrowError(
      '[env] Missing required environment variable: APP_NAME'
    )
  })
})
