# PRD: Project como Boundary Forte para Integracoes e Canais

**Date:** 2026-03-14
**Status:** Draft
**Author:** Thiago + Codex

---

## 1. Overview

**One-liner:** Tornar `Project` o owner obrigatorio dos ativos de integracao e canais do cliente, sem alterar o metodo atual de conexao com Meta Ads e WhatsApp.

**Problem:** O produto foi pivotado para agencias, onde `Organization` representa a agencia e `Project` representa cada cliente. Mesmo assim, ativos criticos ainda podem nascer ou operar no escopo da organizacao. Isso gera ownership ambiguo, risco de contaminacao cross-project e fluxos em que CAPI, enrichment, onboarding e sync podem operar com o ativo errado.

**Goal:** Fazer `MetaConnection`, `MetaAdAccount`, `MetaPixel`, `WhatsAppConnection`, `WhatsAppConfig` e `WhatsAppOnboarding` pertencerem obrigatoriamente a um `Project`, preservando a forma atual de conexao com os providers, eliminando qualquer fallback org-scoped para ownership operacional do cliente e mantendo compatibilidade com o modelo de billing/IA por projeto definido separadamente.

### Program Split

Este PRD passa a ser o documento funcional de ownership operacional.

Desmembramento do programa:

- **PRD 29**: ownership forte de integracoes, canais, CAPI, enrichment e regras de delete/archive.
- **PRD 30**: billing por projeto provisionado e franquia/overage de IA.
- **PRD 32**: execucao em fases e milestones para migracao segura deste PRD.

Regra de execucao:

- este PRD nao deve mais ser implementado como entrega unica;
- a migracao deve seguir fases pequenas e testaveis;
- billing/IA nao devem bloquear o ownership cutover quando puderem entrar como compatibilidade e fase posterior.

---

## 2. User Stories

- As an agency operator, I want every Meta Ads and WhatsApp asset to belong to a specific project so that each client stays operationally isolated.
- As an agency operator, I want to continue connecting Meta Ads and WhatsApp exactly as today so that the provider integration flow remains stable and trusted.
- As an operator, I want CAPI and ad enrichment to use only the assets of the ticket's project so that no client data is sent with another client's credentials or pixels.
- As an admin, I want project deletion to be restricted when project-owned assets still exist so that the system never silently detaches or destroys operational data incorrectly.

---

## 3. Scope

### In Scope

- Make the following models project-scoped and mandatory in ownership terms:
  - `MetaConnection`
  - `MetaAdAccount`
  - `MetaPixel`
  - `WhatsAppConnection`
  - `WhatsAppConfig`
  - `WhatsAppOnboarding`
- Keep `organizationId` as an auth/billing/guard dimension, but stop using it as the primary ownership anchor for client assets.
- Add `projectId` to `MetaConversionEvent` for auditability and analytics.
- Update Meta Ads and WhatsApp services so that business reads are anchored on `projectId`.
- Update CAPI and ad enrichment to resolve assets from the ticket's project, never from the organization pool.
- Replace forced project deletion with a stricter ownership policy: project deletion only when empty; use archive as the normal operational path.
- Introduce migration, backfill, cutover and hardening rules for existing org-scoped data.
- Allow multiple WhatsApp numbers per project without hard blocking the connection flow; billing/accounting treatment is handled in PRD 30 and must remain compatible with this ownership model.
- Preserve the current connection method for Meta Ads and WhatsApp:
  - same provider handshake
  - same redirect/callback model
  - same Embedded Signup / OAuth semantics
  - same external provider integration pattern

### Out of Scope

- RBAC by project.
- Portal or auth for the end client.
- Refactoring `Conversation` and `Message` to carry direct `projectId` in this phase.
- Implementacao do billing por projeto provisionado, franquia de IA e overage; isso pertence ao PRD 30.
- Changing the external way accounts are connected to Meta Ads or WhatsApp.
- Introducing a parallel compatibility runtime where org-scoped and project-scoped ownership coexist indefinitely.
- Implementing enterprise BYO LLM key in this phase.

---

## 4. Technical Design

### Architecture

The architectural decision is:

- `Organization` remains the boundary for:
  - auth
  - membership
  - RBAC
  - billing
  - organization-wide settings
- `Project` becomes the boundary for:
  - client operational assets
  - client channels
  - client ad assets
  - client conversion routing

This is not a UI-only grouping. It is a domain ownership change.

#### Billing compatibility rule for multiple numbers per project

A project may own multiple WhatsApp numbers.

Product rule:

- the system must not hard-block additional WhatsApp numbers from being connected inside the same project
- additional numbers must still be accounted for in billing and overage

This means:

- ownership is project-scoped
- entitlement is measured for billing
- connection flow remains operationally allowed

The same principle may later be extended to other project-owned assets, but this PRD makes it explicit at least for WhatsApp numbers.

Implementation note:

- this PRD defines the ownership rule;
- billing measurement and charge behavior are implemented under PRD 30;
- ownership rollout must not be blocked by waiting for full billing UX completion.

#### Commercial model tied to project ownership

The detailed commercial implementation is tracked in PRD 30.

This section remains here only as a compatibility constraint for the ownership model.

This PRD assumes the following commercial model:

- the subscription is billed at the `Organization` level
- billing runs in fixed 30-day cycles
- the base monthly subscription includes 1 project
- each additional project has a fixed recurring charge
- each project includes an AI allowance
- AI usage above the per-project allowance generates overage

This keeps the economic model aligned with the operational model:

- the agency pays at the organization level
- each client workspace is represented by a project
- cost scales with project count and project-level AI usage

#### Billing lifecycle for provisioned projects

For this phase, project billing is based on provisioning, not on operational usage.

Rules:

- creating a project provisions a billable project workspace
- a newly created project starts in `active` status
- the organization base subscription includes 1 provisioned project
- every additional provisioned project is billable as a recurring add-on
- a project does not need connected assets, leads, tickets or AI usage to count as provisioned
- billing is evaluated in fixed 30-day cycles
- project lifecycle for billing is `active | archived`

Operational interpretation:

- created project = provisioned project = billable project
- `active` project = provisioned and billable
- archived project = no longer billable from the next 30-day cycle
- deleting or archiving a project mid-cycle does not create a refund in this phase unless a future billing PRD says otherwise

Explicit simplification for v1:

- no daily proration for project-count billing in this PRD
- project-count changes affect the current tracked quantity for the cycle and the next cycle renewal logic

This rule is intentionally simpler than usage-based activation because it matches the commercial promise:

- each client workspace is a paid operational slot
- there is no `draft` state in this phase

#### AI provider key strategy

The key strategy remains a compatibility constraint for this PRD. Any pricing or allowance implementation detail belongs to PRD 30.

For this phase, AI provider keys remain platform-managed.

Default rule:

- WhaTrack absorbs provider cost
- WhaTrack exposes AI allowance and overage to the customer

Future direction:

- enterprise plans may allow organization-level BYO LLM key

Explicit non-goal for this phase:

- no per-project LLM key management
- no organization BYO key implementation yet

#### Critical invariant: connection method does not change

The current connection methods for Meta Ads and WhatsApp are considered correct and stable. This PRD must not alter the external provider integration flow.

That means:

- Meta Ads OAuth remains OAuth-based.
- WhatsApp onboarding remains the current provider-approved onboarding/redirect flow.
- Existing callback structure remains.
- Existing provider app configuration assumptions remain.

What changes:

- the project context captured before connection starts
- the ownership persisted in local records
- the project used after callback completes
- the project anchor used by reads, sync, CAPI and enrichment

What does not change:

- the provider-facing handshake
- the provider-facing redirect semantics
- the way the user authorizes Meta Ads
- the way the user starts and completes WhatsApp connection

#### Runtime ownership rule

After cutover:

- no customer asset may exist without a `projectId`
- no service may choose an integration asset by organization when project context is available
- project-scoped services accept `projectId` as business scope and `organizationId` as guard scope

Suggested service signature:

```ts
service({ organizationId, projectId, ...input })
```

The service must validate that:

- `projectId` belongs to `organizationId`

But its business query must be anchored on:

- `projectId`

