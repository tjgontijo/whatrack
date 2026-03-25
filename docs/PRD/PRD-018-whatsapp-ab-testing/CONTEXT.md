# Contexto: WhatsApp Campaign A/B Testing

**Ultima atualizacao:** 2026-03-25
**Depende de:** PRD-017 (WhatsApp Campaign Audience Builder)

---

## Definicao

A/B Testing de campanhas e a capacidade de enviar duas ou mais variacoes de um template WhatsApp para subconjuntos da mesma audiencia, medir qual performa melhor por uma metrica definida, e automaticamente promover o vencedor para o restante dos destinatarios.

Uma campanha A/B e uma campanha normal com `isAbTest = true` e multiplos `dispatchGroups` tipados como variantes. O split de audiencia acontece no momento do snapshot (PRD-017 Task 11), cada variante recebe seus recipients e e processada de forma independente.

---

## Quem Usa

- Times de marketing que querem otimizar abertura e resposta de campanhas.
- Times comerciais que testam abordagens diferentes para leads no mesmo estagio do pipeline.
- Gestores que precisam de dados concretos para decidir qual mensagem usar em campanhas futuras.

---

## Fluxo Atual (pos PRD-017)

Apos PRD-017:

- `/whatsapp/campaigns/new` abre builder em pagina cheia.
- Builder tem etapas: Audiencia → Template → Variaveis → Revisao → Envio.
- Campanha tem exatamente uma variante (um `dispatchGroup`).
- Snapshot e congelado no momento de enviar/agendar.
- Execucao por `BATCH_SIZE = 10` msgs/s, um grupo de cada vez.
- Stats retornam `{ total, sent, delivered, read, responded }` por campanha.

Limitacoes relevantes para A/B:

- Nao existe nocao de "variante" ou "grupo de teste" na UI.
- Split de audiencia entre grupos nao e suportado.
- Metricas sao globais, nao por `dispatchGroup`.
- Nao existe janela de teste nem promocao de vencedor.
- Sem criterio de vitoria definivel pelo usuario.

---

## Regras de Negocio

### Criacao

- Uma campanha A/B tem `isAbTest = true` e entre 2 e 5 variacoes.
- Cada variante tem: label (A, B, C, D, E), template selecionado e percentual do split.
- A soma dos percentuais de todas as variacoes + percentual do remainder deve ser 100%.
- O percentual do remainder e configuravel (ex: 20% para o vencedor, 80% para testar).
- Variacoes sao imutaveis apos o snapshot ser gerado.
- Uma campanha A/B sem `remainderPercent` configurado nao tem auto-promocao.
- **Minimo de 100 recipients por variante de teste.** Se a audiencia for menor que `100 * variantCount`, o builder bloqueia a adicao de mais variacoes e exibe aviso: "Com X contatos elegíveis, voce pode testar no maximo Y templates."
- Exemplo: audiencia de 300 → maximo 3 variacoes (100 cada). Audiencia de 500 e remainder de 20% → 400 para teste, maximo 4 variacoes (100 cada).

### Split de Audiencia

- O split e feito no momento do snapshot (Task 11 do PRD-017), antes do envio.
- A divisao e aleatoria mas deterministica (seed baseado em `campaignId`).
- Cada `WhatsAppCampaignRecipient` recebe `variantId` apontando para sua variante.
- Recipients do remainder ficam com `variantId = null` e `status = 'PENDING_REMAINDER'` ate a promocao do vencedor.
- Deduplicacao continua por telefone normalizado antes do split.

### Janela de Teste

- Configuravel pelo usuario: `4h | 8h | 12h | 24h | 48h`.
- Comeca a contar a partir de `startedAt` da campanha.
- Um cron verifica campanhas A/B com janela expirada a cada hora.
- Ao expirar: verifica criterio de vitoria, seleciona vencedor, dispara remainder.

### Criterio de Vitoria

