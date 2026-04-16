# Context - E2E Testing Strategy

**Data:** 2026-04-16

---

## Histórico

### WhaTrack Platform Overview

WhaTrack é uma plataforma de marketing/vendas com:

- **Auth:** Multi-tenant organizations, roles/permissions
- **Billing:** Asaas integration, plans, subscriptions
- **Projects:** Multi-project per org, with resource limits
- **Integrations:** WhatsApp, Meta Ads, webhooks
- **Messaging:** WhatsApp campaigns, conversations

### Current Testing State

#### What Exists
- ✅ Unit tests (Vitest) para alguns serviços
- ✅ Component tests (React Testing Library)
- ❌ Zero E2E tests (Playwright/Cypress)
- ❌ No local test database
- ❌ No CI/CD test integration

#### Pain Points
1. **Manual testing repetitivo** - QA testa manualmente cada release
2. **Regressions não detectadas** - Bugs só encontrados em produção
3. **Slow feedback loop** - Dias entre PR e validação
4. **No coverage metrics** - Impossível saber quem está testado
5. **Flaky deployments** - Sem confiança nas mudanças

### PRD-026 Impact

O PRD-026 (Auto-Upgrade de Planos) adiciona complexidade:

- ✅ Auto-detection quando projeto excede limite
- ✅ Auto-upgrade automático
- ✅ Prorating cálculos
- ✅ Invoice generation
- ✅ Email notifications
- ✅ Plan history tracking

**Sem testes E2E**, esta feature é arriscada de deploiar.

---

## Por Que Playwright + SQLite?

### Alternativas Consideradas

#### Option A: Cypress + PostgreSQL
```
Pro:  - Excelente debugging
      - Comunidade grande
Con:  - Pesado (+ banco real)
      - Slow CI/CD
      - Node-only (não suporta novos browsers)
Decision: ❌ Rejeitado
```

#### Option B: Selenium + Docker
```
Pro:  - Multi-browser
      - Maduro
Con:  - Lento e flaky
      - Difícil setup
      - Suporte quebrado
Decision: ❌ Rejeitado
```

#### Option C: Playwright + SQLite ✅ ESCOLHIDO
```
Pro:  - Rápido (SQLite local)
      - Moderno (Chromium nativo)
      - Excelente dev experience
      - Zero dependências externas
      - Suporte oficial (Microsoft)
Con:  - Chromium only (Phase 1)
Decision: ✅ Escolhido
```

#### Option D: Playwright + PostgreSQL
```
Pro:  - Production-like
      - Validação real
Con:  - Slow (13+ min setup)
      - Flaky (test isolation)
      - Overkill para Phase 1
Decision: ⏸️ Future (Phase 2+)
```

### SQLite Vantagens

```
Setup Time:      < 50ms (vs 5+ min PostgreSQL)
Per-Test Speed:  ~50ms average
Total Suite:     < 40 min for 147 tests
Isolation:       Perfeit (new file per run)
CI/CD:           Zero dependências
Local Dev:       Rápido + fácil
```

---

## Inspirações & Benchmarks

### Industry Standards

| Framework | Coverage | Suite Time | Flakiness |
|-----------|----------|-----------|-----------|
| Stripe | 85%+ | ~30 min | < 1% |
| Vercel | 90%+ | ~45 min | < 2% |
| Supabase | 80%+ | ~35 min | < 3% |
| **WhaTrack Target** | **90%+** | **< 40 min** | **< 2%** |

### Phase-by-Phase Approach

Inspirado em empresas como Shopify e Zapier que:

1. **Phase 1:** Foundation (auth, core flows)
2. **Phase 2:** Core features (orgs, projects)
3. **Phase 3:** Integrations (APIs)
4. **Phase 4:** Polish (edge cases)

Cada phase é deployable independentemente.

---

## Domains Identified

### Must-Have (PRD-026 Validation)
```
✅ Authentication
✅ Billing & Subscription
✅ Projects
✅ Payment Processing
✅ Auto-upgrade Flow
```

### Should-Have
```
⚠️ Organizations & Teams
⚠️ Notifications
⚠️ WhatsApp Integration
⚠️ Meta Ads Integration
```

### Nice-to-Have
```
🔄 Error Handling
🔄 Performance
🔄 GDPR Compliance
```

### Out-of-Scope (This PRD)
```
❌ Visual Regression
❌ Load Testing
❌ Accessibility (WCAG)
❌ Security Testing
```

---

## Asaas Integration

### Test Card Strategy

Asaas fornece test cards para simulação:

```
✅ 4111111111111111
   Status: Always approved
   Use: Happy path, invoicing

❌ 4000000000000002
   Status: Always declined
   Use: Error handling, retry logic

✅ 4000002500000003
   Status: Requires 3D Secure
   Use: Authentication flow, security
```

### API Integration Points

```
1. Signup
   └─ Asaas: Create customer (if not exists)

2. Plan Selection
   └─ Asaas: Get available plans/prices

3. Checkout
   ├─ Asaas: Generate checkout link
   └─ Payment: Process via Asaas

4. Webhook
   ├─ Asaas: Payment status
   └─ Local: Update subscription

5. Invoice
   ├─ Local: Record invoice
   └─ Asaas: Sync if needed
```