#### Thin boundary rule

Routes remain thin:

- authenticate
- validate input
- resolve project context if needed
- call service
- return response

Business logic remains in services and server-side helpers.

### Data Model

#### Project

`Project` must explicitly own all client operational assets:

```prisma
model Project {
  id                    String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId        String               @db.Uuid
  name                  String
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  organization          Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  metaConnections       MetaConnection[]
  metaAdAccounts        MetaAdAccount[]
  metaPixels            MetaPixel[]
  whatsAppConnections   WhatsAppConnection[]
  whatsappConfigs       WhatsAppConfig[]
  whatsappOnboardings   WhatsAppOnboarding[]
  leads                 Lead[]
  tickets               Ticket[]
  sales                 Sale[]
  items                 Item[]
  itemCategories        ItemCategory[]
}
```

#### MetaConnection

Add mandatory `projectId`.

Keep `organizationId` for:

- auth guard
- membership validation
- logging
- billing and organization analytics

But stop using `organizationId` as the primary query anchor for ownership.

```prisma
model MetaConnection {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String   @db.Uuid

  fbUserId       String
  fbUserName     String
  accessToken    String
  tokenExpiresAt DateTime

  status         String   @default("ACTIVE")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Restrict)
  adAccounts     MetaAdAccount[]

  @@unique([projectId, fbUserId])
  @@index([organizationId, projectId])
}
```

Rationale:

- one Meta identity may be connected to different projects in different contexts
- ownership must be explicit at the project layer
- deleting a project must not cascade-delete tokens and imported ad accounts implicitly
- billing remains consolidated at organization level even though the connection is project-owned

#### MetaAdAccount

Make `projectId` mandatory.

```prisma
model MetaAdAccount {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String   @db.Uuid
  connectionId   String   @db.Uuid

  adAccountId    String
  adAccountName  String
  isActive       Boolean  @default(false)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Restrict)
  connection     MetaConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([organizationId, adAccountId])
  @@index([projectId])
  @@index([organizationId, projectId])
}
```

#### MetaPixel

Add mandatory `projectId`.

```prisma
model MetaPixel {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String   @db.Uuid

  name           String?
  pixelId        String
  capiToken      String
  isActive       Boolean  @default(true)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project      @relation(fields: [projectId], references: [id], onDelete: Restrict)

  @@unique([organizationId, pixelId])
  @@index([projectId])
  @@index([organizationId, projectId])
}
```

#### WhatsAppConnection

Add mandatory `projectId` to remove ownership ambiguity at the root connection level.

```prisma
model WhatsAppConnection {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @db.Uuid
  projectId         String   @db.Uuid
  wabaId            String
  ownerBusinessId   String?
  phoneNumberId     String?
  status            String   @default("pending")
  connectedAt       DateTime?
  disconnectedAt    DateTime?
  lastWebhookAt     DateTime?
  lastHealthCheckAt DateTime?
  healthStatus      String   @default("unknown")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization @relation("WhatsAppConnections", fields: [organizationId], references: [id], onDelete: Cascade)
  project           Project      @relation(fields: [projectId], references: [id], onDelete: Restrict)
  configs           WhatsAppConfig[]

  @@unique([organizationId, wabaId])
  @@index([projectId])
  @@index([organizationId, projectId])
}
```

#### WhatsAppConfig

Make `projectId` mandatory.

```prisma
model WhatsAppConfig {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String   @db.Uuid
  connectionId   String?  @db.Uuid
  ...

  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project             @relation(fields: [projectId], references: [id], onDelete: Restrict)
  connection     WhatsAppConnection? @relation(fields: [connectionId], references: [id], onDelete: Cascade)
}
```

Important:

- `onDelete` must be `Restrict`, not `Cascade`

Reason:

- `Conversation` and `Message` depend on `WhatsAppConfig`
- cascading through project deletion could destroy conversation history unintentionally

Billing note:

- multiple `WhatsAppConfig` records may exist under the same project
- this is allowed behavior
- active connected numbers must be counted for billing and overage, not blocked at connection time
- this counting must roll up to organization billing without flattening ownership back to organization

