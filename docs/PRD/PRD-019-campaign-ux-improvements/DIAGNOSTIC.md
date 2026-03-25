# Diagnostic: PRD-019 Campaign UX Improvements

---

## Resumo Executivo

PRD de melhorias incrementais. A maioria das features são aditivas (novos campos, novos endpoints,
novos componentes). Os riscos são baixos e bem contidos. A única mudança de schema é o modelo
`WhatsAppOptOut` (Task 9), que não altera modelos existentes.

A decisão mais impactante é a **migração drawer → main shell** (Task 1), que é irreversível mas
de baixo risco: o `CampaignBuilder` já existe e já está apontado pelo route `/campaigns/new`.

---

## Problemas Encontrados

### 1. Drawer vs Main Shell: estado atual parcialmente migrado

**Problema:** O `CampaignBuilder` foi criado como componente full-page em
`src/components/dashboard/campaigns/builder/campaign-builder.tsx` e o route `/campaigns/new`
já existe e aponta para ele. Mas `CampaignsPage` ainda importa e renderiza `CampaignFormDrawer`,
e o botão "Nova campanha" ainda chama `setIsCreateOpen(true)` em vez de navegar.

**Situação:** Dois sistemas em coexistência. Qualquer um dos dois pode criar campanhas,
gerando inconsistência de UX.

**Decisão:** Completar a migração. Deletar `CampaignFormDrawer`. Atualizar `CampaignsPage`
para navegar com `router.push`. O `CampaignBuilder` é o único ponto de entrada.

---

### 2. Stats: backward compatibility do campo `success`

**Problema:** O campo `success` no response de `/stats` é usado pelo polling na `[campaignId]/page.tsx`
para exibir os 4 counters atuais. Mudar o significado quebraria a UI.

**Decisão:** Manter `success` com o mesmo valor atual (`SENT + DELIVERED + READ + RESPONDED`)
como alias. Adicionar os novos campos `sent`, `delivered`, `read`, `responded` sem remover `success`.
Quando a UI for atualizada para o funil (Task 3), `success` pode ser deprecado em PRD futuro.

---

### 3. Filtro de recipients: server-side vs client-side

**Problema:** Filtrar 5k+ recipients no cliente é inviável (memória + latência do download).

**Decisão:** Filtro server-side. A rota `/recipients` já tem paginação; adicionar `status` e
`phone` como query params Prisma com `where` dinâmico. O client invalida a query ao mudar filtro,
reset `page` para 1.

---

### 4. Preview de template: fonte dos dados

**Problema:** Os templates já existem em `GET /api/v1/whatsapp/templates`, mas o response
atual retorna só `name` e `language`. O preview precisa dos componentes (header/body/footer/buttons).

**Decisão:** O endpoint de templates retorna `components` da Meta (já armazenados no modelo
`WhatsAppTemplate.components: Json?`). Se o campo existir, usar; se null, exibir só nome e idioma.
Não criar novo endpoint — ajustar a query de seleção para incluir `components`.

---

### 5. Duplicar campanha: e os dispatchGroups?

**Problema:** Uma campanha pode ter múltiplos `WhatsAppCampaignDispatchGroup`. Ao duplicar,
duplicar só o grupo principal (sem A/B variants do original, se houver)?

**Decisão v1:** Duplicar apenas o primeiro `dispatchGroup` (o principal, com `order: 0`).
Se a campanha original era A/B (`isAbTest: true`), a cópia nasce como campanha simples
(`isAbTest: false`). O usuário pode ativar A/B novamente no builder se quiser. Isso evita
complexidade com `WhatsAppCampaignVariant` nesta versão.

---

### 6. Opt-out: escopo de organização vs projeto

**Problema:** A maioria dos dados no sistema é por projeto. Opt-out deveria ser por projeto
ou por organização?

**Decisão:** Por **organização**. Um número que optou por não receber mensagens de um projeto
não deve receber mensagens de outros projetos da mesma organização. Isso é mais seguro para
conformidade (LGPD) e é o comportamento esperado por qualquer ferramenta de marketing.

---

### 7. Opt-out: integração com snapshot — performance

**Problema:** Para campanhas com 100k recipients, fazer um `IN` com todos os opt-outs pode
ser lento se a blocklist tiver milhares de entradas.

**Decisão v1:** Usar índice `@@index([organizationId, phone])` e fazer o check no loop de
criação de recipients com um Set<string> carregado em memória antes do loop. Para blocklists
acima de 50k entradas (caso extremo), revisitar com uma estratégia de batch join.

---

## O Que Ja Esta Bom

- `WhatsAppCampaignRecipient.status` já tem `EXCLUDED` e `exclusionReason` — opt-out usa campos existentes.
- `CampaignBuilder` já tem estrutura de steps e está em tela cheia.
- `/stats` já tem `force-dynamic` e validação de acesso — só precisamos adicionar campos.
- Route `/campaigns/new` já existe e aponta para `CampaignBuilder`.

---

## Matriz de Risco

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Drawer removal quebra fluxo | Baixa | Médio | CampaignBuilder já funciona no /new |
| Stats backward compat | Baixa | Alto | Manter campo `success` como alias |
| Preview sem components no template | Média | Baixo | Fallback: mostrar só nome + idioma |
| Opt-out performance em blocklist grande | Baixa | Médio | Set<string> em memória + índice |
| Duplicar campanha A/B gera confusão | Média | Baixo | Cópia nasce sempre como simples |

---

## Gaps e Decisoes Deliberadas

### Importação em lote de opt-outs fica fora da v1
Adicionar CSV upload para blocklist em massa seria útil mas aumenta complexidade.
V2 pode adicionar via um `POST /api/v1/whatsapp/opt-outs/import`.

### Opt-out por link automático na mensagem fica fora da v1
Gerar link de opt-out nas mensagens de campanha requer um sistema de short-links e
tracking de cliques. Dependência de PRD separado.

### Throttle configurável não entra
O brainstorm citou "máximo X por hora" mas requer mudança no execution service.
PRD separado.

---

## Alinhamento com nextjs-feature-dev Conventions

### ✅ Architecture
- Services em `src/lib/whatsapp/services/` com Result<T>
- Schemas Zod em `src/lib/whatsapp/schemas/`
- Routes delegam para services, 30-50 linhas max

### ✅ Error Handling
- Todos os services retornam `Result<T>`
- Route handlers: try/catch com `apiError` / `apiSuccess`

### ✅ Validation
- Zod em todas as fronteiras de API
- Query params validados com `.safeParse`

### ✅ Components
- Server Components por padrão (funil de engajamento estático após COMPLETED)
- `'use client'` apenas onde há interação (filtro de recipients, opt-out manager)
- TanStack Query para polling durante PROCESSING

### ✅ Commits
- 1 commit por task
- Mensagens no formato `feat(whatsapp): ...`
