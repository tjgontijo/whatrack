import { describe, expect, it } from 'vitest'

import {
  projectCreateSchema,
  projectCurrentUpdateSchema,
  projectDeleteQuerySchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from '@/schemas/projects/project-schemas'

describe('project-schemas', () => {
  it('parses paginated list query with defaults', () => {
    expect(projectListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    })
  })

  it('accepts valid project creation payload', () => {
    expect(
      projectCreateSchema.parse({
        name: 'Cliente Acme',
      }),
    ).toEqual({
      name: 'Cliente Acme',
    })
  })

  it('rejects empty project update payload', () => {
    const result = projectUpdateSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('parses delete query with force flag', () => {
    expect(projectDeleteQuerySchema.parse({ force: 'true' })).toEqual({
      force: true,
    })
  })

  it('accepts active project update with null project', () => {
    expect(projectCurrentUpdateSchema.parse({ projectId: null })).toEqual({
      projectId: null,
    })
  })
})
