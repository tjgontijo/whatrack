# Tasks: PRD-019 Campaign UX Improvements

**Data:** 2026-03-25
**Status:** Draft
**Total:** 13
**Estimado:** 2 fases

---

## Ordem de Execucao

| Fase | Descricao | Tasks |
|------|-----------|-------|
| Fase 1 | Quick Wins (sem mudanca de schema) | T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 |
| Fase 2 | Blocklist / Opt-out | T9 → T10 → T11 → T12 → T13 |

Dentro da Fase 1: T1 deve ser feita primeiro (desbloqueador). Após T1, as tasks T2-T8 podem ser
desenvolvidas em paralelo pois são independentes entre si.

---

## FASE 1 — Quick Wins

---

### T1: Migrar criacao de campanha de drawer para main shell

**Files:**
- Modify: `src/components/dashboard/campaigns/campaigns-page.tsx`
- Delete: `src/components/dashboard/campaigns/campaign-form-drawer.tsx`

**What to do:**

Em `campaigns-page.tsx`:
- Remover import de `CampaignFormDrawer`
- Remover estado `isCreateOpen` e `initialCreateOpen` prop
- Remover `<CampaignFormDrawer>` do JSX
- Alterar o botão "Nova campanha" de `onClick={() => setIsCreateOpen(true)}` para
  `onClick={() => router.push(campaignsPath + '/new')}`
- Garantir que `router` já está importado (já está via `useRouter`)

Em `campaign-form-drawer.tsx`:
- Deletar o arquivo completamente

**Verification:**
- Clicar "Nova campanha" navega para `/campaigns/new` sem abrir drawer.
- `CampaignBuilder` renderiza corretamente na nova rota.
- Não existe mais referência a `CampaignFormDrawer` no codebase.
- `npm run build` sem erros de import.

**Depends on:** nada (pode ser feita agora)

---

### T2: Adicionar breakdown por status no endpoint /stats

**Files:**
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts`

**What to do:**

Substituir as 3 queries paralelas por 1 query de agrupamento por status:

```typescript
const statusCounts = await prisma.whatsAppCampaignRecipient.groupBy({
  by: ['status'],
  where: { campaignId },
  _count: { _all: true },
})

const counts = Object.fromEntries(
  statusCounts.map((row) => [row.status, row._count._all])
) as Record<string, number>

const get = (s: string) => counts[s] ?? 0

const total      = statusCounts.reduce((sum, r) => sum + r._count._all, 0)
const responded  = get('RESPONDED')
const read       = get('READ') + responded
const delivered  = get('DELIVERED') + read
const sent       = get('SENT') + delivered
const failed     = get('FAILED') + get('EXCLUDED')
const pending    = get('PENDING')

return apiSuccess({
  status: campaign.status,
  total,
  sent,
  delivered,
  read,
  responded,
  failed,
  pending,
  success: sent, // alias para backward compat
})
```

**Verification:**
- Response inclui `sent`, `delivered`, `read`, `responded` além dos campos originais.
- `success` continua presente com valor igual a `sent`.
- Os valores são cumulativos: `delivered >= read >= responded`.
- Query usa 1 `groupBy` em vez de 3 `count` separados.

**Depends on:** T1 (pode ser paralela, mas T1 deve estar feita primeiro)

---

### T3: Componente de funil de engajamento na pagina de detalhe

**Files:**
- Create: `src/components/dashboard/campaigns/campaign-engagement-funnel.tsx`
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/[campaignId]/page.tsx`

**What to do:**

Criar `campaign-engagement-funnel.tsx` (`'use client'`):
- Recebe `stats: { total, sent, delivered, read, responded, failed, pending }` como prop
- Exibe funil horizontal com 4 etapas: Enviado → Entregue → Lido → Respondeu
- Cada etapa: número absoluto + taxa relativa ao passo anterior entre parênteses
  - Enviado: `sent` (sem taxa — é a base)
  - Entregue: `delivered` + `(X% dos enviados)`
  - Lido: `read` + `(X% dos entregues)`
  - Respondeu: `responded` + `(X% dos lidos)`
- Etapas com count 0 ficam em `opacity-40`
- Abaixo do funil: linha com Falhou (`failed`) e Pendente (`pending`)
- Layout responsivo: horizontal em md+, vertical em mobile

