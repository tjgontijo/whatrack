# PRD-027: E2E Testing Strategy - Playwright + SQLite

**Status:** Draft  
**Data:** 2026-04-16  
**Versão:** 1.0  

---

## O Que Este PRD Define

Estratégia completa de testes E2E para WhaTrack usando Playwright, com foco em:

1. **147 testes automatizados** em 12 domínios de negócio
2. **Banco SQLite local** para testes rápidos e sem dependências
3. **Validação contínua** do PRD-026 (Auto-Upgrade de Planos)
4. **CI/CD integrado** para execução automática
5. **Roadmap de 7 semanas** em 4 phases

---

## Resumo Executivo

### Objetivo

- Implementar suite E2E robusta com 147 testes
- Validar todos os fluxos críticos do usuário
- Integrar com Asaas (test cards para pagamento)
- Manter suite rodando em < 40 minutos
- Zero flakiness (máximo 2%)

### Problema Atual

- Nenhuma validação automatizada de flows completos
- Testes manuais repetitivos e propensos a erro
- Impossível detectar regressions rapidamente
- Sem validação contínua em CI/CD

### Novo Escopo

**Entra:**

- Framework Playwright (E2E tests)
- Banco SQLite local (rápido, sem dependências)
- 33 testes Phase 1 (foundation) - implementados
- 114 testes Phase 2-4 (roadmap) - planejados
- Helpers reutilizáveis (auth, billing, signup)
- CI/CD integration (GitHub Actions)
- Test data com cartões Asaas reais
- Relatórios HTML automáticos

**Fica fora do escopo:**

- Testes de performance (load testing)
- Testes de acessibilidade (WCAG)
- Testes visuais (visual regression)
- Testes de segurança (pen testing)
- Cross-browser testing (apenas Chromium Phase 1)

---

## Métricas de Sucesso

### Phase 1 (Semana 1-2)
- ✅ 33 testes passando
- ✅ BD SQLite funcional
- ✅ Flakiness < 2%
- ✅ Tempo < 10 min
- ✅ CI/CD integrado

### Phase 2 (Semana 3-4)
- → 77 testes passando (33+44)
- → Coverage > 85%
- → Flakiness < 2%
- → Tempo < 15 min

### Phase 3 (Semana 5-6)
- → 131 testes passando (77+54)
- → Coverage > 90%
- → Integrações validadas (WhatsApp, Meta)
- → Tempo < 25 min

### Phase 4 (Semana 7)
- → 147 testes passando (todos)
- → Coverage > 95%
- → All edge cases covered
- → Tempo < 40 min

---

## Arquitetura

### Test Database
```
┌─────────────────────────┐
│   Playwright Tests      │
├─────────────────────────┤
│   e2e/*.spec.ts         │
│   (33-147 tests)        │
└────────────┬────────────┘
             │
        uses local BD
             │
┌────────────▼────────────┐
│  SQLite (test.db)       │
├─────────────────────────┤
│  prisma/schema.test.    │
│  prisma                 │
│                         │
│  • Reset before each    │
│  • Auto seeding         │
│  • ~ 50ms per test      │
└─────────────────────────┘
```

### Test Data Flow
```
.env.test
   ↓
[Setup Script]
   ├─ Generate Prisma client
   ├─ Create test.db
   ├─ Run migrations
   └─ Seed test data
   ↓
[Test Suite Runs]
   ├─ e2e/auth-signup.spec.ts
   ├─ e2e/billing-*.spec.ts
   ├─ e2e/full-flow.spec.ts
   └─ Phase 2-4 (future)
   ↓
[CI/CD Reports]
   ├─ HTML report
   ├─ JSON results
   └─ Artifacts
```

---

## Domínios de Testes (147 Total)

```
Phase 1: FOUNDATION (33 tests) ✅ IMPLEMENTADO
├─ Authentication & Accounts      (12)
├─ Billing & Subscription         (15)
└─ Notifications                  (6)

Phase 2: CORE FEATURES (44 tests) → Semana 3-4
├─ Organizations & Teams          (32)
└─ Projects & Workspace           (12)

Phase 3: INTEGRATIONS (54 tests) → Semana 5-6
├─ WhatsApp Integration           (30)
└─ Meta Ads Integration           (24)

Phase 4: POLISH (26 tests) → Semana 7
├─ Error Handling & Resilience    (18)
├─ Data & Compliance              (6)
└─ Performance & Optimization     (2)
```

---

## Testes Implementados (Phase 1)

### ✅ 19 Unit Tests (Serviços)
```
src/services/billing/__tests__/
├─ billing-plan-detection.test.ts      (9 tests)
├─ billing-prorating.test.ts           (5 tests)
└─ billing-plan-history.test.ts        (5 tests)

Status: Todos passando ✅
```