---

## Test Data Strategy

### User Fixtures

```typescript
// Generated per test run
{
  email: "test-{timestamp}@example.com"
  password: "Test{timestamp}!@#"
  fullName: "Test User {i}"
  cpf: "12345678901"
}
```

### Organization Fixtures

```typescript
{
  name: "Test Org {timestamp}"
  slug: "auto-generated"
  members: [
    { role: "admin", user: creator },
    { role: "member", user: invited }
  ]
}
```

### Billing Fixtures

```typescript
Plans: [
  { name: "Starter", projects: 1 },
  { name: "Pro", projects: 3 },
  { name: "Business", projects: 5 }
]

Subscriptions: [
  { user, org, plan: "Starter", status: "ACTIVE" }
]

Cards: [
  { number: APPROVED, status: "valid" },
  { number: DECLINED, status: "invalid" }
]
```

---

## Coverage Goals

### Phase 1: Foundation (22%)
- All auth flows
- Core billing (auto-upgrade, prorating)
- Basic payment processing
- Critical user journeys

### Phase 2: Core Features (51%)
- Organizations + teams
- Projects + workspaces
- Advanced billing scenarios
- Multi-user flows

### Phase 3: Integrations (82%)
- WhatsApp campaigns
- Meta Ads integration
- Webhook handling
- External API reliability

### Phase 4: Polish (100%)
- Edge cases
- Error scenarios
- Compliance
- Performance

---

## Risk Mitigation

### Test Flakiness
**Risk:** Testes falhando aleatoriamente  
**Mitigation:**
- ✅ Usar SQLite (determinístico)
- ✅ Reset entre testes (isolamento)
- ✅ Retry lógica (Phase 1)
- ✅ Monitorar < 2% flakiness

### Slow Suite
**Risk:** Testes rodando > 1h  
**Mitigation:**
- ✅ SQLite é rápido (~50ms/test)
- ✅ Parallelização em CI (Phase 2)
- ✅ Test sharding (Phase 3+)
- ✅ Target: < 40 min total

### Maintenance Burden
**Risk:** Testes quebram com mudanças  
**Mitigation:**
- ✅ Page Object Model (Phase 2)
- ✅ Helpers reutilizáveis
- ✅ Clear test names
- ✅ Good documentation

### DB State Issues
**Risk:** Testes interferem um com outro  
**Mitigation:**
- ✅ Fresh DB per run
- ✅ Transactional reset (Phase 2)
- ✅ Sequential execution (Phase 1)
- ✅ Isolation fixtures

---

## Success Metrics

### Coverage
- ✅ 90%+ critical flows
- ✅ All happy paths
- ✅ Common error scenarios
- ✅ Integration points

### Performance
- ✅ Phase 1: < 10 min
- ✅ Phase 2: < 15 min
- ✅ Phase 3: < 25 min
- ✅ Phase 4: < 40 min

### Quality
- ✅ Zero regressions caught
- ✅ < 2% flakiness
- ✅ 100% CI/CD integration
- ✅ Automated reporting

### Maintainability
- ✅ Clear test names
- ✅ Reusable helpers
- ✅ Good docs
- ✅ Easy to extend

---

## Roadmap Justification

### Phase 1 is Foundation
```
Why: PRD-026 requires solid base
What: Auth, Billing, Payment, Notifications
When: Week 1-2
Success: 33 tests passing, SQLite working
```

### Phase 2 Adds Coverage
```
Why: Core features need validation
What: Orgs, Teams, Projects, Limits
When: Week 3-4
Success: 44 new tests, 77 total
```

### Phase 3 Validates Integrations
```
Why: APIs are critical dependencies
What: WhatsApp, Meta, Webhooks
When: Week 5-6
Success: 54 new tests, 131 total
```

### Phase 4 Polish
```
Why: Edge cases prevent production issues
What: Errors, Compliance, Performance
When: Week 7
Success: 26 new tests, 147 total
```

---

## Future Considerations

### Post-Phase 4
- [ ] Visual regression testing (Percy)
- [ ] Performance benchmarking
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile-specific tests
- [ ] Load testing

### Potential Optimizations
- [ ] Parallel execution (workers > 1)
- [ ] Test sharding
- [ ] Caching strategies
- [ ] Snapshot testing

### Integration Points
- [ ] Slack notifications on failures
- [ ] Auto-triage of flaky tests
- [ ] Metrics dashboard
- [ ] Trend analysis

---

## Decision Records

### Why Not Cypress?
- ❌ Node-only (no browser independence)
- ❌ Slower startup
- ❌ Heavier resource usage

### Why SQLite over PostgreSQL?
- ✅ Phase 1 needs speed, not production-like DB
- ✅ Zero external dependencies
- ✅ Perfect for local development

### Why Asaas Test Cards?
- ✅ Official, reliable test data
- ✅ Covers happy + error paths
- ✅ Includes 3D Secure scenarios

### Why 4 Phases?
- ✅ Each phase is independently deployable
- ✅ Allows learning/iteration
- ✅ Risk mitigation
- ✅ Team capacity planning

---

## Document History

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-04-16 | Documento inicial |
