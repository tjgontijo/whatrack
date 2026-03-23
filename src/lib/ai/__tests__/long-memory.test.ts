import { describe, expect, it } from 'vitest'

import { longMemorySchema } from '@/lib/ai/schemas/long-memory'

describe('longMemorySchema', () => {
  it('accepts valid long memory payloads', () => {
    const parsed = longMemorySchema.parse({
      facts: ['prefere respostas objetivas'],
      preferences: ['falar em portugues'],
      history_summary: 'Lead pediu detalhes do servico e demonstrou interesse.',
    })

    expect(parsed.facts).toHaveLength(1)
    expect(parsed.preferences).toHaveLength(1)
  })

  it('rejects history summary above 500 chars', () => {
    expect(() =>
      longMemorySchema.parse({
        facts: [],
        preferences: [],
        history_summary: 'a'.repeat(501),
      })
    ).toThrow()
  })

  it('rejects more than 20 facts', () => {
    expect(() =>
      longMemorySchema.parse({
        facts: Array.from({ length: 21 }, (_, index) => `fact-${index}`),
        preferences: [],
      })
    ).toThrow()
  })
})