#### WhatsAppOnboarding

Add mandatory `projectId`.

```prisma
model WhatsAppOnboarding {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @db.Uuid
  projectId         String   @db.Uuid
  trackingCode      String   @unique
  authorizationCode String?
  status            String   @default("pending")
  ...

  organization      Organization @relation("WhatsAppOnboardings", fields: [organizationId], references: [id], onDelete: Cascade)
  project           Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

Here `Cascade` is acceptable because onboarding records are ephemeral process records, not operational history owners.

#### MetaConversionEvent

Add `projectId` for traceability:

```prisma
model MetaConversionEvent {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String   @db.Uuid
  ticketId       String   @db.Uuid
  ...

  project        Project @relation(fields: [projectId], references: [id], onDelete: Restrict)

  @@index([projectId])
  @@index([organizationId, projectId])
}
```

Reason:

- auditability
- debugging
- future analytics
- ownership checks without deep joins

#### Deletion semantics

The old semantic of:

- force-delete project
- mass-nullify `projectId`
- leave assets floating at organization level

must be removed.

New rule:

- a project can only be deleted when empty
- archive becomes the standard operational path

A project is not empty if it still has:

- `MetaConnection`
- `MetaAdAccount`
- `MetaPixel`
- `WhatsAppConnection`
- `WhatsAppConfig`
- pending `WhatsAppOnboarding`
- `Lead`
- `Ticket`
- `Sale`
- `Item`
- `ItemCategory`

### API / Server Actions

#### General rule

The app continues authenticating by organization, but operational ownership becomes project-scoped.

Routes and server actions must:

- authenticate
- validate
- resolve project context when needed
- call a project-scoped service

Billing and AI accounting services must:

- continue to aggregate financially at organization level
- measure entitlements and overages by project count and project usage

#### Meta Ads

Impacted endpoints:

- `GET /api/v1/meta-ads/connections`
- `DELETE /api/v1/meta-ads/connections/[id]`
- `GET /api/v1/meta-ads/ad-accounts`
- `PATCH /api/v1/meta-ads/ad-accounts/[id]`
- `GET /api/v1/meta-ads/pixels`
- `POST /api/v1/meta-ads/pixels`
- `PATCH /api/v1/meta-ads/pixels/[id]`
- `DELETE /api/v1/meta-ads/pixels/[id]`
- `GET /api/v1/meta-ads/connect`
- Meta Ads callback route

Required changes:

- `projectId` must be part of the operational context
- OAuth state must change from:

```ts
{ organizationId, userId }
```

to:

```ts
{ organizationId, userId, projectId }
```

- callback must resolve `projectId` from consumed state
- `syncAdAccounts` should infer project ownership from `connectionId`, not from an extra project argument

#### WhatsApp

Impacted endpoints:

- `GET /api/v1/whatsapp/onboarding`
- WhatsApp callback route
- `GET /api/v1/whatsapp/instances`
- `PATCH /api/v1/whatsapp/instances`
- `POST /api/v1/whatsapp/disconnect`

Required changes:

- onboarding session creation must receive `{ organizationId, projectId }`
- callback must recover `projectId` from persisted onboarding state
- `WhatsAppConnection` and `WhatsAppConfig` must be materialized directly inside the project
- the API must not reject additional WhatsApp numbers purely because the project already has one connected number
- billing/accounting logic must continue to measure how many connected numbers the project owns

#### Service signatures

Recommended signatures:

```ts
listMetaConnections({ organizationId, projectId })
listMetaPixels({ organizationId, projectId })
getActiveAccounts({ organizationId, projectId })
listWhatsAppInstances({ organizationId, projectId })
createWhatsAppOnboardingSession({ organizationId, projectId })
```

Recommended ownership helpers:

```ts
ensureProjectBelongsToOrganization(organizationId, projectId)
requireOwnedMetaConnection(organizationId, projectId, connectionId)
requireOwnedMetaPixel(organizationId, projectId, pixelId)
requireOwnedWhatsAppConfig(organizationId, projectId, configId)
```

#### Billing and AI accounting compatibility constraints

The ownership refactor must remain compatible with the pricing model defined in PRD 30:

- billing cycle is fixed at 30 days
- organization base subscription includes 1 project
- additional projects are billed as recurring add-ons
- each project contributes its own AI allowance
- AI overage is measured against project-scoped usage and then rolled up to organization billing

Compatibility consequences:

- project count must be part of subscription item sync
- project count is based on provisioned projects, not on "used enough" projects
- AI usage records must remain attributable to a project whenever possible
- usage reporting should support both:
  - organization financial summary
  - project-level consumption visibility

#### Critical preservation rule for connections

The following are explicitly forbidden in this PRD:

- changing the provider connection method
- replacing Meta OAuth with another integration pattern
- replacing the current WhatsApp onboarding method
- changing external provider callback semantics beyond carrying project context internally
- introducing a new manual connection flow that differs from the current one

In other words:

- connection UX may become project-aware
- connection mechanics must remain the same

### UI Components

#### Global behavior

- project selector remains part of the product shell
- for ownership operations, "Todos os projetos" is not a valid context

#### Cardinality rule

The domain allows:

- one organization to have many projects
- one project to have many WhatsApp numbers
- one project to have many Meta connections, ad accounts and pixels

Business limits must be handled by billing/accounting, not by silently flattening ownership back to the organization.

#### Integration UX rules

The UI must clearly communicate:

- "voce esta conectando ativos para o projeto X"

There must be no ambiguous flow of:

- connect now
- classify later

#### Screens/components impacted

- Meta Ads integration screens
- WhatsApp integration screens
- project detail and project management flows
- dialogs/buttons related to connect, assign, sync and disconnect

#### Deletion UX

Project deletion UI must reflect the new ownership model:

- project with owned assets cannot be deleted
- archive is the default operational action
- force deletion with mass de-association must disappear

#### Billing UX expectation

The user should understand:

- billing works in 30-day cycles
- the base subscription includes 1 project
- additional projects are billable
- additional WhatsApp numbers are allowed but billable when applicable
- each project has an AI allowance
- AI usage above allowance becomes overage

### Third-Party Dependencies

No new third-party provider integration is introduced.

This PRD keeps:

- current Meta Ads integration method
- current WhatsApp integration method

New packages are not required by design.

The change is primarily:

- schema
- service
- API
- migration
- UI ownership semantics

### Execution Rule

This PRD must be executed through phased rollout, not as a single-shot migration.

Execution document:

- `docs/PRD/32_PRD_PROJECT_STRICT_OWNERSHIP_EXECUTION_PHASES.md`

---

## 5. Edge Cases & Error Handling

- If a ticket has no `projectId`, CAPI must abort instead of choosing organization-level pixels.
- If a project has no active Meta connection, ad enrichment must fail or skip for that project only; it must never fallback to another project's connection.
- If an organization has more than one project and legacy assets without `projectId`, backfill must require explicit mapping before cutover.
- If a project still owns assets, delete must return conflict instead of nullifying ownership.
- If OAuth state or onboarding state is consumed without `projectId`, the callback must fail safely rather than creating org-scoped assets.
- If sync imports assets from a connection, imported assets must inherit the owning project's context from the connection itself.
- If a user tries to operate in "Todos os projetos" for connect/create flows, the UI must block the action.
- If a project already has one or more connected WhatsApp numbers, the next connection must still be allowed; billing must account for the additional connected number instead of blocking the flow.
- If a new project is created beyond the included base quantity, billing sync must reflect the additional recurring project charge without blocking project creation.
- If a project is created and no accounts are connected, it still counts as a provisioned project for billing.
- If a project is archived in the middle of a 30-day cycle, the billing impact only changes for the next cycle in this phase.
- If AI usage exceeds the allowance of a given project, the system must record overage instead of disabling the project abruptly.
- Concurrent requests creating assets must still respect ownership constraints and unique indexes after migration.

---

## 6. Security Considerations

- Auth remains organization-based. Every project-scoped operation must still verify that the project belongs to the active organization.
- UI project context is cosmetic unless the server re-validates ownership. All provider callbacks must resolve project ownership from server-side state, never trust raw client input.
- CAPI must never use organization-wide pixel selection after cutover.
- Ad enrichment must never use "first active connection in organization" after cutover.
- All route payloads, query params, callback data and state objects must continue to be validated with Zod.
- Removing force-delete with mass de-association reduces the risk of silent cross-project data corruption.
- Logging should include `organizationId`, `projectId` and resource identifiers where relevant.
- Billing enforcement must not mutate or reject provider callback flows in a way that breaks the trusted integration method; billing should account for excess connected numbers without changing the provider handshake.
- AI cost controls must not depend on per-project secret management in this phase; platform-managed keys remain the trust boundary.
- Billing logic for project count must be deterministic and auditable across 30-day cycles; it must not depend on fuzzy activation heuristics like "first real usage".

---

## 7. Testing Strategy

- **Unit:** schema constraints, ownership helpers, project-scoped query builders, CAPI project resolution, enrichment project resolution, onboarding state/project recovery, deletion guards.
- **Integration:** Meta OAuth state carrying `projectId`, Meta callback creating connection in the correct project, WhatsApp onboarding creating connection/config in the correct project, API 404 on project mismatch, API 409 on non-empty project deletion.
- **E2E:** connect Meta Ads inside a project without changing connection method, connect WhatsApp inside a project without changing onboarding method, create/send conversion from a ticket and verify project-specific routing, attempt to delete a non-empty project and verify block/archive behavior.

Billing and AI test coverage belongs to PRD 30 and should be coordinated there.

---

## 8. Rollout Plan

- [ ] Keep the current external connection method for Meta Ads unchanged.
- [ ] Keep the current external connection method for WhatsApp unchanged.
- [ ] Expand schema first with migration-safe fields and indexes.
- [ ] Backfill legacy assets:
  - single-project organizations can be auto-mapped
  - multi-project organizations require explicit mapping before cutover
- [ ] Move writes first so every new asset is created with `projectId`.
- [ ] Cut over reads and operational queries to project-scoped ownership.
- [ ] Harden schema with `NOT NULL`, stricter relations and removal of org-scoped ownership fallbacks.
- [ ] Replace force-delete with archive + empty-only delete.
- [ ] Add targeted monitoring/logging for:
  - callback ownership failures
  - CAPI routing failures
  - enrichment missing-connection cases
  - migration backfill exceptions

Billing/AI rollout dependency:

- [ ] Coordinate with PRD 30 so the ownership model remains compatible with project-count billing, additional connected numbers and project-scoped AI allowance/overage.

---

## 9. Open Questions

- Should project archive be introduced in the same delivery as delete hardening, or in a follow-up PRD?
- For organizations with multiple existing projects and ambiguous legacy assets, what is the operational migration tool or admin UX for explicit mapping?
- Should `MetaConnection` uniqueness remain `[projectId, fbUserId]` only, or do we also need a stronger business rule around one active Meta connection per project?
- Should `WhatsAppConnection` uniqueness remain `[organizationId, wabaId]`, or should the final invariant evolve toward a project-focused unique constraint once legacy data is removed?
- Do we want `projectId` added to additional audit/log tables in this same phase, or only in `MetaConversionEvent` for now?
- For billing UX, where should the user see that extra WhatsApp numbers are allowed but billable: project detail, billing screen, or both? Track under PRD 30.
- Where should project-level AI allowance and overage be surfaced first: project detail, billing summary, or both? Track under PRD 30.
- Should the persisted project status model be explicitly limited to `active | archived` in schema/UI from the first implementation, or should that remain an internal service rule first?

---

## Appendix: Preserved Connection Flows

### Meta Ads

This PRD preserves:

- current OAuth entry point
- current redirect flow
- current callback flow
- current provider configuration model

Only these internal aspects change:

- state payload carries `projectId`
- local persistence uses `projectId`
- imported assets inherit project ownership

### WhatsApp

This PRD preserves:

- current onboarding initiation method
- current provider-approved connection flow
- current callback pattern
- current provider-side setup assumptions

Only these internal aspects change:

- onboarding record stores `projectId`
- callback resolves project from onboarding state
- local connection/config records are created in that project
