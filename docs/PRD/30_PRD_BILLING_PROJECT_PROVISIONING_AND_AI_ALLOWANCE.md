# PRD: Billing por Projeto Provisionado e Franquia de IA

**Date:** 2026-03-14
**Status:** Draft
**Author:** Thiago + Codex

---

## 1. Overview

**One-liner:** Atualizar o billing do produto para cobrar no nivel da `Organization`, com `1` projeto incluido na base, cobranca recorrente por projeto adicional provisionado, franquia de IA por projeto e overage de IA consolidado por ciclo de 30 dias.

**Problem:** O billing atual ja tem assinatura local, sync de itens recorrentes e ciclo fixo de `30` dias, mas a regra comercial implementada no codigo ainda reflete um modelo antigo. Hoje o seed de planos inclui `3` projetos na base, a contagem considera todos os projetos da organizacao sem lifecycle explicito, a UI ainda comunica esse modelo antigo e a franquia de IA existe apenas como entitlement catalogado, sem fechamento faturavel por projeto. Isso cria desalinhamento entre produto, pricing, UX e cobranca real.

**Goal:** Formalizar e implementar um modelo de billing coerente com o produto para agencias:

- `Organization` paga a assinatura
- a base inclui `1` projeto
- cada projeto adicional provisionado cobra recorrencia fixa
- cada projeto inclui franquia propria de IA
- uso extra de IA gera overage
- ciclos sao fixos de `30` dias
- a forma de conexao com WhatsApp e Meta Ads nao muda

---

## 2. User Stories

- As an agency owner, I want the subscription to belong to my organization so that my company remains the single billing entity.
- As an agency owner, I want the base plan to include exactly one project so that pricing matches the first active client workspace.
- As an agency owner, I want every additional project to be billed automatically so that cost scales with my client portfolio.
- As an agency operator, I want a newly created project to count as provisioned immediately so that billing follows a simple and deterministic rule.
- As an agency operator, I want to connect multiple WhatsApp numbers in the same project without blockage so that operations are not interrupted by billing mechanics.
- As an agency owner, I want additional WhatsApp numbers and additional Meta ad accounts to be counted for billing so that usage above the included baseline is monetized.
- As an agency owner, I want each project to include its own AI allowance so that each client workspace carries a predictable operational budget.
- As an agency owner, I want AI usage above the included allowance to generate overage instead of hard blocking so that my team can continue operating.
- As an internal operator, I want the billing model to preserve the existing Meta Ads and WhatsApp connection flow so that provider integrations stay stable.

---

## 3. Scope

### In Scope

- Update the commercial billing model to:
  - base subscription at `Organization` level
  - fixed `30` day cycles
  - `1` included project in the base plan
  - recurring fixed charge for each additional provisioned project
  - one included WhatsApp number per project baseline
  - one included Meta ad account per project baseline
  - AI allowance per project
  - AI overage after the project allowance is exceeded
- Define `Project` billing lifecycle as `active | archived`.
- Make project creation immediately provision and bill the project.
- Exclude archived projects from future billing cycles.
- Keep current recurring subscription-item sync for:
  - base plan
  - additional projects
  - additional WhatsApp numbers
  - additional Meta ad accounts
- Introduce auditable AI billing logic based on project-scoped usage and cycle closeout.
- Update billing catalog, seeds, UI copy, service logic and tests to match the new model.
- Keep trial logic coherent with the new base entitlement.
- Keep billing organization-scoped even though assets and AI usage become project-scoped.
- Preserve the existing external connection method for WhatsApp and Meta Ads.

### Out of Scope

- Changing the provider-facing connection handshake for WhatsApp.
- Changing the provider-facing OAuth / callback semantics for Meta Ads.
- Implementing BYO LLM key in this phase.
- Project-level RBAC changes.
- Daily proration or refund logic for project-count billing in this phase.
- End-customer billing or charging clients of the agency directly.
- Multiple base plans or tiered project bundles in this phase.
- Repricing the catalog in this PRD beyond the structural rule change; exact monetary values remain owned by pricing/catalog decisions.

---

## 4. Technical Design

