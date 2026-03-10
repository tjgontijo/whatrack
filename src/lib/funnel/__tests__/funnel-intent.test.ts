import { describe, expect, it } from 'vitest'

import {
  appendFunnelIntent,
  buildFunnelQueryString,
  readFunnelIntent,
  resolvePostAuthPath,
} from '@/lib/funnel/funnel-intent'

describe('funnel-intent', () => {
  it('reads only supported funnel query keys', () => {
    const searchParams = new URLSearchParams({
      intent: 'start-trial',
      source: 'hero',
      campaign: 'starter',
      ignored: 'value',
    })

    expect(readFunnelIntent(searchParams)).toEqual({
      intent: 'start-trial',
      source: 'hero',
      campaign: 'starter',
    })
  })

  it('builds and appends funnel query strings consistently', () => {
    const intent = {
      intent: 'start-trial',
      segment: 'agencias',
      source: 'pricing',
      campaign: 'starter',
    } as const

    expect(buildFunnelQueryString(intent)).toBe(
      '?intent=start-trial&segment=agencias&source=pricing&campaign=starter',
    )
    expect(appendFunnelIntent('/sign-up', intent)).toBe(
      '/sign-up?intent=start-trial&segment=agencias&source=pricing&campaign=starter',
    )
  })

  it('resolves welcome as the default post-auth path for start-trial intent', () => {
    expect(resolvePostAuthPath(null, { intent: 'start-trial', source: 'hero' })).toBe(
      '/welcome?intent=start-trial&source=hero',
    )
  })

  it('prefers an explicit internal next path when present', () => {
    expect(resolvePostAuthPath('/dashboard/projects', { intent: 'start-trial' })).toBe(
      '/dashboard/projects',
    )
  })
})
