# Diagnóstico Técnico: Billing Simplification

## Decisões Técnicas

### 1. Reusar o desenho do Kadernim

O caminho escolhido não é redesenhar billing do zero. É trazer para o Whatrack o padrão que já existe no `kadernim` e adaptar o domínio de `user` para `organization`.

O que será reaproveitado conceitualmente:

- `BillingPlan`
- `BillingOffer`
- `Subscription`
- `Invoice`
- `AuditLog`
- `AsaasClient`
- `CheckoutService`
- `PaymentService`
- `WebhookHandler`
- polling de status via `statusToken`

### 2. Asaas como provider único

O MVP deixa de ser provider-agnostic.

Isso elimina:

- registry de providers
- abstração prematura
- sync com Stripe
- portal de billing do Stripe
- manutenção paralela de fluxos

Configuração do Asaas também deve seguir esse corte de simplicidade:

- sem settings persistidos em banco
- sem painel admin para editar credenciais
- leitura direta de env, como no `kadernim`
- chaves esperadas: `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `WALLET_ASAAS_ID`, `ASAAS_WEBHOOK_TOKEN`

### 3. Arquitetura invoice-first

Assim como no `kadernim`, o modelo gira em torno de cobrança e não de `subscription items`.

Resumo:

- `BillingPlan` define o ciclo
- `BillingOffer` define o preço por método
- `BillingSubscription` representa o vínculo local da organização com o produto
- `BillingInvoice` representa cada cobrança gerada

Isso casa melhor com o Asaas e reduz bastante a complexidade do desenho atual.

### 4. PIX Automático no mensal e PIX manual no anual

O catálogo do MVP deve respeitar esta matriz:

- `monthly`: `CREDIT_CARD` ou `PIX_AUTOMATIC`
- `annual`: `CREDIT_CARD` ou `PIX`

Isso preserva o diferencial brasileiro que interessa no produto sem reabrir o escopo de múltiplos caminhos redundantes no mensal.

### 5. Cartão como fluxo principal

O MVP deve ser desenhado, testado e monitorado com prioridade para cartão de crédito.

Na prática:

- checkout inicia com cartão selecionado
- smoke tests obrigatórios passam primeiro pelo cartão
- go-live não depende de maturidade idêntica entre cartão e PIX

### 6. Checkout transparente de cartão, PIX Automático e PIX

O frontend coleta os dados do checkout e o backend chama o Asaas diretamente.

Consequências técnicas:

- não pode logar número de cartão, CCV ou payload sensível
- validação de payload deve acontecer antes da chamada externa
- `remoteIp` precisa ser repassado quando exigido pelo fluxo do cartão
- a revisão do fluxo de compliance do provedor é pré-requisito de produção

### Configuração via env

O padrão de configuração deve copiar o `kadernim`:

```text
ASAAS_BASE_URL
ASAAS_API_KEY
WALLET_ASAAS_ID
ASAAS_WEBHOOK_TOKEN
NEXT_PUBLIC_APP_URL
```

Isso implica:

- `asaas-config.service` existe apenas como leitura e normalização do env
- qualquer tentativa de edição por API deve ser tratada como fora de escopo

### 7. Webhook como fonte de verdade

O frontend pode receber um status inicial, mas a confirmação final do pagamento deve vir do webhook.

Evento mínimo esperado no MVP:

- `PAYMENT_RECEIVED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_REFUNDED`
- eventos de atraso relevantes para marcar `OVERDUE`
- `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED`
- `PIX_AUTOMATIC_AUTHORIZATION_AUTHORIZED`
- `PIX_AUTOMATIC_AUTHORIZATION_AUTHORIZED_AND_CONFIRMED`
- `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED`
- eventos de falha de autorização e débito recorrente

### 8. Idempotência via audit log

O modelo do `kadernim` usa `BillingAuditLog` para deduplicar eventos por `asaasEventId`.

Exemplo:

```ts
const isDuplicate = await BillingAuditService.isDuplicate(eventId)
if (isDuplicate) {
  return { status: 'ignored' }
}
```

Esse padrão substitui o `billing_webhook_logs` atual e simplifica o processamento.

---

## Adaptação para o Whatrack

### Mudança principal

No `kadernim`, a cobrança está ancorada em `user`.

No Whatrack, a cobrança precisa estar ancorada em `organization`.

Logo:

- `BillingSubscription.organizationId` é obrigatório e único
- `BillingInvoice.organizationId` é obrigatório
- a resolução do customer do Asaas deve usar os dados de cobrança da organização

### Decisão de storage do customer

Para o MVP, o caminho mais simples é persistir `asaasCustomerId` junto da subscription local ou em campo específico ligado ao domínio da organização.

O importante é evitar:

- lookup duplicado no Asaas a cada checkout
- múltiplos customers para a mesma organização

### Decisão para falhas de PIX Automático

Como o usuário definiu que `PIX` manual só entra no anual, falhas de `PIX_AUTOMATIC` no mensal não devem cair automaticamente para QR Code manual como caminho padrão do MVP.

O comportamento esperado é:

- marcar a subscription com falha
- expor o estado para o usuário
- permitir nova autorização de PIX Automático ou troca para cartão

---

## Riscos e Mitigações

### Risco 1: checkout transparente de cartão

**Problema:** o fluxo é mais sensível do que redirecionamento para checkout hospedado.

**Mitigação:**

- nunca persistir dados brutos do cartão
- nunca logar payload do cartão
- validar payload no backend antes de chamar o Asaas
- revisar o fluxo habilitado no Asaas antes de produção

### Risco 2: cartão não receber prioridade suficiente no rollout

**Problema:** o escopo com PIX Automático pode puxar atenção demais e atrasar a modalidade principal.

**Mitigação:**

- tratar cartão como caminho default do checkout
- ordenar backlog e QA com cartão primeiro
- considerar PIX Automático como opção secundária do mensal

### Risco 3: legado Stripe ainda espalhado no app

**Problema:** o repositório atual tem schema, services, rotas e UI acoplados ao Stripe.

**Mitigação:**

- remover provider abstraction
- remover webhook Stripe
- remover portal Stripe
- remover sync de plano com Stripe
- revisar páginas e hooks que assumem `providerSubscriptionId`

### Risco 4: falha no PIX Automático

**Problema:** autorização pode expirar, ser negada ou ter débito recorrente recusado.

**Mitigação:**

- persistir `pixAutomaticAuthId`, `failureReason`, `failureCount` e timestamps
- mapear eventos de falha do Asaas para estado local
- permitir reautorização do PIX Automático
- oferecer troca para cartão quando necessário

### Risco 5: PRD anterior abria escopo comercial cedo demais

**Problema:** quotas, tiers, upgrade, downgrade e pricing completo atrasam a entrada do billing novo.

**Mitigação:**

- lançar primeiro o core de cobrança
- decidir empacotamento comercial depois, em cima de um stack já funcionando

---

## Estratégia de Implementação

### Camada 1: domínio

- novos modelos e enums
- seeds para `monthly` e `annual`
- seeds para ofertas de `PIX_AUTOMATIC`, `PIX` e `CREDIT_CARD`

### Camada 2: integração Asaas

- `asaas-config`
- `asaas-client`
- `customer.service`
- `catalog.service`
- `payment.service`
- `checkout.service`

### Camada 3: runtime

- rota de checkout
- rota de webhook
- consulta de status da cobrança
- consulta de status da autorização PIX Automático
- leitura de subscription ativa

### Camada 4: UX

- formulário transparente
- status da autorização PIX Automático
- QR Code PIX
- tela de confirmação
- status da assinatura

---

## Testes Necessários

### Fluxos críticos

1. cartão mensal: checkout -> criação de subscription -> webhook -> ativação
2. cartão anual: checkout -> cobrança única -> webhook -> ativação
3. PIX Automático mensal: checkout -> autorização -> webhook -> ativação
4. PIX anual: checkout -> QR Code -> webhook -> ativação
5. webhook duplicado: evento repetido não muda estado duas vezes
6. falha de PIX Automático: webhook -> atualização de estado

### Testes de contrato

- schema de request do checkout
- schema de resposta do checkout
- mapeamento de status Asaas -> status local
- verificação de `statusToken`

---

## Resultado Esperado

Ao final desta revisão, o billing do Whatrack deve ficar conceitualmente assim:

```text
Checkout transparente -> Asaas -> Invoice local -> Webhook -> Subscription ativa
```

Sem Stripe, sem add-ons automáticos e sem tiers complexos, mas com `PIX_AUTOMATIC` preservado no mensal e `PIX` manual restrito ao anual.