### Architecture

Billing remains `organization-scoped`, but consumption becomes explicitly `project-aware`.

Confirmed current state in code:

- `src/services/billing/billing-subscription.service.ts` already uses `BILLING_CYCLE_DAYS = 30`
- the service already calculates:
  - `activeProjects`
  - `additionalProjects`
  - `additionalWhatsAppNumbers`
  - `additionalMetaAdAccounts`
- `syncOrganizationSubscriptionItems()` already synchronizes:
  - base plan item
  - `additional_project`
  - `additional_whatsapp_number`
  - `additional_meta_ad_account`
- `prisma/seeds/seed_billing_plans.ts` still seeds the base plan with `includedProjects: 3`
- billing UI in `src/components/dashboard/billing/billing-status.tsx` still communicates the old “3 clientes ativos” style model
- AI allowance already exists in `BillingPlan.includedAiCreditsPerProject`, but there is no project-aware AI closeout and no AI overage charge being generated today

Target architecture:

- `Organization` remains:
  - the payer
  - the subscription owner
  - the Stripe customer / provider customer owner
  - the place where the recurring invoice is consolidated
- `Project` becomes:
  - the unit of provisioned recurring value
  - the unit of included operational baseline
  - the unit of AI allowance consumption
  - the unit of AI overage accounting

The billing engine must follow these rules:

- a project is billable when it is `active`
- creating a project creates an `active` provisioned slot immediately
- `archived` projects stop counting on the next cycle
- no `draft` state exists in this phase
- billing never blocks the external connection flow of Meta Ads or WhatsApp
- recurring quantity-based charges stay in subscription items
- AI overage is closed out separately at cycle boundary, then charged at organization level

### Current-to-Target Delta

Current product behavior and target behavior:

- Current: base plan includes `3` projects
- Target: base plan includes `1` project

- Current: project count is effectively `count(*)` on `Project` by organization
- Target: only `Project.status = active` counts toward billing

- Current: project lifecycle is implicit; there is no billing-safe archive semantics
- Target: `active | archived` becomes explicit and auditable

- Current: archived/non-operational projects would still be counted because there is no billing lifecycle field
- Target: archived projects remain in history but leave billing on the next `30` day cycle

- Current: AI allowance exists only as metadata/entitlement
- Target: AI allowance becomes a real monthly billable rule with project-scoped measurement and organization-level overage consolidation

- Current: the UI and tests still encode the “3 included projects” assumption
- Target: UI, docs, seeds and test fixtures align with “1 included project”

### Data Model

#### Project lifecycle

Add explicit lifecycle to `Project`:

```prisma
model Project {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  name           String
  status         String   @default("active") // 'active' | 'archived'
  archivedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  leads           Lead[]
  tickets         Ticket[]
  sales           Sale[]
  items           Item[]
  itemCategories  ItemCategory[]
  whatsappConfigs WhatsAppConfig[]
  metaAdAccounts  MetaAdAccount[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([organizationId, status])
  @@map("projects")
}
```

Rules:

- create project => `status = active`
- archive project => `status = archived`, `archivedAt = now()`
- archived project is preserved for history and reporting
- archived project is excluded from future recurring quantity calculations

#### BillingPlan catalog

The catalog model can continue to exist, but the seeded base semantics change:

```ts
platform_base.includedProjects = 1
additional_project.kind = 'addon'
additional_project.addonType = 'project'
```

Existing add-ons remain conceptually valid:

- `additional_project`
- `additional_whatsapp_number`
- `additional_meta_ad_account`

For AI overage, the current catalog is insufficient because it only stores included allowance, not the overage pricing rule. This PRD introduces explicit AI overage pricing metadata.

Recommended catalog extension:

```prisma
model BillingPlan {
  // existing fields...
  includedAiCreditsPerProject Int    @default(0)
  aiOverageUnitCredits        Int    @default(1000)
  aiOverageUnitPrice          Decimal @db.Decimal(10, 2)
}
```

Interpretation:

- each active project includes `includedAiCreditsPerProject`
- overage is billed in blocks of `aiOverageUnitCredits`
- each block costs `aiOverageUnitPrice`

