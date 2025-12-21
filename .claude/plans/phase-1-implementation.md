# PHASE 1: IMMEDIATE FIXES IMPLEMENTATION
## Filter Header Fix + Service Layer Creation

---

## ✅ COMPLETED

### 1. Filter Button in Header
- ✅ Integrated `DataTableFiltersButton` with `HeaderActions` context
- ✅ Filter now appears in header on all screen sizes
- ✅ Active filter count badge displays correctly
- ✅ Clicking button opens filter sheet (same on desktop + mobile)

**Files Modified:**
- `/src/components/dashboard/leads/client-leads-table.tsx`
  - Added HeaderActions import
  - Wrapped DataTableFiltersButton with HeaderActions
  - Filter now renders in page header

**Result:** Filter button visível no header, consistente em desktop e mobile

---

## 🚀 NEXT: SERVICE LAYER IMPLEMENTATION

### Goal
Extract all business logic from API routes into a testable service layer, following ClickUp patterns.

### Files to Create

#### 1. Lead Service Layer
**File:** `/src/services/lead.service.ts`

```typescript
import { Prisma, Lead } from '@prisma/client'
import { db } from '@/lib/prisma'
import { AppError, NotFoundError, ConflictError } from '@/lib/errors'
import { cache } from '@/lib/cache/hybrid-cache'

export interface CreateLeadInput {
  name?: string | null
  phone?: string | null
  mail?: string | null
  instagram?: string | null
  remoteJid?: string | null
  notes?: string | null
  status?: string | null
}

export interface UpdateLeadInput {
  name?: string | null
  phone?: string | null
  mail?: string | null
  remoteJid?: string | null
}

export interface ListLeadsFilter {
  q?: string
  dateRange?: string
  hasTickets?: boolean
  hasSales?: boolean
  hasMessages?: boolean
  hasAudit?: boolean
  page: number
  pageSize: number
}

export interface ListLeadsResult {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

export class LeadService {
  async create(organizationId: string, input: CreateLeadInput): Promise<Lead> {
    // Validate input
    if (!organizationId) throw new AppError(400, 'ORG_ID_REQUIRED', 'Organization ID required')

    // Check for duplicates
    if (input.phone) {
      const existing = await db.lead.findFirst({
        where: { organizationId, phone: input.phone },
      })
      if (existing) throw new ConflictError('Lead with this phone already exists')
    }

    if (input.remoteJid) {
      const existing = await db.lead.findFirst({
        where: { organizationId, remoteJid: input.remoteJid },
      })
      if (existing) throw new ConflictError('Lead with this remoteJid already exists')
    }

    // Create lead
    const lead = await db.lead.create({
      data: {
        organizationId,
        name: input.name?.trim() || null,
        phone: input.phone?.trim() || null,
        mail: input.mail?.trim().toLowerCase() || null,
        remoteJid: input.remoteJid?.trim() || null,
      },
    })

    // Invalidate cache
    await cache.invalidate([`leads:${organizationId}`])

    // Emit event (when event system is ready)
    // await eventBus.emit('lead.created', { lead, organizationId })

    return lead
  }

  async getById(organizationId: string, leadId: string): Promise<Lead> {
    const lead = await db.lead.findFirst({
      where: { id: leadId, organizationId },
    })

    if (!lead) throw new NotFoundError('Lead', leadId)
    return lead
  }

  async update(organizationId: string, leadId: string, input: UpdateLeadInput): Promise<Lead> {
    // Verify lead exists
    const existing = await this.getById(organizationId, leadId)

    // Check for duplicate phone if updating
    if (input.phone && input.phone !== existing.phone) {
      const conflict = await db.lead.findFirst({
        where: {
          organizationId,
          phone: input.phone,
          id: { not: leadId },
        },
      })
      if (conflict) throw new ConflictError('Lead with this phone already exists')
    }

    // Update lead
    const lead = await db.lead.update({
      where: { id: leadId },
      data: {
        name: input.name !== undefined ? input.name?.trim() || null : undefined,
        phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
        mail: input.mail !== undefined ? input.mail?.trim().toLowerCase() || null : undefined,
        remoteJid: input.remoteJid !== undefined ? input.remoteJid?.trim() || null : undefined,
      },
    })

    // Invalidate cache
    await cache.invalidate([`leads:${organizationId}`])

    return lead
  }

  async delete(organizationId: string, leadId: string): Promise<void> {
    // Verify lead exists
    await this.getById(organizationId, leadId)

    // Delete lead
    await db.lead.delete({ where: { id: leadId } })

    // Invalidate cache
    await cache.invalidate([`leads:${organizationId}`])
  }

  async list(organizationId: string, filters: ListLeadsFilter): Promise<ListLeadsResult> {
    const cacheKey = `leads:${organizationId}:${this.buildCacheKey(filters)}`

    // Try cache first
    const cached = await cache.get(cacheKey, [`leads:${organizationId}`])
    if (cached) return cached

    // Build where clause
    const where = this.buildWhereClause(organizationId, filters)

    // Execute query
    const [items, total] = await Promise.all([
      db.lead.findMany({
        where,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.lead.count({ where }),
    ])

    // Calculate relationship flags efficiently
    const itemsWithFlags = await Promise.all(
      items.map(async (item) => ({
        ...item,
        hasTickets: await this.hasTickets(item.id),
        hasSales: await this.hasSales(item.id),
        hasMessages: await this.hasMessages(item.id),
      }))
    )

    const result: ListLeadsResult = {
      items: itemsWithFlags,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    }

    // Cache result
    await cache.set(cacheKey, result, 30000, [`leads:${organizationId}`])

    return result
  }

  // Private helpers

  private buildWhereClause(organizationId: string, filters: ListLeadsFilter): Prisma.LeadWhereInput {
    const conditions: Prisma.LeadWhereInput[] = [{ organizationId }]

    // Search
    if (filters.q && filters.q.length >= 3) {
      conditions.push({
        OR: [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { phone: { contains: filters.q, mode: 'insensitive' } },
          { mail: { contains: filters.q, mode: 'insensitive' } },
          { remoteJid: { contains: filters.q, mode: 'insensitive' } },
        ],
      })
    }

    // Date range
    if (filters.dateRange) {
      const dateRange = this.parseDateRange(filters.dateRange)
      if (dateRange) {
        conditions.push({
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        })
      }
    }

    // Has filters
    if (filters.hasTickets !== undefined) {
      conditions.push(
        filters.hasTickets
          ? { whatsappConversations: { some: { tickets: { some: {} } } } }
          : { whatsappConversations: { none: { tickets: { some: {} } } } }
      )
    }

    if (filters.hasSales !== undefined) {
      conditions.push(
        filters.hasSales
          ? { whatsappConversations: { some: { sales: { some: {} } } } }
          : { whatsappConversations: { none: { sales: { some: {} } } } }
      )
    }

    if (filters.hasMessages !== undefined) {
      conditions.push(
        filters.hasMessages
          ? { whatsappConversations: { some: { messages: { some: {} } } } }
          : { whatsappConversations: { none: { messages: { some: {} } } } }
      )
    }

    return conditions.length === 1 ? conditions[0] : { AND: conditions }
  }

  private parseDateRange(range: string): { from: Date; to: Date } | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const ranges: Record<string, { from: Date; to: Date }> = {
      today: { from: today, to: now },
      yesterday: {
        from: new Date(today.getTime() - 86400000),
        to: today,
      },
      '3d': {
        from: new Date(today.getTime() - 259200000),
        to: now,
      },
      '7d': {
        from: new Date(today.getTime() - 604800000),
        to: now,
      },
      '14d': {
        from: new Date(today.getTime() - 1209600000),
        to: now,
      },
      '30d': {
        from: new Date(today.getTime() - 2592000000),
        to: now,
      },
      thisMonth: {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      },
      lastMonth: {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    }

    return ranges[range] || null
  }

  private buildCacheKey(filters: ListLeadsFilter): string {
    const parts = [
      filters.q ? `q:${filters.q}` : '',
      filters.dateRange ? `dr:${filters.dateRange}` : '',
      filters.hasTickets !== undefined ? `t:${filters.hasTickets}` : '',
      filters.hasSales !== undefined ? `s:${filters.hasSales}` : '',
      filters.hasMessages !== undefined ? `m:${filters.hasMessages}` : '',
      `p:${filters.page}:${filters.pageSize}`,
    ]
    return parts.filter(Boolean).join('|')
  }

  private async hasTickets(leadId: string): Promise<boolean> {
    const count = await db.ticket.count({
      where: {
        whatsappConversation: { lead_id: leadId },
      },
    })
    return count > 0
  }

  private async hasSales(leadId: string): Promise<boolean> {
    const count = await db.sale.count({
      where: {
        ticket: {
          whatsappConversation: { lead_id: leadId },
        },
      },
    })
    return count > 0
  }

  private async hasMessages(leadId: string): Promise<boolean> {
    const count = await db.whatsappMessage.count({
      where: {
        whatsappConversation: { lead_id: leadId },
      },
    })
    return count > 0
  }
}

export const leadService = new LeadService()
```