| Criterio | Logica |
|---|---|
| `RESPONSE_RATE` | Variante com maior `respondedCount / sentCount` |
| `READ_RATE` | Variante com maior `readCount / sentCount` |
| `MANUAL` | Usuario seleciona o vencedor manualmente na UI |

- Em caso de empate: seleciona a variante com menor indice (A antes de B, B antes de C).
- Se nenhuma variante tiver enviados suficientes (< 10% dos recipients): nao promove automaticamente, registra evento `AB_INSUFFICIENT_DATA`.

### Auto-Promocao

- Ao selecionar vencedor: criar novos `WhatsAppCampaignRecipient` para o remainder com `variantId` do vencedor.
- Disparar execucao do grupo remainder com o template da variante vencedora.
- Registrar `WhatsAppCampaignEvent` do tipo `AB_WINNER_SELECTED` com `metadata: { winnerVariantId, criteria, scores }`.
- Registrar `WhatsAppCampaignEvent` do tipo `AB_REMAINDER_DISPATCHED` com `metadata: { recipientCount }`.

### Cancelamento

- Cancelar uma campanha A/B cancela todas as variacoes e o remainder.
- Se o remainder ja estiver em `PROCESSING`, o cancelamento nao o interrompe (comportamento igual a campanha normal).

### Metricas por Variante

- Cada `dispatchGroup` (variante) tem seus proprios contadores: `sentCount`, `deliveredCount`, `readCount`, `respondedCount`, `failCount`.
- Taxa de engajamento = `respondedCount / sentCount`.
- Metricas sao calculadas em tempo real a partir de `WhatsAppCampaignRecipient`.

---

## Dados e Integracoes

### Modelos existentes reutilizados (pos PRD-017)

- `WhatsAppCampaign` — adicionar `isAbTest`, `abTestConfig`
- `WhatsAppCampaignDispatchGroup` — adicionar `variantLabel`, `splitPercent`, `isRemainder`
- `WhatsAppCampaignRecipient` — adicionar `variantId`
- `WhatsAppCampaignEvent` — novos tipos `AB_WINNER_SELECTED`, `AB_REMAINDER_DISPATCHED`, `AB_INSUFFICIENT_DATA`

### Novo modelo

#### `WhatsAppCampaignVariant`

```
id              String   @id
campaignId      String
label           String   -- 'A' | 'B' | 'C'
dispatchGroupId String   @unique
splitPercent    Int      -- percentual desta variante (ex: 40)
isRemainder     Boolean  @default(false)
createdAt       DateTime
```

Campo `abTestConfig` em `WhatsAppCampaign`:

```json
{
  "windowHours": 12,
  "winnerCriteria": "RESPONSE_RATE",
  "remainderPercent": 20,
  "winnerVariantId": null,
  "winnerSelectedAt": null
}
```

### Novos tipos de evento

Adicionar ao enum `WhatsAppCampaignEventType` (PRD-017):

- `AB_WINNER_SELECTED`
- `AB_REMAINDER_DISPATCHED`
- `AB_INSUFFICIENT_DATA`

### APIs internas

- `GET /campaigns/[campaignId]/ab` — retorna config A/B e metricas por variante
- `POST /campaigns/[campaignId]/ab/select-winner` — promocao manual
- `POST /cron/whatsapp/ab-winner-dispatch` — cron de auto-promocao

### APIs externas

- Graph API da Meta para envio do remainder (igual ao fluxo normal de execucao)
- Webhook da Meta para status de entrega dos recipients do remainder

### Caches

- Metricas por variante nao devem ser cacheadas durante `PROCESSING` (leitura direta do banco).
- Podem usar `'use cache'` com `cacheTag` apos campanha `COMPLETED`.

### Permissoes

- Criar campanha A/B: mesmo escopo de criacao de campanhas normais.
- Selecionar vencedor manualmente: mesmo escopo de dispatch.
- Visualizar metricas por variante: leitura — qualquer membro com acesso ao projeto.