If the team prefers to avoid schema expansion in `BillingPlan`, the same values may temporarily live in `metadata`, but that is weaker for validation and admin tooling. The recommended path is first-class fields.

#### AI usage attribution

Current `AiInsightCost` tracks cost telemetry but is not usable as project-aware billing input because it has no `projectId` and no normalized billable credit field.

Recommended extension:

```prisma
model AiInsightCost {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId     String   @db.Uuid
  aiInsightId        String   @db.Uuid
  projectId          String?  @db.Uuid
  billingCreditsUsed Int      @default(0)
  billingModelVersion String  @default("v1")
  // existing fields...

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  insight      AiInsight    @relation(fields: [aiInsightId], references: [id], onDelete: Cascade)
  project      Project?     @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([organizationId, projectId, createdAt])
}
```

Rationale:

- raw provider cost and billable customer credit are not the same concern
- the platform may switch models/providers over time while preserving the commercial credit model
- per-project AI allowance requires project-aware usage attribution

#### AI billing closeout ledger

Recurring add-ons already fit subscription-item sync. AI overage does not.

AI overage needs a dedicated closeout ledger:

```prisma
model BillingAiProjectCloseout {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriptionId      String   @db.Uuid
  organizationId      String   @db.Uuid
  projectId           String   @db.Uuid
  cycleStartDate      DateTime
  cycleEndDate        DateTime
  includedCredits     Int
  usedCredits         Int
  overageCredits      Int
  billedUnits         Int
  unitPrice           Decimal  @db.Decimal(10, 2)
  amountCharged       Decimal  @db.Decimal(10, 2)
  providerInvoiceItemId String?
  status              String   @default("pending") // 'pending' | 'charged' | 'skipped' | 'failed'
  processedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([subscriptionId, projectId, cycleStartDate, cycleEndDate])
  @@index([organizationId, cycleEndDate])
  @@map("billing_ai_project_closeouts")
}
```

This ledger is required because:

- AI overage is monthly variable usage, not a fixed recurring quantity
- finance/support need auditability per project and per cycle
- retries and reconciliation need idempotency

### Entitlement Calculation

Replace the current counting logic with explicit billing semantics.

Current behavior in `getOrganizationResourceCounts()`:

- projects are counted with `prisma.project.count({ where: { organizationId } })`
- connected WhatsApp numbers are grouped by `projectId`
- active Meta ad accounts are grouped by `projectId`

Target behavior:

- `activeProjects = count(project where organizationId and status = 'active')`
- connected WhatsApp counts only consider active projects
- active Meta account counts only consider active projects
- archived projects and their assets stay historically visible, but do not generate future recurring counts

Recurring extra formula:

```ts
additionalProjects = max(0, activeProjects - includedProjects)
additionalWhatsAppNumbers = sum(max(0, connectedWhatsAppsInProject - includedWhatsAppPerProject))
additionalMetaAdAccounts = sum(max(0, activeMetaAccountsInProject - includedMetaAdAccountsPerProject))
```

Important rule:

- additional WhatsApp numbers are counted, not blocked
- additional Meta ad accounts are counted, not blocked

### AI Billing Model

The AI commercial model is:

- allowance is granted per active project
- allowance is measured per project, not pooled at organization level
- overage is computed per project
- overage is billed to the organization

Example:

- plan includes `10,000` AI credits per active project
- organization has `3` active projects
- project A uses `12,500`
- project B uses `3,000`
- project C uses `10,000`

Billing result:

- project A produces `2,500` overage credits
- project B produces `0`
- project C produces `0`
- organization invoice includes only the overage from project A

This is intentionally not pooled across projects. Otherwise one project could subsidize another and the “allowance per project” promise would become false.

#### AI credit source of truth

Each billable AI execution must resolve:

- `organizationId`
- `projectId` when the action belongs to a project
- normalized `billingCreditsUsed`

Examples:

- ticket/copilot actions on a project ticket must consume that ticket's project allowance
- project-scoped Meta analysis should consume that project's allowance
- truly organization-scoped admin AI may remain outside customer-facing project allowance in this phase

