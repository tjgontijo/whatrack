# Diagnostic: WhatsApp Campaign A/B Testing

**Ultima atualizacao:** 2026-03-25

---

## Resumo Executivo

A/B Testing e uma extensao natural do sistema de `dispatchGroups` introduzido no PRD-017. O maior risco nao e tecnico — e de scope: A/B testing pode crescer rapidamente para incluir significancia estatistica, multiplos objetivos, bandit algorithms e integracao com CRM. Esta diagnostica define os limites claros da v1 e as decisoes deliberadas para manter a feature operacional e entregavel.

---

## Problemas Encontrados

### 1. dispatchGroups sem nocao de variante

**Problema:** `WhatsAppCampaignDispatchGroup` agrupa recipients por instancia de envio, nao por variante de teste. Usar o mesmo modelo sem extensao cria ambiguidade: como distinguir "grupos por instancia" de "grupos por variante de teste"?

**Solucao escolhida:** Adicionar `WhatsAppCampaignVariant` como model separado, ligado 1:1 a um `dispatchGroup`. O `dispatchGroup` continua sendo a unidade de execucao; a variante e a unidade de teste. Campo `isAbTest = true` na campanha sinaliza que os grupos sao variacoes, nao particoes por instancia.

### 2. Split de audiencia: upfront vs lazy

**Problema:** Quando dividir a audiencia — no momento da criacao, do snapshot ou do dispatch?

**Analise:**

| Abordagem | Quando divide | Pro | Contra |
|---|---|---|---|
| **Upfront (no snapshot)** | Ao enviar/agendar | Snapshot imutavel, determinismo, sem surpresas | Split fixo, nao reagrupa se desistir de uma variante |
| **Lazy (no dispatch)** | Durante execucao | Flexivel | Complexo, estado mutavel, race conditions |
| **On-demand (no preview)** | Ao revisar | Usuario ve antes de confirmar | Dois momentos de split, pode divergir |

**Decisao:** Upfront no snapshot, igual ao comportamento base do PRD-017. Ao clicar "Enviar" ou "Agendar", o sistema calcula o split, cria os recipients com `variantId` e congela tudo.

### 3. Recipient do remainder: status especial ou grupo separado?

**Problema:** O remainder precisa aguardar o vencedor. Como modelar os recipients que ainda nao foram enviados?

**Opcao A — Status especial `PENDING_REMAINDER`:**
- Recipients existem desde o snapshot com `status = 'PENDING_REMAINDER'`
- Pro: Auditavel, facil de contar
- Contra: Polui o enum de status com um estado de espera

**Opcao B — Grupo separado sem recipients ate a promocao:**
- `isRemainder = true` no dispatchGroup; recipients sao criados apenas ao promover o vencedor
- Pro: Status de recipient mais limpo, sem estados de espera
- Contra: O remainder nao aparece nas contagens de "total da campanha" ate ser criado

**Decisao: Opcao B.** Recipients do remainder so existem no banco apos o vencedor ser selecionado. O `remainderCount` e derivado de `totalRecipients - sum(splitPercent * total)`. Isso mantem o modelo de status de recipient limpo.

### 4. Auto-promocao: cron ou event-driven?

**Problema:** Como acionar a selecao do vencedor apos a janela expirar?

**Opcao A — Cron periodico (ex: a cada hora):**
- Pro: Simples, alinhado com o padrao ja existente (`campaign-dispatch` cron)
- Contra: Latencia de ate 1h para promover o vencedor; janelas curtas (4h) ficam imprecisas

**Opcao B — `after()` no momento do snapshot:**
- Usa `next/server after()` para agendar verificacao exata
- Pro: Preciso
- Contra: Forca uma funcao de longa duracão; pode perder o evento se o processo morrer antes

**Opcao C — Cron a cada 15min:**
- Pro: Equilibrio entre precisao e simplicidade
- Contra: Ligeiramente mais frequente que o necessario

