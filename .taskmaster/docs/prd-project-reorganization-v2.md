# PRD: Reorganização da Estrutura do Projeto (v2)

## Correções da v1

**Erros corrigidos:**
1. ~~`proxy.ts` deveria ser `middleware.ts`~~ → **ERRADO**. No Next.js 16, o arquivo correto é `proxy.ts` (middleware foi renomeado para proxy)
2. Estrutura revisada com base na documentação oficial do Next.js 16

---

## Stack do Projeto

- **Next.js 16.0.8** (App Router) - usa `proxy.ts` ao invés de `middleware.ts`
- **React 19.2.0**
- **TypeScript 5.x**
- **Prisma 6.19.0**
- **Zod 4.1.12**
- **TanStack Query 5.90.7**
- **Better Auth 1.3.34**
- **shadcn/ui 3.4.2**

---

## Problemas Identificados

### 🔴 Críticos

| # | Problema | Local |
|---|----------|-------|
| 1 | Hooks duplicados | `src/hooks/` e `src/lib/hooks/` |
| 2 | Schemas em 3 locais | `lib/schema/`, `lib/validations/`, `app/api/**/schemas.ts` |
| 3 | Pastas vazias/obsoletas | `lib/whatsapp/` (vazia), `(onboarding).old/` (obsoleta) |
| 4 | Arquivo duplicado | `lib/centrifugo.ts` + `lib/centrifugo/` |
| 5 | Pastas só com testes | `lib/billing/` e `lib/company/` (só têm `__tests__/`) |
| 6 | Arquivos soltos | `components/icons.tsx`, `components/providers.tsx` |
| 7 | Pasta util genérica (mistura de responsabilidades) | `lib/util/` (cnpj, phone-mask, dateRange, traffic, url, whatsapp) |

### 🟡 Moderados

| # | Problema | Local |
|---|----------|-------|
| 8 | Nomenclatura inconsistente | `new-lead_dialog.tsx` (underscore) |
| 9 | `services/dashboard/` | São transformers, não services |
| 10 | `services/sign-up/` | Só 1 arquivo |
| 11 | `lib/helpers/` | Só 1 arquivo |
| 12 | `src/test/` | Só 1 arquivo (deveria estar em `__tests__/`) |

---

## Estrutura Alvo (Baseada na Documentação Oficial)

Seguindo a recomendação do Next.js: **"Store project files outside of app"**

```
src/
├── app/                    # APENAS rotas (routing purposes only)
│   ├── (auth)/             # Route group: auth
│   ├── (marketing)/        # Route group: páginas públicas
│   ├── api/v1/             # API routes
│   └── dashboard/          # Páginas do dashboard
│
├── components/             # Componentes React
│   ├── common/             # Icons, providers, etc
│   ├── ui/                 # shadcn/ui (não mexer)
│   ├── auth/
│   ├── billing/
│   ├── dashboard/
│   ├── home/
│   └── onboarding/
│
├── hooks/                  # Custom hooks (ÚNICO local)
│
├── lib/                    # Infraestrutura e utilitários
│   ├── auth/               # Auth config
│   ├── db/                 # Prisma
│   ├── cache/              # Redis
│   ├── queue/              # BullMQ
│   ├── realtime/           # Centrifugo
│   ├── i18n/
│   ├── masks/              # Máscaras/normalização (CPF, CNPJ, CEP, telefone)
│   ├── date/               # Datas e ranges
│   ├── formatters/         # Formatadores (currency, datetime, etc)
│   ├── analytics/          # UTM/source helpers
│   ├── url/                # URLs e helpers de base URL
│   ├── whatsapp/           # Helpers de WhatsApp (ex: construir URL) (client-safe)
│   ├── utils.ts            # `cn` (padrão shadcn/ui)
│   └── constants.ts        # Constantes globais
│
├── schemas/                # TODOS os schemas Zod
│   ├── api/                # Request/response schemas
│   ├── domain/             # DTOs e domínio
│   └── forms/              # Formulários
│
├── services/               # Lógica de negócio
│   ├── ai/
│   ├── billing/
│   ├── campaigns/
│   ├── company/
│   ├── credits/
│   ├── delivery/
│   ├── followup/
│   ├── inbox/
│   ├── leads/
│   ├── mail/
│   ├── messaging/
│   ├── metrics/
│   ├── products/
│   └── whatsapp/
│
├── types/                  # Tipos TypeScript globais
│
└── proxy.ts                # ✅ CORRETO para Next.js 16
```

---

## Plano de Migração

### Fase 1: Limpeza (Baixo Risco)

- [ ] Deletar `src/app/(onboarding).old/`
- [ ] Deletar `src/lib/whatsapp/` (vazia)
- [ ] Deletar `src/lib/centrifugo.ts` (duplicado, manter `lib/centrifugo/`)
- [ ] Mover `src/test/prisma-mock.ts` → `__tests__/mocks/`

