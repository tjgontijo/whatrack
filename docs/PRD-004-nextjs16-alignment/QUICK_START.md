# Quick Start: PRD-004 Next.js 16 Alignment

**TL;DR:** 3 tasks de adequacao ao Next.js 16. Nenhum bloqueador critico. T1 (env.ts) e o mais importante — centraliza 29 vars de ambiente com validacao Zod. T2 limpa 50 `force-dynamic` redundantes. T3 adiciona cache em billing plans. Total: 4-6h.

---

## 📊 Resumo dos Problemas

| # | Problema | Severidade | Escala | Fix |
|---|----------|------------|--------|-----|
| T1 | `process.env` sem validacao centralizada | 🟡 Moderado | 25 arquivos, 29 vars | Criar `src/lib/env.ts` |
| T2 | `force-dynamic` redundante no Next.js 16 | 🟡 Moderado | 50 arquivos | Remocao em massa via sed |
| T3 | Zero cache em dados publicos | 🟢 Menor | 1-3 services | `"use cache"` + `cacheLife` |

---

## 🟡 T1: env.ts

**O que criar:** `src/lib/env.ts` (server) e `src/lib/env.client.ts` (client).

**Verificar se funcionou:**

```bash
mv .env .env.bak && npm run build
# Esperado: erro Zod claro com nome da variavel ausente

mv .env.bak .env && npm run build
# Esperado: build limpo
```

---

## 🟡 T2: Remover force-dynamic

**Comando para API routes:**

```bash
find src/app/api -name "route.ts" -exec sed -i '' "/export const dynamic = 'force-dynamic'/d" {} \;
npm run build
```

**Verificar limpeza:**

```bash
grep -r "force-dynamic" src/app --include="*.ts" --include="*.tsx"
# Esperado: zero resultados
```

---

## 🟢 T3: use cache em billing plans

**Verificar funcionamento:**

```bash
# 1. buscar planos — deve retornar 200
curl http://localhost:3000/api/v1/billing/plans

# 2. alterar plano via admin
# 3. buscar planos novamente — deve refletir mudanca (cache invalidado)
```

---

## 📂 Arquivos Principais

- `src/lib/env.ts` - a criar — validacao Zod server-side
- `src/lib/env.client.ts` - a criar — validacao Zod client-side
- `src/features/billing/services/asaas-config.service.ts` - maior consumidor de process.env
- `src/features/whatsapp/services/meta-cloud.service.ts` - 6 process.env diretos
- `src/features/billing/services/billing-plan-catalog.service.ts` - alvo do use cache

---

## 🚀 Comecar

```bash
git checkout -b refactor/nextjs16-alignment

# T1: criar env.ts e migrar process.env
# T2: remover force-dynamic em massa
find src/app/api -name "route.ts" -exec sed -i '' "/export const dynamic = 'force-dynamic'/d" {} \;
# T3: adicionar "use cache" em listPublicBillingPlans

npm run build
# Esperado: ✓ Compiled successfully

git add -A
git commit -m "refactor(T1): centralize env vars in src/lib/env.ts with Zod validation"
git commit -m "refactor(T2): remove redundant force-dynamic from 50 files (Next.js 16 default)"
git commit -m "feat(T3): add use cache to public billing plans endpoint"
```

---

## ⚠️ Cuidados

- **T1:** vars `NEXT_PUBLIC_` precisam de arquivo separado (`env.client.ts`) sem `server-only` — nao colocar junto com server vars
- **T2:** pages com `"use cache"` configurado devem manter `force-dynamic` apenas se necessario forcar dinamico apos cache — no estado atual nenhuma page tem `use cache`, entao pode remover tudo
- **T3:** nao adicionar `"use cache"` em endpoints autenticados por usuario/org sem cuidado com a cache key — billing plans e publico e seguro

---

**Status:** Pronto para execucao