#### AI closeout logic

At cycle close:

1. locate subscriptions with `nextResetDate <= now`
2. load active projects for the organization for the just-finished cycle
3. aggregate `billingCreditsUsed` per `projectId` within `[billingCycleStartDate, billingCycleEndDate)`
4. compute `overageCredits = max(0, usedCredits - includedCredits)`
5. convert overage credits into billable units
6. create closeout ledger rows idempotently
7. create provider invoice item(s) for the aggregated AI overage amount
8. mark closeout rows as charged
9. move subscription to the next cycle

Recommended billing unit:

```ts
billedUnits = Math.ceil(overageCredits / aiOverageUnitCredits)
amountCharged = billedUnits * aiOverageUnitPrice
```

#### AI key strategy

This PRD keeps AI provider keys platform-managed.

Rules for this phase:

- the platform pays the provider
- the app bills the customer via plan allowance + overage
- no per-project custom LLM key
- no organization BYO key yet

Future direction:

- enterprise plan may allow organization-level BYO LLM key

### API / Server Actions

Existing endpoints can remain, but business semantics change.

Key server/service updates:

```ts
async function getOrganizationBillingEntitlements(
  organizationId: string,
  options?: {
    includedProjects?: number
    includedWhatsAppPerProject?: number
    includedMetaAdAccountsPerProject?: number
    includedConversionsPerProject?: number
    includedAiCreditsPerProject?: number
  }
): Promise<EntitlementCounts>
```

Behavior change:

- count only active projects
- include archived-safe semantics

New project lifecycle service operations:

```ts
async function archiveProjectForBilling(input: {
  organizationId: string
  projectId: string
}): Promise<void>
```

New AI closeout service:

```ts
async function closeAiBillingCycles(now: Date): Promise<{
  processedSubscriptions: number
  chargedCloseouts: number
  failedCloseouts: number
}>
```

New cron route:

```ts
POST /api/v1/cron/billing/close-ai-cycles
```

Responsibilities:

- authenticate with `CRON_SECRET`
- run AI closeout idempotently
- emit logs/metrics

Important separation:

- recurring project / WhatsApp / Meta charges remain in subscription items
- AI overage is not synchronized as a recurring subscription item
- AI overage is charged by cycle-close invoice item(s)

### UI Components

Billing UI must stop communicating the old pricing model and must surface the new lifecycle clearly.

Affected surfaces:

- `src/components/dashboard/billing/billing-status.tsx`
- `src/components/dashboard/account/account-billing-card.tsx`
- pricing/plan selector surfaces that show included project count
- billing plan CRUD/admin forms and previews

UI behavior target:

- show base includes `1` project
- show active project count
- show additional billed projects
- show additional WhatsApp numbers
- show additional Meta ad accounts
- show AI allowance per active project
- show AI overage separately from recurring add-ons
- explain that archived projects leave billing on the next cycle

Project lifecycle UX target:

- creating a project should make the billing consequence explicit
- archiving a project should warn that billing changes only on the next cycle
- connection flows must not be blocked by quota checks for additional WhatsApp numbers

### Third-Party Dependencies

No new provider is required.

This PRD continues using the current payment provider integration path:

- Stripe subscription for recurring fixed items
- provider invoice item(s) for cycle-based AI overage closeout

No change is allowed to:

- Meta Ads OAuth connection method
- WhatsApp onboarding / embedded signup / callback method

---

## 5. Edge Cases & Error Handling

- If a project is archived in the middle of a cycle, it remains billable for the current cycle and stops counting in the next one.
- If a project is created and archived in the same cycle, it still counts for that cycle because creation provisions a slot immediately.
- If billing sync fails after project creation, the project must stay created and the failure must be recoverable by reconciliation; the system must not imply that creation rolled back when it did not.
- If a WhatsApp number is connected as an additional number in the same project, the connection must succeed and the billing counter must be updated asynchronously or retried safely.
- If a Meta ad account sync marks multiple accounts active in the same project, extras beyond the included baseline must be counted without breaking sync.
- If AI closeout runs twice for the same cycle, idempotency must prevent duplicate invoice items.
- If AI usage cannot be attributed to a project, it must not be silently assigned to a random project; it should either be marked non-billable for project allowance purposes or routed to an explicit organization-scoped bucket.
- If a project is archived after generating AI usage during the cycle, that usage still belongs to the closed cycle and remains billable if it exceeded the allowance.
- If a subscription is in local trial, the trial limits must still remain coherent with the “1 included project” rule.
- If provider invoice item creation fails during AI closeout, the cycle must not be considered closed until the ledger is persisted and retriable.

