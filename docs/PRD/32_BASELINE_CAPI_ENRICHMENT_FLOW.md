# PRD 32 Phase 0 Task 0.3: CAPI & Ad Enrichment Flow Analysis

## Document Purpose

This document captures the current baseline behavior of the Conversion API (CAPI) and Ad Enrichment flows as of 2026-03-14. It identifies the critical cross-project data contamination risks that PRD 32 Phase 4 will address through strict ownership validation.

**Status**: Baseline documentation (pre-fix)
**Scope**: Architecture review of current pixel/connection selection logic

---

## 1. CAPI Flow (Conversion API)

### 1.1 Entry Point: When CAPI is Called

CAPI events are triggered when a ticket's stage changes in specific ways, defined by `triggerStageCapiEvent()` in `src/services/tickets/ticket.service.ts`.

**Trigger Conditions** (lines 313-325):
- Stage name contains "qualificado" or "qualified" → sends `LeadSubmitted` event
- Stage name contains "venda", "pago", "ganho", or "won" → sends `Purchase` event
- Other stage names → no event triggered

**Trigger Location**: `updateTicketAndTrackCapi()` function (line 586-600)
- Called when a ticket is updated with a new stage
- Fires asynchronously (fire-and-forget pattern)
- Used by ticket update endpoints in API routes

### 1.2 Current Behavior: Organization-Wide Pixel Pool

**Flow**:
1. Ticket stage changes (e.g., ticket moves from "New" to "Qualified")
2. `updateTicketAndTrackCapi()` calls `metaCapiService.sendEvent(ticketId, eventName, ...)`
3. Service queries the database:

```typescript
// src/services/meta-ads/capi.service.ts, lines 28-62
const ticket = await prisma.ticket.findUnique({
  where: { id: ticketId },
  select: {
    id: true,
    organizationId: true,
    organization: {
      select: {
        metaPixels: {
          select: {
            pixelId: true,
            capiToken: true,
          },
          where: { isActive: true },  // Only active pixels
        },
      },
    },
    conversation: { ... },
    tracking: { ... },
  },
})
```

4. **Pixel Selection Logic** (lines 69-75):
```typescript
let targetPixels = ticket.organization.metaPixels

if (!targetPixels || targetPixels.length === 0) {
  logger.warn(`[CAPI] No Pixels found for organization ${ticket.organizationId}.`)
  return
}
```

5. For each pixel found, send the conversion event to Meta CAPI

### 1.3 Current Risk: Organization-Level Pixel Pool with No Project Validation

**The Problem**:
- Pixels are stored at the `organization` level with only `organizationId` as the scope
- When CAPI sends an event, it queries **ALL active pixels for the entire organization**
- **There is NO validation that the pixels belong to the project associated with the ticket**

**Risk Scenario**:

Assume Organization ABC has:
- **Project A** (Client 1: E-commerce Company)
  - Facebook Pixel ID: `123456789` (Client 1's real conversion pixel)
  - Owns conversions for Client 1's campaigns

- **Project B** (Client 2: Local Service Business)
  - Facebook Pixel ID: `987654321` (Client 2's real conversion pixel)
  - Owns conversions for Client 2's campaigns

**Data Contamination Event**:
1. Lead fills form on Client 1's landing page → generates Ticket T1 in Project A
2. Ticket T1 moves to "Qualificado" stage
3. `sendEvent()` is called with `ticketId=T1`
4. Database query returns ticket T1 with `organizationId=ABC`
5. **Database returns BOTH pixels** (`123456789` AND `987654321`) because both are active for the organization
6. CAPI service loops through and sends the conversion event to **both pixels**:
   - Pixel `123456789` (correct - Client 1's event)
   - **Pixel `987654321` (INCORRECT - Client 2 receives false conversion data)**

**Impact**:
- Client 2 sees a conversion attributed to them that they didn't generate
- Client 1 loses visibility of their conversion data (it's split across both pixels)
- Client 2's financial metrics are inflated (false conversions → false ROI calculations)
- Client 2 may optimize their campaigns based on contaminated data
- Audit trail is compromised (cannot trace which client a conversion belongs to)

---

## 2. Ad Enrichment Flow

### 2.1 Entry Point: When Enrichment Runs

Ad Enrichment is triggered to fetch Meta ad hierarchy data (ad name, adset, campaign, account).

**Trigger Points**:
- Manual call: `enrichTicket(ticketId)` on individual tickets
- Bulk call: `enrichPending()` cron job that processes up to 20 pending tickets per run
- Entry condition: Ticket has `metaAdId` set but `metaEnrichmentStatus = 'PENDING'`

**Location**: `src/services/meta-ads/ad-enrichment.service.ts`, lines 26-108

### 2.2 Current Behavior: Organization-Level Connection Selection

**Flow**:
1. Load ticket tracking data:

```typescript
// src/services/meta-ads/ad-enrichment.service.ts, lines 27-47
const tracking = await prisma.ticketTracking.findUnique({
  where: { ticketId },
  select: {
    metaAdId: true,
    metaEnrichmentStatus: true,
    ticket: {
      select: {
        organizationId: true,
        organization: {
          select: {
            metaConnections: {
              where: { status: 'ACTIVE' },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    },
  },
})
```

2. **Connection Selection Logic** (lines 52-60):
```typescript
// Use the first active connection found for the organization
// (In a more complex setup, we'd find the one that has access to this specific ad)
const connection = tracking.ticket.organization.metaConnections[0]
if (!connection) {
  logger.warn(
    `[Enrichment] No active Meta connection for organization ${tracking.ticket.organizationId}`
  )
  return
}
```

3. Get decrypted access token for the connection
4. Query Meta Graph API using that token to fetch ad details
5. Update ticket tracking with the enriched data

### 2.3 Current Risk: Organization-Level Connection Selection with No Project Validation

**The Problem**:
- Connections are stored at the `organization` level with only `organizationId` as the scope
- When enriching, the service gets **the first active connection for the entire organization**
- **There is NO validation that the connection has permission to access the ad belonging to the ticket's project**

**Risk Scenario**:

Assume Organization ABC has:
- **Project A** (Client 1: E-commerce)
  - Meta Connection A: Token for Client 1's Business Account
  - Can only see ads in Client 1's account

- **Project B** (Client 2: Marketing Agency)
  - Meta Connection B: Token for Client 2's Business Account
  - Can only see ads in Client 2's account

**Data Contamination Event**:
1. Lead clicks Client 1's ad (`metaAdId=ad_111`) → generates Ticket in Project A
2. Enrichment job picks up ticket T1 with status `PENDING`
3. Database query returns the ticket with `organizationId=ABC`
4. **Enrichment service gets `metaConnections[0]`, which could be Connection A or Connection B** (database order is not deterministic without an explicit ORDER BY)
5. Assume it gets Connection B (Client 2's token by chance)
6. Service queries Meta API: `GET /ad_111?access_token=<Client2Token>`
7. **Two outcomes**:
   - **Permission denied error**: Client 2's token cannot access ad_111, enrichment fails
   - **Wrong ad data**: If database order happens to match, but the token has broad access, it might fetch data but from wrong context
8. If enrichment succeeded with wrong token:
   - Ticket T1 (Client 1's lead) is enriched with metadata that doesn't belong to Client 1's account
   - Audit trail shows wrong connection was used

**Current Mitigating Factor**:
- The actual ad ID (`ad_111`) belongs to only one client's Meta account
- If using wrong token, the API call would fail with permission error
- This prevents data contamination in practice, but only by chance of API permission checks
- **But this is not a reliable security boundary** - it depends on Meta's API to reject unauthorized access

**Hidden Risk**:
- If a token has broader permissions than intended, or if connections are misconfigured to have overlapping access, the wrong token could succeed
- There's no application-level validation that the connection actually owns the ad
- If multiple ads have similar IDs or if there's data replication, wrong enrichment could occur

---

## 3. Data Contamination Risks Summary

### 3.1 Cross-Project Data Contamination Scenarios

| Scenario | Current Behavior | Risk Level | Impact |
|----------|-----------------|-----------|--------|
| **Pixel Targeting** | Organization-wide pixel pool sent to all tickets | HIGH | Conversions sent to all clients' pixels regardless of project |
| **Connection Selection** | First active org-level connection used | MEDIUM | Token permission check prevents direct contamination, but no app-level validation |
| **Enrichment Metadata** | Ad hierarchy data could be from wrong client's account | MEDIUM | Audit records would show wrong connection used |
| **Cross-Project Audit Trail** | Both CAPI events and enrichment use organizationId only | HIGH | Cannot trace which specific client caused data flow |

### 3.2 Client Privacy Implications

**Affected Areas**:
1. **Pixel Tracking**: Client 1's lead behavior could be visible to Client 2's Meta pixel
2. **Conversion Attribution**: Client 2's Meta account could receive false conversion data from Client 1
3. **Campaign Optimization**: Client 2 might optimize campaigns based on Client 1's contaminated data
4. **PII Data**: Hashed phone numbers and lead IDs are sent to pixels - mixing projects means PII flows to wrong clients

**Privacy Violation Examples**:
- Client 1 (competing business) sends leads to Client 2's Meta pixel
- Client 2 (advertising agency) could retarget Client 1's leads using contaminated pixel data
- Personal identifying information (hashed phone) crosses project boundaries

### 3.3 Financial Impact

**Revenue Losses**:
- Client 1 sees inflated conversion metrics → increases spend → loses money on false ROI data
- Client 2 receives false conversions → inflates their success metrics → they cancel service (metrics appeared good but weren't)
- WhaTrack's reputation damaged → churn increases

**Cost Losses**:
- Wasted API calls to Meta for wrong ad/pixel combinations
- Support costs for investigating "why is this data wrong?"
- Compliance/audit costs for investigating privacy breaches

### 3.4 Audit Trail Issues

**Current State**:
- `MetaConversionEvent` table logs: `ticketId`, `eventName`, `organizationId`, `metaAdId`
- `TicketTracking` table logs: `metaAdId`, `metaEnrichmentStatus`, connection ID (implicit in update)
- **Missing**: Which specific connection was used for enrichment
- **Missing**: Which specific pixels received the conversion event
- **Missing**: Project-level association in audit records

**Audit Failure Scenarios**:
- Cannot determine: "Did this conversion go to the right pixel?"
- Cannot determine: "Which client should receive credit for this conversion?"
- Cannot determine: "Did Client 2's token enrich Client 1's ticket?"
- Forensic analysis impossible without cross-referencing multiple tables with only organizationId

---

## 4. Why Current Architecture Allows Contamination

### Root Cause 1: Organization as Aggregate Root

```typescript
// Current pattern
const pixels = organization.metaPixels  // All pixels for org
const connection = organization.metaConnections[0]  // Any connection for org
```

- **No project-level aggregation**: There is no `Project.metaPixels` or `Project.metaConnections`
- **No relationship validation**: No check that pixel/connection belongs to the ticket's project
- **No ownership boundaries**: Ownership is organization-wide, not project-specific

### Root Cause 2: Missing Project Validation

```typescript
// In both CAPI and enrichment services:
const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
// ✓ We know: ticket.id, ticket.organizationId, ticket.projectId
// ✗ We DON'T validate: Does this pixel/connection belong to ticket.projectId?
```

### Root Cause 3: Implicit Assumptions

Both services rely on implicit assumptions:
- "All pixels in the organization should receive conversions from all projects" (WRONG)
- "Any active connection can enrich ads from any project" (WRONG)
- "Meta API permission checks are sufficient to prevent wrong enrichment" (UNRELIABLE)

---

## 5. How PRD 32 Phase 4 Will Fix This

PRD 32 Phase 4 (Project Strict Ownership) will introduce:

1. **Project-Level Pixel Ownership**:
   - Add `projectId` to `MetaPixel` table
   - Require pixels to belong to exactly one project
   - In CAPI flow: Only send conversion to pixels where `pixel.projectId = ticket.projectId`

2. **Project-Level Connection Ownership**:
   - Add `projectId` to `MetaConnection` table
   - Require connections to belong to exactly one project
   - In enrichment flow: Only use connections where `connection.projectId = ticket.projectId`

3. **Validation Guards**:
   - Add checks in both services: `if (pixel.projectId !== ticket.projectId) skip/error`
   - Fail-safe: If no matching pixel/connection, log error and return (don't cross project boundaries)

4. **Audit Trail Enhancement**:
   - Log `projectId` in conversion event records
   - Log which specific `pixelId` was used
   - Log which specific `connectionId` was used for enrichment
   - Enable forensic analysis

---

## 6. Files Involved in Current Flow

### Read-Only References:
- `src/services/meta-ads/capi.service.ts` (lines 19-181)
  - `MetaCapiService.sendEvent()` - Main CAPI dispatch
  - Pixel selection logic: lines 69-75
  - Event sending loop: lines 82-168

- `src/services/meta-ads/ad-enrichment.service.ts` (lines 1-128)
  - `MetaAdEnrichmentService.enrichTicket()` - Main enrichment dispatch
  - Connection selection logic: lines 52-60
  - Meta API call: lines 66-74

- `src/services/tickets/ticket.service.ts` (lines 313-351)
  - `triggerStageCapiEvent()` - CAPI trigger logic
  - `updateTicketAndTrackCapi()` - Entry point for CAPI dispatch

### Database Models (to be modified in Phase 4):
- `MetaPixel` - needs `projectId` added
- `MetaConnection` - needs `projectId` added
- `MetaConversionEvent` - needs `projectId` logged
- `TicketTracking` - needs connection ID logged

---

## 7. Conclusion

The current CAPI and Ad Enrichment flows operate at the organization level without project-level validation. While Meta's API permission checks provide some protection against permission-denied errors, they do not prevent application-level data contamination within a single organization.

**The risk is real and specific**:
- Organizations with multiple projects are at HIGH RISK for pixel misdirection
- Organizations with multiple connections are at MEDIUM RISK for using wrong tokens
- Currently, there is no application-level guarantee that data stays within project boundaries

**PRD 32 Phase 4 will eliminate this risk** by:
1. Adding `projectId` to ownership entities (pixels, connections)
2. Validating project ownership in both flows
3. Creating a proper audit trail at the project level

This document serves as the baseline against which Phase 4's fix can be validated.