Na `page.tsx`:
- Substituir os 4 cards de counters (Total/Sucesso/Falha/Pendente) pelo componente `CampaignEngagementFunnel`
- Passar `stats` como prop (já vem da query de stats existente)
- O polling de 2s durante PROCESSING já está implementado — reutilizar

**Verification:**
- Funil exibe 4 etapas com valores e taxas corretas.
- Taxa de Entregue = `(delivered / sent * 100).toFixed(1)%` — ou "—" se `sent = 0`.
- Funil exibe "—" nas taxas se etapa anterior for 0 (evitar divisão por zero).
- Em campanha com `status !== PROCESSING`, não há polling.
- Os 4 cards originais (Total/Sucesso/Falha/Pendente) foram removidos.

**Depends on:** T2

---

### T4: Adicionar filtro e busca no endpoint /recipients

**Files:**
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/recipients/route.ts`

**What to do:**

Adicionar parsing de query params:
```typescript
const url = new URL(request.url)
const statusFilter = url.searchParams.get('status') ?? undefined
const phoneSearch  = url.searchParams.get('phone') ?? undefined
```

Adicionar ao `where` da query Prisma:
```typescript
where: {
  campaignId,
  ...(statusFilter ? { status: statusFilter } : {}),
  ...(phoneSearch  ? { phone: { contains: phoneSearch, mode: 'insensitive' } } : {}),
}
```

Aplicar o mesmo `where` ao `count` para `totalPages` correto.

Validar `statusFilter` contra enum válido (Zod `.optional().refine()`):
```
z.enum(['PENDING','SENT','DELIVERED','READ','RESPONDED','FAILED','EXCLUDED']).optional()
```

**Verification:**
- `?status=FAILED` retorna apenas recipients com status FAILED.
- `?phone=9999` retorna recipients cujo telefone contém "9999".
- `?status=FAILED&phone=55` combina os dois filtros.
- `totalPages` reflete a contagem filtrada, não o total geral.
- Status inválido retorna `400 Bad Request`.

**Depends on:** T1

---

### T5: Filtro e busca na UI da tabela de destinatarios

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/[campaignId]/page.tsx`

**What to do:**

Adicionar estado para filtros:
```typescript
const [recipientStatusFilter, setRecipientStatusFilter] = React.useState<string>('')
const [recipientPhoneSearch, setRecipientPhoneSearch]   = React.useState<string>('')
const [recipientPhoneDebounced] = useDebounce(recipientPhoneSearch, 300)
```

Atualizar `queryKey` e `queryFn` dos recipients para incluir os filtros:
```typescript
queryKey: ['campaign-recipients', organizationId, campaignId, recipientPage, recipientStatusFilter, recipientPhoneDebounced]
queryFn: async () => {
  const url = new URL(`/api/v1/whatsapp/campaigns/${campaignId}/recipients`, window.location.origin)
  url.searchParams.set('page', String(recipientPage))
  url.searchParams.set('pageSize', '20')
  if (recipientStatusFilter) url.searchParams.set('status', recipientStatusFilter)
  if (recipientPhoneDebounced) url.searchParams.set('phone', recipientPhoneDebounced)
  ...
}
```

Ao mudar `recipientStatusFilter` ou `recipientPhoneDebounced`, reset `recipientPage` para 1.

Acima da tabela, adicionar barra de filtros:
- `<Select>` com opções: Todos / Enviada / Entregue / Lida / Interação / Falhou / Excluído
- `<Input>` de busca por telefone com ícone de lupa
- Contador: "Mostrando X destinatários" (usa `recipients.total` do response)

Usar `usehooks-ts` para `useDebounce` ou implementar manualmente com `useEffect + setTimeout`.

**Verification:**
- Selecionar "Falhou" no select filtra a tabela para status FAILED.
- Digitar telefone filtra após 300ms sem disparar query a cada tecla.
- Ao trocar filtro, volta para página 1 automaticamente.
- Contador mostra o total filtrado correto.

**Depends on:** T4

---

### T6: Preview de template no Campaign Builder

**Files:**
- Modify: `src/components/dashboard/campaigns/builder/campaign-builder.tsx`
- Create: `src/components/dashboard/campaigns/builder/template-preview-card.tsx`

**What to do:**