**Decisao: Opcao A com cron horario.** Janelas de 4h+ tem margem de 1h de latencia, o que e aceitavel para a v1. Usuarios que precisam de precisao usam selecao manual. O cron e protegido por `jobTracker.acquireLock` igual ao `campaign-dispatch`.

### 5. Criterio de vitoria com poucos dados

**Problema:** Se uma variante enviou 5 mensagens e 3 responderam (60%), ela vence sobre outra com 100 enviados e 40 respostas (40%)? Taxa de 60% com N=5 nao e estatisticamente significativa.

**Decisao v1 — Threshold minimo simples:** Nao promover automaticamente se qualquer variante tiver menos de 10 recipients enviados. Registrar evento `AB_INSUFFICIENT_DATA` e notificar o usuario para selecao manual. Nao implementar intervalos de confianca ou p-values na v1.

### 6. Limite de variacoes e minimo por variante

**Problema:** Permitir N variacoes ilimitadas complica o split de audiencia (audiencias pequenas) e a UI de comparacao.

**Decisao:**
- Maximo de 5 variacoes (A, B, C, D, E).
- Minimo de 100 recipients por variante de teste. O numero maximo de variacoes e calculado dinamicamente no preview: `floor(audienciaDisponivel / 100)`, com teto em 5.
- Exemplo: 300 contatos → max 3 variacoes. 250 contatos → max 2 variacoes. 500 contatos + 20% remainder → 400 disponíveis para teste → max 4 variacoes.
- O builder mostra em tempo real quantas variacoes sao permitidas com base na audiencia selecionada.
- A UI de metricas usa colunas responsivas (2-5 colunas lado a lado em telas largas, scroll horizontal em mobile).

---

## Abordagens Consideradas

### Approach A: Split Upfront com Modelo Proprio ⭐ Recomendado

- **Como:** `WhatsAppCampaignVariant` ligado a `dispatchGroup`, split no snapshot, cron horario para promocao.
- **Pros:** Determinismo, modelo limpo, reutiliza execucao existente, auditavel.
- **Contras:** Split fixo apos confirmacao; janela de vencedor tem latencia de ate 1h.
- **Esforco:** Medio.

### Approach B: Reuso Puro de dispatchGroups (sem modelo proprio)

- **Como:** Usar campos extras em `dispatchGroup` para marcar variantes, sem novo modelo.
- **Pros:** Menos schema, menos codigo.
- **Contras:** Ambiguidade com grupos por instancia; dificulta queries de metricas por variante.
- **Esforco:** Baixo, mas divida tecnica alta.

### Approach C: Bandit Adaptativo

- **Como:** O sistema ajusta o split em tempo real baseado em performance (ex: aumentar trafego para variante com mais respostas).
- **Pros:** Tecnicamente superior, maximiza conversoes.
- **Contras:** Complexidade muito alta, requer estado mutavel durante execucao, fora do modelo de snapshot imutavel do PRD-017.
- **Esforco:** Muito alto. Fora de escopo da v1.

---

## O Que Ja Esta Bom (pos PRD-017)

- `dispatchGroups` com execucao independente por grupo: reutilizado diretamente.
- Snapshot congelado: garante determinismo do split.
- `WhatsAppCampaignEvent`: audit trail extensivel com novos tipos.
- Cron de dispatch: pattern estabelecido, reutilizado para cron de winner dispatch.
- Attribution de respostas via `metaWamid`: continua funcionando por recipient.

---

## Matriz de Risco

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Audiencias pequenas: split resulta em 0 recipients em variante | Media | Alto | Validar no preview: avisar se variante tiver < 10 recipients |
| Janela expirar com vencedor empate | Baixa | Medio | Desempate por indice (A > B > C), documentado |
| Remainder nao disparado se cron falha | Baixa | Alto | `jobTracker.acquireLock` + retry manual via UI |
| Meta rate limit durante dispatch do remainder | Media | Medio | Mesmo tratamento do cron normal (manter PENDING, retry) |
| Usuario confunde campanha A/B com campanha normal | Alta | Baixo | Badge "A/B" visivel na listagem e no detalhe |