---

## 6. Security Considerations

- Billing remains organization-scoped, so every billing mutation must validate membership and organization ownership.
- Project-aware usage aggregation must verify that every counted `projectId` belongs to the billed organization.
- AI usage records must not expose prompt payloads or sensitive operational content in billing responses.
- Provider invoice item creation and recurring sync routes must remain server-only and protected from client invocation abuse.
- Cron closeout endpoints must require shared-secret authentication and structured audit logging.
- Connection methods for Meta Ads and WhatsApp must remain unchanged to avoid introducing provider-facing auth regressions.
- Future BYO key support must not leak secrets across organizations; this is explicitly deferred.

---

## 7. Testing Strategy

- **Unit:** entitlement calculation with `1` included project; additional project math; archived project exclusion; additional WhatsApp number counting; additional Meta account counting; AI overage unit rounding; AI closeout idempotency; trial guard messages aligned to the new model.
- **Integration:** create project then sync recurring billing items; archive project and confirm next-cycle exclusion; connect second WhatsApp number in one project and confirm billing increment without blocking; sync multiple Meta accounts in one project and confirm add-on quantity; aggregate AI usage per project and produce correct closeout rows; create provider invoice item once for a closed cycle.
- **E2E:** checkout or trial start with base plan showing `1` included project; create second project and see recurring add-on reflected in billing UI; archive a project and verify warning plus next-cycle effect; connect extra WhatsApp number and verify connection flow remains unchanged; exceed AI allowance in one project while another stays below allowance and verify only the exceeding project contributes to overage.

---

## 8. Rollout Plan

- [ ] Create a dedicated migration for `Project.status` and `Project.archivedAt`.
- [ ] Backfill existing projects to `status = active`.
- [ ] Update billing plan seed so `platform_base.includedProjects = 1`.
- [ ] Review whether current monetary values remain the same after the entitlement change.
- [ ] Extend billing catalog schema or metadata to support AI overage pricing.
- [ ] Add project-aware AI usage attribution fields.
- [ ] Implement AI closeout ledger and closeout service.
- [ ] Update entitlement calculation to count only active projects.
- [ ] Update recurring item sync to use the new project-count semantics.
- [ ] Update trial guard copy and enforcement to stay coherent with the new base model.
- [ ] Update dashboard billing UI and plan-selection copy.
- [ ] Update billing-related test fixtures that still assume `3` included projects.
- [ ] Add monitoring for:
  - recurring item sync failures
  - AI closeout failures
  - duplicate closeout attempts
  - provider invoice item creation errors
- [ ] Run migration/backfill before enabling archive-aware billing logic in production.
- [ ] Coordinate rollout with [29_PRD_PROJECT_STRICT_OWNERSHIP_FOR_INTEGRATIONS.md](/Users/thiago/www/whatrack/docs/PRD/29_PRD_PROJECT_STRICT_OWNERSHIP_FOR_INTEGRATIONS.md), because project-owned integrations and project-aware AI attribution depend on that boundary being real.

---

## 9. Open Questions

- Do the current list prices remain the same after the base plan drops from `3` included projects to `1`, or will pricing be revised in a separate commercial decision?
- Should AI overage be priced per raw credit, per `1,000` credits, or via another bundle size?
- Should organization-scoped AI actions that do not belong to a project be fully excluded from customer-facing overage in this phase?
- Should archived projects become read-only immediately in the UI, or is “non-billable next cycle” the only required semantic for this phase?
- Should extra WhatsApp numbers and extra Meta accounts continue using the current fixed add-on prices, or is there a future pricing matrix by plan?
