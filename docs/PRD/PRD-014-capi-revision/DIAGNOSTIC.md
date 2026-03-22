# DIAGNOSTIC — PRD-014: Revisão do CAPI

## Problemas Identificados

### D1 — Payload incompleto causa rejeição silenciosa pela Meta

**Impacto:** Alto
**Tipo:** Bug de integração

A Meta aceita a requisição HTTP (status 200) mesmo com campos ausentes, mas os eventos são descartados ou mal classificados no Gerenciador de Eventos. O resultado é: o sistema acha que está enviando conversões, mas a Meta não está otimizando com base nelas.

Campos ausentes confirmados contra a documentação oficial:

| Campo | Impacto da ausência |
|---|---|
| `messaging_channel` | Evento pode ser classificado incorretamente (não como WhatsApp) |
| `whatsapp_business_account_id` | `user_data` incompleto — matching de audiência degradado |
| `partner_agent` | Meta não consegue identificar o parceiro para suporte e diagnóstico |
| `event_source_url: ""` | Campo inválido quando vazio — pode gerar warning no Event Match Quality |

### D2 — Mapeamento por nome de stage é frágil e não documentado

**Impacto:** Alto
**Tipo:** Bug de produto

`getCapiEventForStage()` usa busca por substring no nome do stage. Um cliente que nomeia seu stage "Proposta Enviada" (em vez de "Qualificado") não dispara nenhum evento. Um cliente que nomeia "Venda Cancelada" (contém "venda") dispara `Purchase` erroneamente.

Não há nenhuma UI ou documentação que informe ao usuário que o nome do stage afeta os eventos CAPI. A falha é invisível.

**Evidências no código:**
```typescript
if (name.includes('qualificado') || name.includes('qualified')) return 'LeadSubmitted'
if (name.includes('venda') || name.includes('pago') || name.includes('ganho') || name.includes('won'))
  return 'Purchase'
```

### D3 — Bug de sobrescrita com múltiplos pixels

**Impacto:** Médio
**Tipo:** Bug de dado

Com 2 pixels ativos no mesmo projeto, o segundo `upsert` sobrescreve o primeiro. O log final mostra apenas o resultado do último pixel — perdendo rastreabilidade de qual pixel falhou e qual teve sucesso.

**Comentário no próprio código confirma o bug:**
```typescript
// NOTE: unique constraint may fail if multiple pixels send same eventName,
// but it currently overwrites
```

### D4 — closeTicket() não dispara nenhum evento CAPI

**Impacto:** Alto
**Tipo:** Feature ausente

Fechar um ticket como ganho é o evento de maior valor para otimização de anúncios. Hoje isso só acontece se o stage tiver o nome correto (D2). Um ticket fechado manualmente como "ganho" sem passar por um stage com nome "venda" nunca envia `Purchase`.

## Riscos

### R1 — Deduplicação de Purchase por stage + closeTicket()

Se o usuário configurar um stage com `capiEvent = 'Purchase'` E fechar o ticket como ganho, o evento `Purchase` será disparado duas vezes com o mesmo `eventId` (`purchase-{ticketId}`). A Meta deduplicará automaticamente pelo `event_id` — sem impacto negativo. Mas o `MetaConversionEvent` no banco registrará dois upserts (um por pixel por gatilho), o que é o comportamento esperado.

### R2 — Migração da unique constraint

A troca de `@@unique([ticketId, eventName])` para `@@unique([ticketId, eventName, pixelId])` afeta registros existentes. Registros existentes têm `pixelId = null`. A nova constraint `(ticketId, eventName, null)` é tratada pelo PostgreSQL como `(ticketId, eventName, NULL)` — nulls são considerados distintos em constraints únicas no Postgres, mas o Prisma usa `IS NOT DISTINCT FROM` no upsert. Verificar o SQL gerado pela migration para confirmar que não há conflito.

**Mitigação:** Revisar o SQL da migration antes de aplicar em produção.

### R3 — wabaId ausente em pixels existentes

Pixels já cadastrados não terão `wabaId`. O payload será enviado sem `whatsapp_business_account_id` — comportamento degradado, mas não quebrado. O serviço já trata com `...(pixel.wabaId && {...})`. Usuários com pixels existentes precisarão editar o pixel e adicionar o WABA ID manualmente.

**Mitigação:** Considerar um aviso na UI de configuração de pixel quando `wabaId` estiver vazio.

### R4 — capiEvent como string no banco vs. tipo TypeScript

`capiEvent` é `String?` no Prisma — não há enum no banco. Valores inválidos podem ser inseridos diretamente no banco sem validação. A proteção é feita apenas pelo schema Zod na API. O cast `as CapiEventName` no service é seguro em produção normal, mas frágil em caso de manipulação direta do banco.

**Mitigação:** Aceitar o risco por ora. Se necessário no futuro, adicionar enum Prisma.
