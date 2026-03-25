# Quick Start: PRD-019 Campaign UX Improvements

**Status:** ✅ CONCLUÍDO

---

## Objetivo

Entregar 13 melhorias incrementais no módulo de campanhas WhatsApp:
1. Drawer → Main Shell
2. Funil de engajamento na página de detalhe
3. Filtro e busca na tabela de destinatários
4. Preview de template no Campaign Builder
5. Duplicar campanha
6. Blocklist / Opt-out

---

## Configuracao da Branch

### Step 1 — Criar feature branch

```bash
git checkout main && git pull
git checkout -b feat/prd-019-campaign-ux
```

### Step 2 — Primeiro commit e o PRD

```bash
git add docs/PRD/PRD-019-campaign-ux-improvements/
git commit -m "docs: add PRD-019 campaign ux improvements"
```

### Step 3 — Cada task = um commit atomico

Ver mensagens de commit em TASKS.md.

---

## Ordem Recomendada de Leitura

1. Este arquivo (orientação geral)
2. `CONTEXT.md` — comportamento esperado de cada feature
3. `DIAGNOSTIC.md` — decisões técnicas e backward compat
4. `TASKS.md` — implementação detalhada

---

## Ordem de Execucao

```
T1 (drawer → shell)
  ↓
T2 (stats breakdown) → T3 (funil visual)
T4 (recipients filter API) → T5 (recipients filter UI)
T6 (template preview)
T7 (duplicate API) → T8 (duplicate button)
  ↓
T9 (opt-out schema)
  ↓
T10 (opt-out service + API)
  ↓
T11 (snapshot integration) || T12 (opt-out UI)
  ↓
T13 (blocklist tab)
```

T2-T8 podem ser desenvolvidas em paralelo após T1 concluída.

---

## Regras de Implementacao

### 1. Nao quebrar backward compat do /stats
O campo `success` deve continuar presente com o mesmo valor (`sent`). O polling
na página de detalhe usa este campo — só remover em PRD futuro após atualizar todos os consumers.

### 2. Filtro de recipients e server-side
Nunca filtrar no cliente. Sempre passar `status` e `phone` como query params para o endpoint.
Set `page = 1` ao mudar qualquer filtro.

### 3. Opt-out e por organizacao
O escopo do `WhatsAppOptOut` é `organizationId`. Não é por projeto. Validar sempre com
o `organizationId` do access token, não com params da URL.

### 4. Preview de template e somente leitura
O componente `TemplatePreviewCard` não tem state nem callbacks. É puramente de exibição.
Variáveis `{{N}}` são substituídas por `[variável N]` no render, nunca editadas.

### 5. Duplicate nasce como DRAFT simples
Independente do status ou configuração da campanha original, a cópia sempre nasce como:
- `status: 'DRAFT'`
- `isAbTest: false`
- `scheduledAt: null`

### 6. Server Components por padrao
- `opt-outs/page.tsx`: Server Component wrapper
- `CampaignEngagementFunnel`: Server Component quando status é COMPLETED; Client com polling
  quando PROCESSING
- `TemplatePreviewCard`: Server Component (dados estáticos)

---

## Checklist Tecnico

### Fase 1 (T1-T8) ✅ CONCLUÍDO
- [x] `CampaignFormDrawer` deletado e sem referências no codebase
- [x] Botão "Nova campanha" navega para `/campaigns/new`
- [x] `/stats` retorna `sent`, `delivered`, `read`, `responded` (e `success` como alias)
- [x] Funil visual exibe taxas sem divisão por zero
- [x] `/recipients` aceita `?status=` e `?phone=` com Zod validation
- [x] UI de recipients reseta página ao trocar filtro
- [x] `TemplatePreviewCard` renderiza fallback se `components` for null
- [x] Duplicate cria campanha com nome ` — Cópia` e status DRAFT
- [x] `npm run lint` sem erros
- [x] `npm run build` sem erros

### Fase 2 (T9-T13) ✅ CONCLUÍDO
- [x] Migration cria tabela com `@@unique([organizationId, phone])`
- [x] `getOptOutSet` é chamado uma vez por snapshot (não por recipient)
- [x] Recipient opt-out tem `status = EXCLUDED` e `exclusionReason = 'OPT_OUT'`
- [x] UI exibe badge de fonte correta (MANUAL / CAMPAIGN_REPLY / API)
- [x] Remove opt-out mostra AlertDialog antes de confirmar
- [x] Aba "Blocklist" navega para página separada
- [x] `prisma validate` sem erros
- [x] `npm run build` sem erros (final)

---

## Verificacao Sugerida

Após T1:
```bash
# verificar que drawer foi removido
grep -r "CampaignFormDrawer" src/ # deve retornar 0 resultados
grep -r "isCreateOpen" src/components/dashboard/campaigns/campaigns-page.tsx # deve retornar 0
```

Após T2:
```bash
# testar o endpoint localmente
curl -H "x-organization-id: <id>" http://localhost:3000/api/v1/whatsapp/campaigns/<id>/stats
# response deve conter: sent, delivered, read, responded, failed, pending, success
```

Após T9:
```bash
npx prisma validate
npx prisma migrate dev --name whatsapp_opt_out
```

---

## Resultado Entregue ✅

- ✅ Criar campanha abre tela cheia do Campaign Builder (sem drawer)
- ✅ Página de detalhe mostra funil: "950 entregues (95%) → 600 lidos (63%) → 80 responderam (8%)"
- ✅ Tabela de destinatários tem select de status + busca por telefone
- ✅ Passo de Conteúdo do builder mostra preview da mensagem ao selecionar template
- ✅ Botão "Duplicar" na página de detalhe cria cópia e redireciona
- ✅ Página `/campaigns/opt-outs` lista blocklist com add/remove dialogs
- ✅ Snap de campanha exclui automaticamente contatos na blocklist com `exclusionReason: 'OPT_OUT'`
- ✅ Aba "Blocklist" na navegação de campanhas redireciona para /campaigns/opt-outs
- ✅ Tabela de campanhas mostra métricas: Enviado, Entregue, Lido, Criado em

## Commits Entregues

```
a83fcd1 feat(campaigns): add engagement metrics to campaigns list table
5169eba feat(campaigns): add WhatsAppOptOut schema and migration
04cccf8 feat(campaigns): add opt-out service and CRUD endpoints
a337c53 feat(campaigns): exclude opted-out contacts during campaign snapshot
0553ef2 feat(campaigns): add opt-out manager UI and page
825566c feat(campaigns): add blocklist tab to campaigns navigation
```
