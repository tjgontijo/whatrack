# PRD: Billing Overage Execution

## Objetivo

Transformar o excedente de eventos em cobrança real e auditável, saindo do estado atual de “tracking e aviso visual” para um fluxo confiável de medição, fechamento de ciclo, criação de cobrança e reconciliação com Stripe.

## Diagnóstico Real

Hoje o domínio de overage está pela metade:

- o plano tem `overagePricePerEvent`
- a assinatura tem `eventLimitPerMonth`
- o metering incrementa uso
- a UI exibe overage

Mas a cobrança real não existe.

## Estado Confirmado no Código

### Já existe

- campos de limite e excedente no schema:
  - `BillingSubscription.eventLimitPerMonth`
  - `BillingSubscription.overagePricePerEvent`
  - `BillingEventUsage.chargedAmount`
- serviço de metering:
  - `src/services/billing/billing-metering.service.ts`
- endpoint de uso:
  - `src/app/api/v1/billing/usage/route.ts`
- endpoint de gravação de eventos:
  - `src/app/api/v1/billing/events/route.ts`
- UI de usage:
  - `src/components/dashboard/billing/usage-progress.tsx`

### Gaps críticos

1. `chargedAmount` ainda fica zerado
2. o ciclo é resetado sem etapa de cobrança
3. o sistema não cria `invoice item` nem qualquer equivalente na Stripe
4. `externalId` ainda não protege contra duplicidade
5. não existe ledger de fechamento de ciclo
6. a documentação atual promete mais do que o código entrega

## Decisão de Produto

Para a V1 de Stripe:

- o overage será calculado localmente no app
- a cobrança será feita por `invoice item` na Stripe antes da renovação
- trial de 7 dias não gera cobrança de overage
- não vamos usar Stripe metered billing nativo nesta fase

Motivo:

- menor diff
- menor dependência operacional no request path
- mantém o app como fonte do metering de eventos

## Escopo

### Entra nesta iniciativa

1. deduplicação de eventos de billing
2. consolidação de uso por ciclo
3. fechamento de ciclo com cálculo de excedente
4. criação de invoice item na Stripe
5. persistência de ledger de cobrança de excedente
6. cron de fechamento/reconciliação
7. UI e docs coerentes com o que realmente é cobrado

### Fica fora desta iniciativa

- Stripe Usage Billing nativo
- billing por múltiplas métricas
- precificação avançada por faixas
- descontos e cupons sobre overage

## Arquitetura Alvo

### Modelo de medição

Cada evento faturável deve ser:

- gravado uma única vez
- associado à assinatura e ao ciclo
- marcado como dentro do limite ou excedente

### Fechamento de ciclo

No fechamento:

1. localizar assinaturas com `nextResetDate <= now`
2. calcular `overage = max(0, used - limit)`
3. calcular `amount = overage * overagePricePerEvent`
4. se a assinatura estiver em trial, não criar invoice item
5. se `amount > 0`, criar invoice item na Stripe
6. persistir ledger do closeout
7. só então resetar ciclo

### Ledger

Adicionar entidade explícita de fechamento de ciclo, por exemplo:

- `BillingCycleCloseout`

Campos mínimos:

- `subscriptionId`
- `cycleStartDate`
- `cycleEndDate`
- `eventsUsed`
- `eventLimit`
- `overageEvents`
- `unitPrice`
- `amountCharged`
- `stripeInvoiceItemId`
- `status`
- `processedAt`

Sem ledger, não existe auditoria séria do overage.

### Cron

Criar rota oficial de fechamento:

- `POST /api/v1/cron/billing/close-cycles`

Essa rota deve:

- autenticar por `CRON_SECRET`
- delegar ao service de fechamento
- processar múltiplas assinaturas com idempotência

## Mudanças Técnicas Necessárias

### 1. Fechar idempotência do metering

Revisar:

- `src/services/billing/billing-metering.service.ts`
- `src/app/api/v1/billing/events/route.ts`
- schema relacionado

Objetivo:

- `externalId` deixar de ser decorativo
- impedir dupla cobrança por evento duplicado

### 2. Criar service de closeout

Criar:

- `src/services/billing/billing-overage-closeout.service.ts`

Responsabilidades:

- buscar ciclos vencidos
- calcular overage
- criar invoice item
- registrar ledger
- resetar ciclo após sucesso

### 3. Criar cron oficial

Criar:

- `src/app/api/v1/cron/billing/close-cycles/route.ts`

### 4. Ajustar webhook/reconciliação

Revisar:

- webhook Stripe
- retry/reconciliation de cobrança

Objetivo:

- lidar com falha temporária na criação de invoice item
- não perder closeout em caso de erro parcial

### 5. Corrigir UI e docs

Revisar:

- `src/components/dashboard/billing/usage-progress.tsx`
- `docs/STRIPE_SETUP_GUIDE.md`

Objetivo:

- só prometer cobrança do excedente quando ela existir

## Critérios de Aceite

- evento faturável duplicado não incrementa uso duas vezes
- assinatura acima do limite gera cálculo de overage correto
- assinatura em trial não gera cobrança de overage
- fechamento de ciclo cria invoice item quando necessário
- reset de ciclo só acontece depois da persistência do closeout
- ledger permite auditoria por assinatura e ciclo
- UI deixa de mentir sobre cobrança inexistente

## Dependências

- `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`
- `15_PRD_BILLING_PLANS_CRUD.md` para catálogo estável de preço/limites

## Riscos

- cobrança duplicada se não houver idempotência de closeout
- perda de cobrança se o reset ocorrer antes do closeout
- reconciliação ruim se o ledger não existir