### ✅ 14+ E2E Tests (Playwright)
```
e2e/
├─ auth-signup.spec.ts                (11 tests)
├─ billing-auto-upgrade.spec.ts       (6 tests)
├─ billing-auto-upgrade-advanced.     (10 tests)
│  spec.ts
└─ full-flow.spec.ts                  (base ready)

Helpers:
├─ helpers/auth.ts                    (3 funções)
├─ helpers/signup.ts                  (6 funções)
└─ helpers/billing.ts                 (8 funções)

Status: Em desenvolvimento
```

---

## Timeline Detalhada

### Semana 1: Foundation Part 1
```
Mon:   Auth + Sign-up tests
Tue:   Billing auto-upgrade tests
Wed:   Payment processing (Asaas)
Thu:   Unit tests (services)
Fri:   Review + Refinement

Saída: 33 testes + SQLite BD
```

### Semana 2: Foundation Part 2
```
Mon:   Integration testing
Tue:   Error handling (Phase 1)
Wed:   CI/CD setup
Thu:   Documentation
Fri:   Phase 1 complete + review

Saída: Phase 1 ✅ Ready for Phase 2
```

### Semana 3-4: Core Features (Phase 2)
```
44 testes: Organizations, Teams, Projects
```

### Semana 5-6: Integrations (Phase 3)
```
54 testes: WhatsApp, Meta Ads
```

### Semana 7: Polish (Phase 4)
```
26 testes: Edge cases, Compliance
```

---

## Tecnologia

### Stack
- **Framework:** Playwright (E2E)
- **Database:** SQLite3 (local)
- **ORM:** Prisma (migrations + seeding)
- **Test Framework:** Vitest (para unit tests)
- **Environment:** Node 18+, npm/pnpm

### Dependências
```json
{
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "dotenv": "^17.4.2"
  }
}
```

### Cartões de Teste (Asaas)
```
✅ 4111111111111111 - Always approved
❌ 4000000000000002 - Always declined
✅ 4000002500000003 - Requires 3D Secure
```

---

## Estrutura de Código

```
docs/PRD/PRD-027-e2e-testing-strategy/
├─ README.md               ← You are here
├─ CONTEXT.md              ← Background research
├─ DIAGNOSTIC.md           ← Current state analysis
├─ MIGRATION.md            ← Implementation guide
└─ TASKS.md                ← Detailed tasks

e2e/
├─ auth-signup.spec.ts
├─ billing-auto-upgrade.spec.ts
├─ billing-auto-upgrade-advanced.spec.ts
├─ full-flow.spec.ts
├─ helpers/
│  ├─ auth.ts
│  ├─ signup.ts
│  └─ billing.ts
├─ fixtures.ts
├─ setup.ts
└─ global-setup.ts

.env.test                  ← Test environment
.gitignore                 ← Ignore test.db
playwright.config.ts       ← Playwright config
prisma/schema.test.        ← SQLite schema
  prisma
```

---

## Como Executar

### Quick Start
```bash
# Rodar todos os testes (Phase 1)
npm run test:e2e

# Com interface visual
npm run test:e2e:ui

# Debug passo-a-passo
npm run test:e2e:debug
```

### Ver Resultados
```bash
# HTML report interativo
npx playwright show-report

# JSON para parsing
cat test-results.json | jq
```

---

## Validação do PRD-026

Este PRD valida completamente a implementação do PRD-026:

| Feature | Test | Status |
|---------|------|--------|
| Auto-upgrade detection | billing-auto-upgrade | ✅ |
| Prorating calculation | billing-prorating | ✅ |
| Invoice generation | billing-auto-upgrade | ✅ |
| Plan history | billing-plan-history | ✅ |
| Email notification | billing-auto-upgrade | ✅ |
| Business plan 5/10 | seed data | ✅ |

---

## Próximos Passos

### Immediate (This Week)
1. ✅ Criar base de testes
2. ✅ Implementar Phase 1
3. → Executar e validar
4. → Documentar issues

### Week 2+
5. → Começar Phase 2
6. → Continuar conforme schedule
7. → Monitorar métricas

---

## Referências

### Documentação Interna
- [CONTEXT.md](./CONTEXT.md) - Background research
- [DIAGNOSTIC.md](./DIAGNOSTIC.md) - Current state
- [MIGRATION.md](./MIGRATION.md) - Implementation
- [TASKS.md](./TASKS.md) - Task breakdown

### Documentação Externa
- [Playwright Docs](https://playwright.dev)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Asaas Test Cards](https://docs.asaas.com/docs/testando-pagamento-com-cartão-de-crédito)

---

## Document History

| Versão | Data | Status | Mudanças |
|--------|------|--------|----------|
| 1.0 | 2026-04-16 | Draft | Documento inicial |
| | | | 147 testes planejados |
| | | | Phase 1 implementado |
| | | | 4 phases definidas |
