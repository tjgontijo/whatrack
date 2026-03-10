import { describe, expect, it } from 'vitest'

import {
  whatsappInstanceProjectUpdateSchema,
} from '@/schemas/whatsapp/whatsapp-schemas'

describe('whatsapp-schemas', () => {
  it('accepts instance project update with explicit null', () => {
    const result = whatsappInstanceProjectUpdateSchema.safeParse({
      configId: 'cfg-1',
      projectId: null,
    })

    expect(result.success).toBe(true)
  })

  it('requires config id in instance project updates', () => {
    const result = whatsappInstanceProjectUpdateSchema.safeParse({
      projectId: 'proj-1',
    })

    expect(result.success).toBe(false)
  })
})
