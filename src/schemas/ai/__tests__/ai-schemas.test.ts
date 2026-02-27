import { describe, expect, it } from 'vitest'

import { aiResourceIdParamSchema } from '@/schemas/ai/ai-schemas'

describe('aiResourceIdParamSchema', () => {
  it('accepts valid uuid', () => {
    const parsed = aiResourceIdParamSchema.safeParse({
      id: '9f1f6457-0fff-4666-ac0c-8016f8eaf56b',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects invalid id format', () => {
    const parsed = aiResourceIdParamSchema.safeParse({
      id: '123',
    })

    expect(parsed.success).toBe(false)
  })
})