Criar `template-preview-card.tsx`:
- Recebe `template: { name, language, components?: TemplateComponent[] }`
- Renderiza em estilo "bolha WhatsApp" (fundo branco, bordas arredondadas, shadow)
- Componentes renderizados em ordem: HEADER → BODY → FOOTER → BUTTONS
  - HEADER (TEXT): texto em negrito
  - HEADER (IMAGE/VIDEO/DOCUMENT): placeholder com ícone + "Mídia"
  - BODY: texto com variáveis `{{N}}` substituídas por `[variável N]` em destaque
  - FOOTER: texto em `text-muted-foreground text-xs`
  - BUTTONS: lista de botões com aparência de link/call-to-action
- Se `components` for null/undefined: exibir "Pré-visualização indisponível"

No passo "Conteúdo" do `CampaignBuilder`:
- Buscar lista de templates via `useQuery` em `GET /api/v1/whatsapp/templates`
  (incluir `components` na seleção da query do endpoint se não estiver)
- Ao selecionar template no select, exibir `TemplatePreviewCard` ao lado
- Layout: 2 colunas em md+ (seletor à esquerda, preview à direita), 1 coluna em mobile

**Verification:**
- Selecionar template exibe preview imediatamente.
- Variáveis `{{1}}` e `{{2}}` aparecem como `[variável 1]` no preview.
- Template sem `components` exibe mensagem de fallback.
- Preview não é editável.

**Depends on:** T1

---

### T7: Endpoint de duplicar campanha

**Files:**
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/duplicate/route.ts`
- Create: `src/lib/whatsapp/services/whatsapp-campaign-duplicate.service.ts`

**What to do:**

Criar `whatsapp-campaign-duplicate.service.ts`:
```typescript
export async function duplicateCampaign(
  campaignId: string,
  organizationId: string
): Promise<Result<{ campaignId: string; name: string }>> {
  // 1. Buscar campanha original com o primeiro dispatchGroup (order: 0)
  // 2. Validar que pertence à organizationId
  // 3. Criar nova campanha:
  //    - name: `${original.name} — Cópia`
  //    - status: 'DRAFT'
  //    - isAbTest: false
  //    - abTestConfig: null
  //    - scheduledAt: null
  //    - Copiar: type, instanceId, projectId
  // 4. Criar novo dispatchGroup:
  //    - Copiar: templateName, templateLang, templateComponents, variables
  //    - order: 0, isRemainder: false
  // 5. Registrar evento CREATED na campanha nova
  // 6. Retornar { campaignId: newCampaign.id, name: newCampaign.name }
}
```

Criar rota `POST /campaigns/[campaignId]/duplicate`:
- Auth: `validateFullAccess`
- Body: vazio (nenhum input)
- Chamar `duplicateCampaign`
- Response: `{ campaignId, name }`

**Logging points:**
```typescript
logger.info({ originalId: campaignId, newId: newCampaign.id }, '[Campaign] Duplicated')
```

**Verification:**
- Nova campanha tem status `DRAFT` e `isAbTest: false`.
- Nome termina com ` — Cópia`.
- `scheduledAt` é null na cópia.
- Não copia recipients nem variants.
- Campanha de outra organização retorna 404.

**Depends on:** T1

---

### T8: Botao "Duplicar" na pagina de detalhe

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/[campaignId]/page.tsx`

**What to do:**

Adicionar mutation de duplicar:
```typescript
const duplicateMutation = useMutation({
  mutationFn: async () =>
    apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/duplicate`, {
      method: 'POST',
      orgId: organizationId,
    }),
  onSuccess: (data: { campaignId: string; name: string }) => {
    toast.success(`Campanha duplicada: ${data.name}`)
    router.push(`${campaignsPath}/${data.campaignId}`)
  },
  onError: (err: Error) => toast.error('Erro ao duplicar', { description: err.message }),
})
```

Adicionar botão "Duplicar" na barra de ações da campanha (ao lado de Cancelar/Disparar):
- Visível em todos os status (incluindo COMPLETED e CANCELLED)
- Ícone: `Copy` (lucide-react)
- `disabled={duplicateMutation.isPending}`
- Confirmação: não é necessária (ação não destrutiva)

**Verification:**
- Clicar "Duplicar" cria nova campanha e navega para ela.
- Toast mostra o nome da nova campanha.
- Botão fica desabilitado durante a request.
- Botão aparece em campanhas COMPLETED e CANCELLED.

**Depends on:** T7

---

## FASE 2 — Blocklist / Opt-out

---

### T9: Adicionar modelo WhatsAppOptOut ao schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_whatsapp_opt_out/migration.sql`

