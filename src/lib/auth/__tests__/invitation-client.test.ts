import { describe, expect, it } from 'vitest'

import { buildInvitationQuery } from '@/lib/auth/invitation-client'

describe('buildInvitationQuery', () => {
  it('keeps invitation and next params when they are safe', () => {
    expect(buildInvitationQuery('inv-123', '/dashboard/billing')).toBe(
      '?invitationId=inv-123&next=%2Fdashboard%2Fbilling'
    )
  })

  it('supports preserving only the next path', () => {
    expect(buildInvitationQuery(null, '/dashboard/billing')).toBe('?next=%2Fdashboard%2Fbilling')
  })

  it('drops unsafe next paths', () => {
    expect(buildInvitationQuery('inv-123', 'https://evil.com')).toBe('?invitationId=inv-123')
  })
})
