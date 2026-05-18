# Quick Start: PRD-002 Architecture Alignment

**TL;DR:** Estrutura features/ existe. 7 categorias de violacoes ao SKILL.md identificadas. 2 criticos (server-only ausente em 101 arquivos, prisma direto em 20 routes/pages). Total: 3-5 dias.

---

## 📊 Resumo dos Problemas

| # | Problema | Severidade | Arquivos | Fix |
|---|----------|------------|----------|-----|
| T1 | `server-only` ausente | 🔴 Critico | 97 services + 4 repos | Script + build |
| T2 | `prisma` direto em `app/` | 🔴 Critico | 20 arquivos | Extrair para service/repo |
| T3 | `nanoid` em organizations | 🟡 Moderado | 1 service | Substituir ou documentar |
| T4 | analytics/index exporta services | 🟡 Moderado | 1 index.ts | Remover 1 linha + ajustar imports |
| T5 | `getCurrentUserId` ausente | 🟡 Moderado | 0 (criar) | Criar helper |
| T6 | Legados em `src/services/` | 🟡 Moderado | 4 pastas | Migrar ou declarar infra |
| T7 | Caminho DB diverge do SKILL.md | 🟢 Menor | 1 doc | Atualizar SKILL.md |

---

## 🔴 Criticos

### T1: Adicionar `server-only`

**Como testar antes:**

```bash
# Ver quantos arquivos estao sem server-only
find src/features -path "*/services/*.ts" ! -name "*.test.*" | xargs grep -rL "server-only" | wc -l
# Esperado: 97

find src/features -path "*/repositories/*.ts" ! -name "*.test.*" | xargs grep -rL "server-only" | wc -l
# Esperado: 4
```

**Executar correcao:**

```bash
find src/features -path "*/services/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then
    sed -i '' '1s/^/import "server-only"\n/' "$f"
  fi
done

find src/features -path "*/repositories/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then
    sed -i '' '1s/^/import "server-only"\n/' "$f"
  fi
done
```

**Verificar resultado:**

```bash
npm run build
# Se houver erros de boundary: corrigir imports invalidos em components
find src/features -path "*/services/*.ts" ! -name "*.test.*" | xargs grep -rL "server-only"
# Esperado: nenhuma saida
```

---

### T2: Remover `prisma` direto de `app/`

**Como testar antes:**

```bash
grep -r "from '@/lib/db/prisma'" src/app --include="*.ts" --include="*.tsx" -l
# Esperado: 20 arquivos listados
```

**Executar por grupo:**

Comecar por `billing` (menor risco, dominio bem definido):

```bash
# routes afetadas em billing:
# src/app/api/v1/billing/subscription/route.ts
# src/app/api/v1/billing/subscription/status/route.ts
# src/app/api/v1/billing/subscription/retry/route.ts
# src/app/api/v1/billing/checkout/[invoiceId]/status/route.ts
```

Depois `whatsapp` (mais arquivos, maior complexidade):

```bash
# routes afetadas em whatsapp:
# src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/route.ts
# src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts
# src/app/api/v1/whatsapp/campaigns/[campaignId]/add-audience/route.ts
# src/app/api/v1/whatsapp/campaigns/[campaignId]/retry-failed/route.ts
# src/app/api/v1/whatsapp/claim-waba/route.ts
# src/app/api/v1/whatsapp/debug/route.ts
# src/app/api/v1/whatsapp/onboarding/phone-number/route.ts
# src/app/api/v1/whatsapp/phone-numbers/[phoneId]/profile/route.ts
```

Depois `projects`, `cron`, `meta-ads`, `onboarding`, `pages`.

**Verificar resultado:**

```bash
grep -r "from '@/lib/db/prisma'" src/app --include="*.ts" --include="*.tsx"
# Esperado: nenhuma saida
npm run build
```

---

## 📂 Arquivos Principais

- `src/features/*/services/*.ts` - 97 services sem server-only
- `src/features/*/repositories/*.ts` - 4 repos sem server-only
- `src/app/api/v1/billing/subscription/route.ts` - prisma direto (billing)
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts` - prisma direto (whatsapp)
- `src/features/analytics/index.ts` - exporta services
- `src/features/organizations/services/organization-management.service.ts` - nanoid
- `src/server/auth/get-current-user-id.ts` - a criar

---

## 🚀 Comecar

```bash
git checkout -b refactor/architecture-alignment

# T1: server-only (mais rapido, aditivo, menor risco)
find src/features -path "*/services/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then sed -i '' '1s/^/import "server-only"\n/' "$f"; fi
done
find src/features -path "*/repositories/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then sed -i '' '1s/^/import "server-only"\n/' "$f"; fi
done
npm run build  # corrigir erros de boundary se houver
git commit -m "refactor(features): T1 add server-only to all services and repositories"

# T4: analytics/index (30min, independente)
# editar src/features/analytics/index.ts - remover linha de export services
git commit -m "refactor(analytics): T4 remove services from public index"

# T5: getCurrentUserId (30min, independente)
# criar src/server/auth/get-current-user-id.ts
git commit -m "feat(auth): T5 add getCurrentUserId helper"

# T2: prisma em routes - comecar por billing
# para cada route: extrair para service/repository, remover import prisma
git commit -m "refactor(billing): T2 remove direct prisma from api routes"
git commit -m "refactor(whatsapp): T2 remove direct prisma from api routes"
# ... continuar por dominio

# T3, T6, T7 em sequencia
```

---

**Status:** Draft pronto para execucao