#### 2. Error Classes
**File:** `/src/lib/errors/app-error.ts`

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'RESOURCE_NOT_FOUND', `${resource} with id ${id} not found`, { resource, id })
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', message, { fields })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
  }
}
```

#### 3. Error Handler
**File:** `/src/lib/errors/error-handler.ts`

```typescript
import { AppError } from './app-error'

interface ErrorResponse {
  error: {
    code: string
    message: string
    context?: Record<string, any>
  }
}

export function errorHandler(error: unknown): {
  response: ErrorResponse
  status: number
} {
  console.error('[Error Handler]', error)

  if (error instanceof AppError) {
    return {
      response: {
        error: {
          code: error.code,
          message: error.message,
          context: error.context,
        },
      },
      status: error.statusCode,
    }
  }

  if (error instanceof SyntaxError) {
    return {
      response: {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
      },
      status: 400,
    }
  }

  // Log unexpected errors for monitoring
  console.error('[Unhandled Error]', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  return {
    response: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    status: 500,
  }
}

export function toResponse(error: unknown) {
  const { response, status } = errorHandler(error)
  return Response.json(response, { status })
}
```

#### 4. Lead Validators
**File:** `/src/schemas/lead.validators.ts`

```typescript
import { z } from 'zod'

export const phoneValidator = z
  .string()
  .refine((val) => /^\d{10,15}$/.test(val.replace(/\D/g, '')), 'Invalid phone format')

export const leadValidators = {
  create: z.object({
    name: z.string().min(1, 'Name required').max(255).optional(),
    phone: phoneValidator.optional(),
    mail: z.string().email('Invalid email').optional(),
    instagram: z.string().optional(),
    remoteJid: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    phone: phoneValidator.optional(),
    mail: z.string().email().nullable().optional(),
    remoteJid: z.string().optional(),
  }),

  search: z.object({
    q: z.string().min(3).max(255).optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    dateRange: z.string().optional(),
    hasTickets: z.boolean().optional(),
    hasSales: z.boolean().optional(),
    hasMessages: z.boolean().optional(),
    hasAudit: z.boolean().optional(),
  }),
}

export function parseCreateLeadInput(data: unknown) {
  return leadValidators.create.parse(data)
}

export function parseUpdateLeadInput(data: unknown) {
  return leadValidators.update.parse(data)
}

export function parseListLeadsQuery(data: unknown) {
  return leadValidators.search.parse(data)
}
```

---

## 🔄 REFACTORED API ROUTES

### New `/api/v1/leads/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { leadService } from '@/services/lead.service'
import { parseCreateLeadInput, parseListLeadsQuery } from '@/schemas/lead.validators'
import { toResponse, errorHandler } from '@/lib/errors/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { organizationId, hasAccess } = await validateFullAccess(request)
    if (!hasAccess) return toResponse(new AppError(403, 'FORBIDDEN', 'Access denied'))

    const query = Object.fromEntries(request.nextUrl.searchParams)
    const filters = parseListLeadsQuery(query)

    const result = await leadService.list(organizationId, {
      ...filters,
      page: filters.page,
      pageSize: filters.pageSize,
    })

    return Response.json(result)
  } catch (error) {
    return toResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId, hasAccess } = await validateFullAccess(request)
    if (!hasAccess) return toResponse(new AppError(403, 'FORBIDDEN', 'Access denied'))

    const body = await request.json()
    const input = parseCreateLeadInput(body)

    const lead = await leadService.create(organizationId, input)

    return Response.json(lead, { status: 201 })
  } catch (error) {
    return toResponse(error)
  }
}
```

---

## 📝 CHECKLIST

- [ ] Create `/src/services/lead.service.ts`
- [ ] Create `/src/lib/errors/app-error.ts`
- [ ] Create `/src/lib/errors/error-handler.ts`
- [ ] Create `/src/schemas/lead.validators.ts`
- [ ] Refactor `/api/v1/leads/route.ts` to use service
- [ ] Refactor `/api/v1/leads/[leadId]/route.ts` to use service
- [ ] Test all lead operations still work
- [ ] Verify build passes
- [ ] Create commit

---

## ✅ SUCCESS CRITERIA

After Phase 1 implementation:
- [ ] All business logic in service layer
- [ ] All errors use centralized error classes
- [ ] All validation uses centralized validators
- [ ] API routes are thin orchestration layers (< 20 lines each)
- [ ] Errors return proper HTTP status codes
- [ ] Cache invalidation works correctly
- [ ] All tests pass

---

**Estimated Time:** 3-4 hours
**Difficulty:** Medium
**Impact:** High - Creates foundation for all future phases