### Fase 2: Consolidar Hooks

- [ ] Mover `src/lib/hooks/*` → `src/hooks/`
- [ ] Deletar `src/lib/hooks/`

### Fase 3: Centralizar Schemas

- [ ] Criar `src/schemas/{api,domain,forms}/`
- [ ] Mover `app/api/v1/billing/schemas.ts` → `schemas/api/billing.ts`
- [ ] Mover `app/api/v1/company/schemas.ts` → `schemas/api/company.ts`
- [ ] Mover `lib/schema/*` → `schemas/domain/`
- [ ] Mover `lib/validations/*` → `schemas/forms/`
- [ ] Atualizar imports

### Fase 4: Reorganizar Lib

- [ ] `lib/prisma.ts` → `lib/db/prisma.ts`
- [ ] `lib/redis.ts` → `lib/cache/redis.ts`
- [ ] `lib/bullmq/` → `lib/queue/`
- [ ] `lib/centrifugo/` → `lib/realtime/`
- [ ] Manter `lib/utils.ts` como está (padrão shadcn/ui)
- [ ] `lib/helpers/sendWebhook.ts` → `lib/url/send-webhook.ts` (ou `lib/http/send-webhook.ts`) e deletar `lib/helpers/`
- [ ] Criar diretórios por responsabilidade:
  - [ ] `lib/masks/`
  - [ ] `lib/date/`
  - [ ] `lib/formatters/`
  - [ ] `lib/analytics/`
  - [ ] `lib/url/`
  - [ ] `lib/whatsapp/`
- [ ] Mover o conteúdo de `lib/util/`:
  - [ ] `lib/util/cnpj.ts` → `lib/masks/cnpj.ts`
  - [ ] `lib/util/phone-mask.ts` → `lib/masks/phone.ts`
  - [ ] `lib/util/dateRange.ts` → `lib/date/range.ts`
  - [ ] `lib/util/formatters.ts` → `lib/formatters/index.ts`
  - [ ] `lib/util/traffic.ts` → `lib/analytics/traffic.ts`
  - [ ] `lib/util/url.ts` → `lib/url/base-url.ts`
  - [ ] `lib/util/whatsapp.ts` → `lib/whatsapp/create-url.ts`
- [ ] Mover testes junto com o código:
  - [ ] `lib/util/__tests__/cnpj.test.ts` → `lib/masks/__tests__/cnpj.test.ts`
- [ ] Deletar `lib/util/` após migração
- [ ] Estratégia de testes (Prisma schema): mover testes de validação de models para `prisma/__tests__/`:
  - [ ] `lib/billing/__tests__/*` → `prisma/__tests__/billing-schema.test.ts`
  - [ ] `lib/company/__tests__/*` → `prisma/__tests__/company-schema.test.ts`
  - [ ] Deletar `lib/billing/` e `lib/company/` após mover os testes

### Fase 5: Consolidar Services

- [ ] `lib/ai/` → `services/ai/`
- [ ] `lib/credits/` → `services/credits/`
- [ ] `lib/followup/` → `services/followup/`
- [ ] `lib/inbox/` → `services/inbox/`
- [ ] `lib/messaging/` → `services/messaging/`
- [ ] `lib/metrics/` → `services/metrics/`
- [ ] `services/dashboard/` → `services/analytics/transformers/`
- [ ] `services/sign-up/` → `services/analytics/`

### Fase 6: Organizar Components

- [ ] Criar `components/common/`
- [ ] Mover `components/icons.tsx` → `components/common/`
- [ ] Mover `components/providers.tsx` → `components/common/`
- [ ] Renomear `new-lead_dialog.tsx` → `new-lead-dialog.tsx`

### Fase 7: Route Groups

- [ ] Criar `app/(marketing)/`
- [ ] Mover `app/page.tsx` → `app/(marketing)/page.tsx`
- [ ] Mover `app/pricing/` → `app/(marketing)/pricing/`
- [ ] Mover `app/privacy/` → `app/(marketing)/privacy/`
- [ ] Mover `app/terms/` → `app/(marketing)/terms/`

---

## Convenções de Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Arquivos | kebab-case | `use-leads.ts` |
| Componentes | PascalCase | `LeadsTable.tsx` |
| Hooks | camelCase + `use` | `useLeads` |
| Schemas | kebab-case | `lead-schema.ts` |

---

## Referências

- [Next.js 16 - Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js 16 - Proxy (ex-Middleware)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 - Migration to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy)

---

## Histórico

| Data | Versão | Descrição |
|------|--------|-----------|
| 2024-12-15 | 1.0 | Versão inicial |
| 2024-12-15 | 2.0 | Correção: proxy.ts é correto no Next.js 16 |