---

## Gaps e Decisoes Deliberadas

### Significancia estatistica fica fora da v1
A v1 mostra numeros absolutos e taxas. Nao calcula p-value nem confidence interval. Usuarios avancados podem calcular externamente. Documentar essa limitacao na UI com tooltip.

### Variacoes com o mesmo template sao permitidas
Um usuario pode criar variante A e B com o mesmo template mas variaveis diferentes (ex: `nome` vs `primeiro_nome`). O sistema nao bloqueia isso.

### Remainder nao tem variante propria
O remainder e enviado com o template do vencedor, nao como uma nova variante. Nao aparece nas metricas de comparacao — e um complemento, nao um competidor.

### Cancelar teste antes do fim da janela
Se usuario cancela a campanha antes da janela expirar, o remainder e descartado e o teste encerrado sem vencedor. Registrar evento `CANCELLED` com `metadata: { abTestAborted: true }`.

---

## Alinhamento com nextjs-feature-dev Conventions

Este PRD segue rigorosamente as patterns do **nextjs-feature-dev skill**:

### ✅ Architecture
- **Domain-organized**: Toda logica em `src/lib/whatsapp/` com subdiretorios: `services/`, `schemas/`, `queries/`, `types/`, `api-client/`
- **Layer separation**: Route handlers thin (10-20 linhas) delegam para services que retornam `Result<T>`
- **Server-first**: Componentes UI sao Server Components por padrao; `'use client'` apenas quando necessario (hooks, eventos, browser APIs)

### ✅ Error Handling
- **Result<T> pattern**: Todos os services retornam `Result<T>` = `{ success, data } | { success, error }`
- **No throwing for business errors**: Erro esperado → `fail('message')`. Erro inesperado → log + return `fail()`
- **Typed errors**: Campo `code?: string` para categorizar tipos de erro

### ✅ Validation
- **Zod em todos os limites**: Route handlers, Server Actions, service inputs
- **Schema location**: `src/lib/whatsapp/schemas/*`, nao espalhado por route handlers
- **Type safety**: Derivar tipos de Zod com `z.infer<typeof Schema>`

### ✅ Logging
- **Structured Pino logging**: Sempre com contexto estruturado `logger.info({ context }, 'message')`
- **Service level**: Log no service layer, nao em route handlers
- **Error objects**: Passar erro como `err` para serializacao correta

### ✅ Caching (Next.js 16)
- **Opt-in**: Nothing cached by default
- **Queries with tags**: `'use cache'` + `cacheTag('ab-metrics-{campaignId}')` + `cacheLife('minutes')`
- **Invalidation**: `revalidateTag()` apos mutacao do vencedor

### ✅ Components
- **Server Components first**: `campaign-ab-metrics.tsx` e Server Component (dados estaticos apos COMPLETED)
- **Client when needed**: `campaign-builder-ab-step.tsx` e `'use client'` pois tem event handlers + state
- **Data fetching**: Buscar em Server Components, passar como props para Client Components
- **TanStack Query**: Apenas para polling em tempo real durante PROCESSING (5s interval)

### ✅ Commits
- **Atomic per task**: Cada task = 1 commit com escopo-focused message
- **Format**: `feat(whatsapp): add A/B testing schema and models` (lowercase, no period)
- **Branch per feature**: `feature/2026-03-25-whatsapp-ab-testing`

### Trade-offs Conscientes

Esta arquitetura prioriza:
1. **Simplicidade** sobre flexibilidade (split upfront, nao adaptativo)
2. **Determinismo** sobre reatividade (latencia 1h no cron aceitavel)
3. **Auditabilidade** sobre concisao (eventos + audit trail completo)
4. **Type safety** sobre codespeed (Zod validation universal)

Estes trade-offs foram avaliados na **Matriz de Risco** e sao aceitaveis para v1.