**What to do:**

Adicionar modelo:
```prisma
model WhatsAppOptOut {
  id             String   @id @default(cuid())
  organizationId String
  phone          String
  source         String   // 'MANUAL' | 'CAMPAIGN_REPLY' | 'API'
  campaignId     String?
  note           String?
  createdAt      DateTime @default(now())
  createdBy      String?

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  campaign       WhatsAppCampaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  @@unique([organizationId, phone])
  @@index([organizationId, createdAt])
}
```

Adicionar relation inversa em `Organization`: `optOuts WhatsAppOptOut[]`
Adicionar relation inversa em `WhatsAppCampaign`: `optOuts WhatsAppOptOut[]`

**Verification:**
- `prisma validate` sem erros.
- Migration cria tabela com unique constraint `(organizationId, phone)`.
- `prisma generate` atualiza o client.

**Depends on:** T8

---

### T10: Criar servico e endpoints de opt-out

**Files:**
- Create: `src/lib/whatsapp/services/whatsapp-opt-out.service.ts`
- Create: `src/app/api/v1/whatsapp/opt-outs/route.ts`
- Create: `src/app/api/v1/whatsapp/opt-outs/[optOutId]/route.ts`

**What to do:**

Criar `whatsapp-opt-out.service.ts`:
- `addOptOut(input, organizationId, userId)`: cria `WhatsAppOptOut`. Retorna `Result<WhatsAppOptOut>`.
  - Se já existe `(organizationId, phone)`: retornar `fail('already_opted_out')`.
- `removeOptOut(optOutId, organizationId)`: deleta por id. Valida que pertence à org. Retorna `Result<void>`.
- `listOptOuts(organizationId, filters)`: paginado. Aceita `phone?: string` para busca. Retorna `Result<{ items, total, page, totalPages }>`.
- `getOptOutSet(organizationId)`: retorna `Set<string>` de todos os telefones — usado pelo snapshot.

Schemas Zod:
```typescript
const AddOptOutSchema = z.object({
  phone: z.string().min(5),
  source: z.enum(['MANUAL', 'CAMPAIGN_REPLY', 'API']),
  campaignId: z.string().optional(),
  note: z.string().min(5).optional(),
})
```

Criar rotas:
- `GET /opt-outs?page=1&pageSize=20&phone=...` — lista paginada
- `POST /opt-outs` — adicionar opt-out manual (body: `AddOptOutSchema`)
- `DELETE /opt-outs/[optOutId]` — remover opt-out

**Logging points:**
```typescript
logger.info({ phone, source, organizationId }, '[OptOut] Added')
logger.info({ optOutId, organizationId }, '[OptOut] Removed')
```

**Verification:**
- `POST /opt-outs` com telefone duplicado retorna `409 Conflict`.
- `DELETE /opt-outs/{id}` de outra organização retorna 404.
- `GET /opt-outs?phone=9999` filtra por telefone.
- `GET /opt-outs` retorna paginado com `totalPages` correto.

**Depends on:** T9

---

### T11: Integrar opt-out no snapshot de campanha

**Files:**
- Modify: `src/lib/whatsapp/services/whatsapp-campaign-snapshot.service.ts`
  (ou o service equivalente que cria os `WhatsAppCampaignRecipient`)

**What to do:**

Antes do loop de criação de recipients:
1. Chamar `getOptOutSet(organizationId)` para carregar todos os telefones excluídos em memória
2. No loop de criação de cada recipient, checar:
   ```typescript
   const isOptedOut = optOutSet.has(phone)
   ```
3. Se `isOptedOut = true`:
   - Criar recipient com `status: 'EXCLUDED'` e `exclusionReason: 'OPT_OUT'`
   - Não alterar status se já era `EXCLUDED` por outro motivo

Adicionar log de resumo ao final:
```typescript
logger.info(
  { campaignId, total: recipients.length, excluded: excludedByOptOut },
  '[Snapshot] Opt-out exclusions applied'
)
```