---

## Estado Desejado

Quando a feature estiver pronta, o usuario devera conseguir:

- Ativar modo "Teste A/B" no builder de campanha.
- Adicionar 2 ou 3 variacoes, cada uma com template diferente e percentual do split.
- Definir percentual do remainder, janela de teste e criterio de vitoria.
- Enviar ou agendar a campanha: o sistema divide a audiencia automaticamente.
- Acompanhar metricas em tempo real por variante na pagina de detalhe.
- Ver a barra de progresso do teste com tempo restante.
- Ao expirar a janela: ver o vencedor automaticamente selecionado e o remainder disparado.
- Ou selecionar o vencedor manualmente antes da janela expirar.
- Ter audit trail completo de cada decisao via historico de eventos.

---

## Arquitetura de Camadas

Segue padroes do **nextjs-feature-dev**. Cada camada tem responsabilidade clara:

### `src/lib/whatsapp/` (novo codigo PRD-018)

```
src/lib/whatsapp/
├── services/
│   ├── whatsapp-campaign-ab.service.ts
│   │   └── createAbTestVariants()        // Result<{ variants, remainderGroupId }>
│   │   └── splitAudienceForAbTest()      // Result<{ splitSummary }>
│   │   └── selectWinner()                // Result<void>
│   │   └── autoSelectWinner()            // Result<{ selected, variantId? }>
│   └── whatsapp-campaign-ab-metrics.service.ts
│       └── getAbTestMetrics()            // Result<MetricsByVariant[]>
│       └── getAbTestLeader()             // Result<variantId | null>
├── schemas/
│   └── whatsapp-ab-schemas.ts
│       └── AbTestVariantSchema
│       └── AbTestConfigSchema
│       └── AbTestCreateSchema
│       └── AbTestSelectWinnerSchema
│       └── AbTestMetricsQuerySchema
├── queries/
│   └── get-ab-campaign.query.ts          // Zod-validated fetch
└── types/
    └── whatsapp-campaign-ab.types.ts
```

**Responsabilidades:**
- **`services/*`** — Toda logica de negocio. Retornam `Result<T>`. Log via Pino com contexto.
- **`schemas/*`** — Zod validation para inputs e outputs. Localizados com dominio.
- **`queries/*`** — Fetches de dados em Server Components. Podem usar `'use cache'` + `cacheTag`.
- **`types/*`** — TypeScript types derivados de Zod ou dominio.

### `src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/`

**Thin route handlers (10-20 linhas):**
```typescript
// GET /campaigns/[campaignId]/ab
// 1. Extract + validate params
// 2. Call service
// 3. Return JSON

// POST /campaigns/[campaignId]/ab/select-winner
// 1. Parse + validate body com Zod
// 2. Authenticate + authorize
// 3. Call service
// 4. Return Result
```

### `src/app/api/v1/cron/whatsapp/ab-winner-dispatch/route.ts`

- Protegido por `authorizeCronRequest`
- Usa `jobTracker.acquireLock('whatsapp-ab-winner-dispatch')` para idempotencia
- Busca campanhas A/B com janela expirada
- Chama `autoSelectWinner()` para cada uma
- Logging via Pino com contexto

### `src/components/dashboard/whatsapp/campaigns/`

**Server-first approach:**
- **`campaign-ab-metrics.tsx`**: Server Component apos COMPLETED (dados estaticos + `'use cache'`)
  - Durante PROCESSING: Client Component com TanStack Query polling (5s interval)
  - Renderiza tabela de metricas por variante

- **`campaign-builder-ab-step.tsx`**: `'use client'` (interativo)
  - State: variacoes, split percentuais, janela, criterio
  - Event handlers: adicionar variante, remover, atualizar percentual
  - Validacao de regras: minimo 100 recipients, sum = 100%
  - UI: inputs para template, percentual; badge "A/B"
