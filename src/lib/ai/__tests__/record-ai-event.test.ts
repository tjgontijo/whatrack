import { describe, expect, it } from 'vitest'

import { recordAiEventSchema } from '@/lib/ai/schemas/record-ai-event'

describe('recordAiEventSchema', () => {
  it('accepts discriminated event payloads', () => {
    const parsed = recordAiEventSchema.parse({
      type: 'MESSAGE_SENT',
      organizationId: '7b2a0951-8d65-4f0c-baf6-0cdeffadcb84',
      projectId: '926dbe95-7f1a-4c72-aaf0-b7cd1da19039',
      leadId: 'bdb97575-c55d-4589-b2d8-e18d6b767a43',
      metadata: {
        wamid: 'wamid-123',
      },
    })

    expect(parsed.type).toBe('MESSAGE_SENT')
  })

  it('rejects unknown event types', () => {
    expect(() =>
      recordAiEventSchema.parse({
        type: 'UNKNOWN_EVENT',
        organizationId: '7b2a0951-8d65-4f0c-baf6-0cdeffadcb84',
      })
    ).toThrow()
  })
})