**Verification:**
- Telefone na blocklist cria recipient com `status = EXCLUDED` e `exclusionReason = 'OPT_OUT'`.
- Telefone não listado é criado normalmente.
- Blocklist vazia não adiciona overhead perceptível (Set.has é O(1)).
- Log de resumo indica quantos foram excluídos por opt-out.

**Depends on:** T10

---

### T12: UI de gestao de opt-outs

**Files:**
- Create: `src/components/dashboard/campaigns/opt-out-manager.tsx`
- Create: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/opt-outs/page.tsx`

**What to do:**

Criar `opt-out-manager.tsx` (`'use client'`):
- Tabela: Telefone / Fonte (badge) / Campanha (link) / Data / Nota / Ações
- Fonte badge: MANUAL = secondary, CAMPAIGN_REPLY = outline, API = default
- Paginação: 20 itens por página
- Busca por telefone (debounced 300ms)
- Botão "Adicionar opt-out" abre dialog:
  - Input de telefone (required)
  - Textarea de nota (required, min 5 chars)
  - Source é sempre MANUAL no form
- Botão "Remover" por linha com AlertDialog de confirmação:
  - "Ao remover, este número poderá receber campanhas futuras."
  - Confirmar via `DELETE /opt-outs/{id}`

Criar `opt-outs/page.tsx`:
- Server Component simples que renderiza `<OptOutManager />`
- Breadcrumb: Campanhas > Blocklist

**Verification:**
- Adicionar opt-out aparece na tabela imediatamente após invalidar query.
- Remover opt-out pede confirmação e remove da tabela.
- Busca por telefone filtra a tabela com debounce.
- Fonte exibe badge correto para cada tipo.

**Depends on:** T10

---

### T13: Link para blocklist na pagina de campanhas

**Files:**
- Modify: `src/components/dashboard/campaigns/campaigns-page.tsx`

**What to do:**

Adicionar terceira aba ao `TABS`:
```typescript
const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'campaigns', label: 'Campanhas' },
  { key: 'opt-outs', label: 'Blocklist' },
]
```

Ao selecionar aba `opt-outs`, navegar para `/campaigns/opt-outs`:
```typescript
if (tab === 'opt-outs') {
  router.push(campaignsPath + '/opt-outs')
  return
}
```

(A page `/campaigns/opt-outs` é Server Component separado, não aba inline — evitar carregar
o `OptOutManager` desnecessariamente na listagem.)

**Verification:**
- Aba "Blocklist" aparece no header de Campanhas.
- Clicar navega para `/campaigns/opt-outs`.
- Abas "Visão Geral" e "Campanhas" continuam funcionando.

**Depends on:** T12

---

## Commit Messages por Task

```bash
T1:  refactor(campaigns): replace form drawer with full-page campaign builder
T2:  feat(campaigns): add per-status breakdown to /stats endpoint
T3:  feat(campaigns): add engagement funnel component to campaign detail
T4:  feat(campaigns): add status filter and phone search to /recipients endpoint
T5:  feat(campaigns): add status filter and phone search UI to recipient table
T6:  feat(campaigns): add template preview card to campaign builder
T7:  feat(campaigns): add duplicate campaign service and endpoint
T8:  feat(campaigns): add duplicate button to campaign detail page
T9:  feat(campaigns): add WhatsAppOptOut schema and migration
T10: feat(campaigns): add opt-out service and CRUD endpoints
T11: feat(campaigns): exclude opted-out contacts during campaign snapshot
T12: feat(campaigns): add opt-out manager UI and page
T13: feat(campaigns): add blocklist tab to campaigns navigation
```

---

## Padroes de Implementacao

### Result<T>
```typescript
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'
```

### Logging
```typescript
import { logger } from '@/server/logger'
logger.info({ context }, '[Domain] Message')
logger.error({ err, context }, '[Domain] Failure')
```

### Zod em route handlers
```typescript
const parsed = Schema.safeParse(await request.json())
if (!parsed.success) return apiError('Invalid input', 400)
const input = parsed.data
```

### TanStack Query com filtros
```typescript
queryKey: ['campaign-recipients', orgId, campaignId, page, statusFilter, phoneDebounced]
// Ao mudar filtro: setPage(1) antes ou junto com setFilter
```
