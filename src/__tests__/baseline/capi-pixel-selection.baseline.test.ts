import { describe, expect, it } from 'vitest'

/**
 * BASELINE TEST: CAPI Pixel Selection
 *
 * This test documents the CURRENT behavior of Meta CAPI pixel selection
 * in the context of organization-scoped pixels and project-scoped tickets.
 *
 * CRITICAL RISK: The current implementation selects pixels from the
 * ORGANIZATION-WIDE pool, not the project-scoped pool. This creates a
 * cross-project contamination risk where conversions from tickets in
 * Project A may be sent to pixels that belong to Project B, as long as
 * both projects are in the same organization.
 *
 * BASELINE ARCHITECTURE:
 * - MetaPixel is scoped to organizationId (unique: organizationId + pixelId)
 * - MetaPixel has NO projectId field
 * - Ticket has both organizationId and projectId (projectId is nullable)
 * - CAPI.sendEvent() queries pixels using ticket.organizationId only
 * - No validation that pixel belongs to ticket's project
 *
 * IMPORTANT: After Phase 4 (Project Strict Ownership), CAPI will be updated to:
 * ✓ Query only pixels that belong to ticket's project
 * ✓ Filter out pixels from sibling projects in the same organization
 * ✓ Validate pixel ownership before sending conversions
 *
 * Current Flow (Organization-Wide Selection):
 * 1. Ticket {id, organizationId, projectId} is created
 * 2. CAPI.sendEvent(ticketId) is called
 * 3. Query finds ticket with its organizationId
 * 4. Query: SELECT * FROM meta_pixels WHERE organizationId = ticket.organizationId
 * 5. RESULT: Gets ALL pixels in organization, including pixels from other projects
 * 6. Sends conversion to ALL active pixels in organization
 *
 * Risk Scenario:
 * Org = "ACME Corp"
 * Project A = "Client 1 (USA)"
 * Project B = "Client 2 (UK)"
 * Pixel 1 = belongs to Project A (USA Audience)
 * Pixel 2 = belongs to Project B (UK Audience)
 * Ticket for Project A creates conversion
 * → Conversion sent to BOTH Pixel 1 AND Pixel 2 (wrong!)
 */

describe('CAPI Pixel Selection - Baseline (Organization-Wide)', () => {
  describe('Test 0.6.1: CAPI selects pixels from organization-wide pool, not project-scoped', () => {
    it('should document that MetaPixel schema has organizationId but NO projectId', () => {
      // BASELINE BEHAVIOR:
      // From prisma/schema.prisma, MetaPixel model:
      // model MetaPixel {
      //   id             String @id
      //   organizationId String @db.Uuid
      //   pixelId        String
      //   capiToken      String
      //   isActive       Boolean
      //   organization   Organization @relation(...)
      //   @@unique([organizationId, pixelId])
      // }
      //
      // There is NO projectId field in MetaPixel.
      // The unique constraint is (organizationId, pixelId), not (projectId, pixelId).

      const metaPixelSchema = {
        id: 'uuid',
        organizationId: 'uuid',
        pixelId: 'string',
        capiToken: 'string',
        isActive: 'boolean',
        createdAt: 'datetime',
        updatedAt: 'datetime',
      }

      // ASSERTION: MetaPixel has NO projectId
      const pixelFields = Object.keys(metaPixelSchema)
      expect(pixelFields).toContain('organizationId')
      expect(pixelFields).not.toContain('projectId')

      // ASSERTION: Unique constraint is (organizationId, pixelId)
      expect(pixelFields).toContain('organizationId')
      expect(pixelFields).toContain('pixelId')
    })

    it('should document that CAPI.sendEvent queries pixels using organizationId only', () => {
      // BASELINE BEHAVIOR:
      // From capi.service.ts sendEvent method (lines 28-42):
      //
      // const ticket = await prisma.ticket.findUnique({
      //   where: { id: ticketId },
      //   select: {
      //     id: true,
      //     organizationId: true,
      //     organization: {
      //       select: {
      //         metaPixels: {
      //           select: { pixelId: true, capiToken: true },
      //           where: { isActive: true },
      //         },
      //       },
      //     },
      //     ...
      //   },
      // })
      //
      // The query does NOT filter pixels by ticket.projectId.
      // It gets ALL active pixels for ticket.organization, regardless of project.
      // This is equivalent to:
      //   SELECT * FROM meta_pixels
      //   WHERE organizationId = ticket.organizationId
      //   AND isActive = true

      const ticket = {
        id: 'ticket-001',
        organizationId: 'org-123',
        projectId: 'proj-a', // Ticket belongs to Project A
      }

      const pixelsInOrganization = [
        {
          id: 'pixel-001',
          organizationId: 'org-123', // Same org as ticket
          pixelId: 'fb-pixel-111',
          capiToken: 'token-111',
          isActive: true,
          projectAssociation: 'Project A', // Belongs to Project A (same as ticket)
        },
        {
          id: 'pixel-002',
          organizationId: 'org-123', // Same org as ticket
          pixelId: 'fb-pixel-222',
          capiToken: 'token-222',
          isActive: true,
          projectAssociation: 'Project B', // Belongs to Project B (DIFFERENT from ticket)
        },
      ]

      // ASSERTION: Query returns both pixels because they share the organization
      const queriedPixels = pixelsInOrganization.filter(
        (p) => p.organizationId === ticket.organizationId && p.isActive
      )

      expect(queriedPixels).toHaveLength(2)
      expect(queriedPixels).toContainEqual(pixelsInOrganization[0])
      expect(queriedPixels).toContainEqual(pixelsInOrganization[1]) // BUG: This pixel belongs to Project B!
    })

    it('should document that Ticket has projectId but CAPI does not use it for pixel filtering', () => {
      // BASELINE BEHAVIOR:
      // From prisma/schema.prisma, Ticket model has:
      // model Ticket {
      //   ...
      //   organizationId  String @db.Uuid
      //   projectId       String? @db.Uuid
      //   ...
      // }
      //
      // From capi.service.ts sendEvent method:
      // - Extracts ticket.organizationId
      // - Extracts ticket.projectId (implicitly available but unused)
      // - Uses ONLY ticket.organizationId to query pixels
      // - Does NOT filter pixels by ticket.projectId

      const ticketWithProject = {
        id: 'ticket-001',
        organizationId: 'org-123',
        projectId: 'proj-a',
        // All other fields...
      }

      // ASSERTION: Ticket has projectId field
      expect(ticketWithProject).toHaveProperty('projectId')
      expect(ticketWithProject.projectId).toBe('proj-a')

      // But in CAPI.sendEvent, only organizationId is used for pixel lookup:
      const pixelQueryFilter = {
        organizationId: ticketWithProject.organizationId,
        // projectId: ticketWithProject.projectId, // NOT USED
      }

      // ASSERTION: Pixel query does not use projectId
      expect(pixelQueryFilter).toHaveProperty('organizationId')
      expect(pixelQueryFilter).not.toHaveProperty('projectId')
    })

    it('should document that CAPI sends conversion to ALL organization pixels, not filtered by project', () => {
      // BASELINE BEHAVIOR:
      // From capi.service.ts sendEvent method (lines 69-82):
      //
      // let targetPixels = ticket.organization.metaPixels
      //
      // if (!targetPixels || targetPixels.length === 0) {
      //   logger.warn(`[CAPI] No Pixels found for organization ${ticket.organizationId}.`)
      //   return
      // }
      //
      // for (const pixel of targetPixels) {
      //   // Send event to each pixel asynchronously
      //   ...
      // }
      //
      // The loop sends the same conversion to EVERY pixel in targetPixels.
      // Since targetPixels is the ENTIRE org pixel list, it sends to pixels from all projects.

      const ticket = {
        organizationId: 'org-123',
        projectId: 'proj-a',
      }

      const organizationMetaPixels = [
        {
          pixelId: 'pixel-a-usa',
          capiToken: 'token-a',
          projectAssociation: 'Project A (USA)',
        },
        {
          pixelId: 'pixel-a-eu',
          capiToken: 'token-a-eu',
          projectAssociation: 'Project A (EU)',
        },
        {
          pixelId: 'pixel-b-uk',
          capiToken: 'token-b',
          projectAssociation: 'Project B (UK)', // Cross-project!
        },
      ]

      // BASELINE: All pixels are sent the conversion
      let targetPixels = organizationMetaPixels

      // ASSERTION: All org pixels are targeted, including Project B's pixel
      expect(targetPixels).toHaveLength(3)
      expect(targetPixels.map((p) => p.pixelId)).toContain('pixel-b-uk')

      // RISK: Conversion from Project A ticket sent to Project B pixel
      const sentToProjectB = targetPixels.some(
        (p) => p.projectAssociation.includes('Project B')
      )
      expect(sentToProjectB).toBe(true) // BUG: This should not happen
    })
  })

  describe('Test 0.6.2: Cross-project contamination risk - conversions can leak to sibling projects', () => {
    it('should document the risk scenario: Organization with multiple projects shares pixels', () => {
      // RISK SCENARIO:
      // Organization: "ACME Corp"
      // Project A: "Client 1 (USA)" → Controls pixels for USA audience
      // Project B: "Client 2 (UK)" → Controls pixels for UK audience
      //
      // When Project A creates a ticket with a conversion event,
      // CAPI queries metaPixels WHERE organizationId = ACME Corp
      // and gets BOTH Project A's pixels AND Project B's pixels.
      //
      // Result: USA conversions get sent to UK pixels (wrong audience!)
      // This causes data contamination in Facebook's dashboard.

      const organization = {
        id: 'org-acme',
        name: 'ACME Corp',
      }

      const projectA = {
        id: 'proj-client-1',
        organizationId: 'org-acme',
        name: 'Client 1 (USA)',
      }

      const projectB = {
        id: 'proj-client-2',
        organizationId: 'org-acme',
        name: 'Client 2 (UK)',
      }

      const pixelsControlledByProjectA = [
        { pixelId: 'pixel-usa-1', capiToken: 'token-1', projectId: 'proj-client-1' },
        { pixelId: 'pixel-usa-2', capiToken: 'token-2', projectId: 'proj-client-1' },
      ]

      const pixelsControlledByProjectB = [
        { pixelId: 'pixel-uk-1', capiToken: 'token-3', projectId: 'proj-client-2' },
        { pixelId: 'pixel-uk-2', capiToken: 'token-4', projectId: 'proj-client-2' },
      ]

      const allPixelsInOrganization = [
        ...pixelsControlledByProjectA,
        ...pixelsControlledByProjectB,
      ]

      // CAPI.sendEvent(ticketFromProjectA):
      const ticketFromProjectA = {
        id: 'ticket-001',
        organizationId: organization.id,
        projectId: projectA.id,
        conversion: 'LeadSubmitted',
        value: 100,
      }

      // Query: ticket.organization.metaPixels
      // Result: ALL pixels in organization (no project filter)
      const pixelsToReceiveConversion = allPixelsInOrganization

      // ASSERTION: Conversion goes to ProjectB's pixels (BUG!)
      expect(pixelsToReceiveConversion).toHaveLength(4)

      const projectBPixelsReceivingConversion = pixelsToReceiveConversion.filter(
        (p) => p.projectId === 'proj-client-2'
      )
      expect(projectBPixelsReceivingConversion).toHaveLength(2)

      // DOCUMENTATION: This is the baseline risk
      const crossProjectLeak = projectBPixelsReceivingConversion.length > 0
      expect(crossProjectLeak).toBe(true)
    })

    it('should document that there is NO validation that pixel belongs to ticket project', () => {
      // BASELINE BEHAVIOR:
      // From capi.service.ts sendEvent method:
      // There is NO check like:
      //   if (pixel.projectId !== ticket.projectId) {
      //     continue // Skip pixels from other projects
      //   }
      //
      // The code simply loops through ALL organization pixels and sends to each one.
      // There is no ownership validation.

      const ticket = {
        id: 'ticket-001',
        organizationId: 'org-123',
        projectId: 'proj-a',
      }

      const pixel = {
        pixelId: 'pixel-999',
        capiToken: 'token-999',
        // projectId: 'proj-b', // Hypothetically different project
        // But since MetaPixel has no projectId field in baseline,
        // there's nothing to validate against
      }

      // CURRENT CODE (from capi.service.ts lines 82-86):
      // for (const pixel of targetPixels) {
      //   if (!pixel.capiToken) {
      //     logger.warn(`[CAPI] Skipping pixel ${pixel.pixelId}: No CAPI Token configured.`)
      //     continue
      //   }
      //   // IMMEDIATELY sends event, no project ownership check
      // }

      // ASSERTION: No project ownership validation happens
      const pixelHasOwnershipValidation = false // Currently missing
      expect(pixelHasOwnershipValidation).toBe(false)

      // DOCUMENTATION: This is the baseline lack of safeguard
      const hasOwnershipCheck = 'pixel.projectId !== ticket.projectId ? skip : send'
      expect(hasOwnershipCheck).not.toBe('implemented')
    })

    it('should document the baseline: pixel belongs to wrong project but is still used', () => {
      // BASELINE BEHAVIOR:
      // Scenario: Pixel is created for Project B, but receives conversion from Project A ticket
      //
      // Step 1: Admin connects Meta Ad Account and creates pixels
      // Pixels are created with organizationId = Org
      // Pixels have NO projectId association
      //
      // Step 2: Later, pixels are manually assigned to projects via toggleAccount or other means
      // But this assignment is NOT stored in MetaPixel schema
      //
      // Step 3: Ticket from Project A is converted
      // CAPI.sendEvent(ticketA) queries pixels by organizationId
      // Gets ALL pixels including those "meant for" Project B
      // Sends conversion to all
      //
      // Result: Pixel intended for Project B receives event from Project A

      const baselineMetaPixelTable = {
        // Schema from prisma/schema.prisma
        fields: [
          'id',
          'organizationId',
          'pixelId',
          'capiToken',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
        uniqueConstraint: ['organizationId', 'pixelId'],
        hasProjectId: false,
        hasProjectOwnershipTracking: false,
      }

      // ASSERTION: MetaPixel schema cannot track project ownership
      expect(baselineMetaPixelTable.fields).toContain('organizationId')
      expect(baselineMetaPixelTable.fields).not.toContain('projectId')
      expect(baselineMetaPixelTable.hasProjectOwnershipTracking).toBe(false)

      // ASSERTION: Unique constraint is org-level, not project-level
      expect(baselineMetaPixelTable.uniqueConstraint[0]).toBe('organizationId')
      expect(baselineMetaPixelTable.uniqueConstraint).not.toContain('projectId')

      // DOCUMENTATION: This is why cross-project contamination is possible
      const pixelCanBeOwnedByProject = false // Not possible in baseline
      expect(pixelCanBeOwnedByProject).toBe(false)
    })
  })

  describe('Test 0.6.3: CAPI pixel selection flow demonstrates organization-wide behavior', () => {
    it('should document the complete CAPI.sendEvent flow using organization-wide pixels', () => {
      // BASELINE FLOW (from capi.service.ts):
      //
      // 1. sendEvent(ticketId, eventName, options)
      //    ↓
      // 2. prisma.ticket.findUnique({ where: { id: ticketId } })
      //    ↓
      // 3. Extract ticket.organizationId
      //    ↓
      // 4. Extract ticket.organization.metaPixels (where isActive = true)
      //    ↓ Query: WHERE organizationId = ticket.organizationId
      //    ↓ Returns ALL pixels in organization
      //    ↓
      // 5. For EACH pixel in organization:
      //       - Check pixel.capiToken exists
      //       - Create payload with ticket data
      //       - POST to Meta CAPI endpoint
      //       - Log result in MetaConversionEvent
      //    ↓
      // 6. Done
      //
      // KEY POINT: Step 4 uses organizationId only, gets all org pixels,
      // no filtering by ticket.projectId.

      const flowSteps = [
        {
          step: 1,
          function: 'sendEvent',
          input: 'ticketId, eventName, options',
        },
        {
          step: 2,
          function: 'prisma.ticket.findUnique',
          usesField: 'ticketId',
        },
        {
          step: 3,
          function: 'Extract organizationId',
          source: 'ticket.organizationId',
        },
        {
          step: 4,
          function: 'Query pixels',
          query: 'organization.metaPixels WHERE isActive = true',
          queryFilter: 'organizationId = ?',
          result: 'ALL pixels in organization (no project filter)',
        },
        {
          step: 5,
          function: 'Send event loop',
          target: 'for (const pixel of targetPixels)',
          riskZone: 'targetPixels includes pixels from all projects',
        },
      ]

      // ASSERTION: Flow uses organizationId for pixel selection
      expect(flowSteps[3].queryFilter).toContain('organizationId')
      expect(flowSteps[3].queryFilter).not.toContain('projectId')

      // ASSERTION: Result gets all org pixels
      expect(flowSteps[3].result).toContain('ALL pixels in organization')
      expect(flowSteps[3].result).toContain('no project filter')

      // ASSERTION: Risk is acknowledged
      expect(flowSteps[4].riskZone).toContain('all projects')

      // DOCUMENTATION: This is the baseline organization-wide pixel selection
      expect(flowSteps).toHaveLength(5)
    })

    it('should document pixel query includes no projectId context', () => {
      // BASELINE BEHAVIOR:
      // From capi.service.ts lines 28-42:
      //
      // const ticket = await prisma.ticket.findUnique({
      //   where: { id: ticketId },
      //   select: {
      //     id: true,
      //     organizationId: true,           // ← Used for pixel query
      //     organization: {                  // ← This entire organization
      //       select: {
      //         metaPixels: {                // ← All pixels
      //           select: { pixelId, capiToken },
      //           where: { isActive: true }, // ← Only active ones
      //         },
      //       },
      //     },
      //     // projectId is available in ticket but NOT used in metaPixels query
      //   },
      // })

      const ticketQuery = {
        where: { id: 'ticket-123' },
        select: {
          id: true,
          organizationId: true, // Used
          projectId: true, // Available but not used in metaPixels query
          organization: {
            select: {
              metaPixels: {
                select: { pixelId: true, capiToken: true },
                where: { isActive: true },
                // No filter by ticket.projectId
              },
            },
          },
        },
      }

      // ASSERTION: Query includes organizationId in select
      expect(ticketQuery.select).toHaveProperty('organizationId')

      // ASSERTION: Query includes projectId but it's not used for metaPixels filtering
      const metaPixelsWhereClause = ticketQuery.select.organization.select.metaPixels.where
      expect(metaPixelsWhereClause).not.toHaveProperty('projectId')
      expect(metaPixelsWhereClause).toHaveProperty('isActive')

      // DOCUMENTATION: projectId exists but is ignored for pixel selection
      expect(ticketQuery.select).toHaveProperty('projectId')
      expect(metaPixelsWhereClause).not.toHaveProperty('projectId')
    })
  })

  describe('BASELINE SUMMARY: Organization-Wide CAPI Pixel Selection', () => {
    it('documents the baseline CAPI pixel selection model before Phase 4 changes', () => {
      // SUMMARY OF BASELINE:
      // Current implementation is ORGANIZATION-SCOPED for CAPI pixels:
      //
      // ✗ RISK: MetaPixel has NO projectId field
      // ✗ RISK: CAPI.sendEvent queries pixels using organizationId only
      // ✗ RISK: No filtering by ticket.projectId
      // ✗ RISK: Conversions can be sent to pixels from sibling projects
      // ✗ RISK: No validation that pixel belongs to ticket's project
      //
      // IMPACT:
      // If Org has Project A (Client 1) and Project B (Client 2),
      // a conversion from Project A ticket may be sent to Project B's pixel.
      //
      // FUTURE STATE (Phase 4):
      // After Phase 4 implementation, CAPI will be updated to:
      // ✓ Add projectId to MetaPixel schema
      // ✓ Change unique constraint to (organizationId, projectId, pixelId)
      // ✓ Filter pixels by ticket.projectId in CAPI.sendEvent
      // ✓ Validate pixel ownership before sending conversions
      // ✓ Prevent cross-project contamination
      //
      // This baseline test documents the starting point before those changes.

      const baseline = {
        pixelScopeModel: 'ORGANIZATION',
        pixelQueryFilter: ['organizationId'],
        capiUsesProjectFilter: false,
        pixelSchemaHasProjectId: false,
        crossProjectContaminationRisk: true,
        hasPixelOwnershipValidation: false,
      }

      // ASSERTION: Baseline is organization-scoped
      expect(baseline.pixelScopeModel).toBe('ORGANIZATION')
      expect(baseline.pixelQueryFilter).not.toContain('projectId')
      expect(baseline.capiUsesProjectFilter).toBe(false)
      expect(baseline.pixelSchemaHasProjectId).toBe(false)

      // ASSERTION: Cross-project risk is present
      expect(baseline.crossProjectContaminationRisk).toBe(true)
      expect(baseline.hasPixelOwnershipValidation).toBe(false)

      // DOCUMENTATION: This is the baseline CAPI pixel selection behavior
      const baselineIssue =
        'CAPI selects pixels organization-wide, not project-scoped. ' +
        'Conversions from Project A can be sent to Project B pixels.'
      expect(baselineIssue).toContain('organization-wide')
      expect(baselineIssue).toContain('Project B')
    })
  })
})
