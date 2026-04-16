# Tarefas: Billing Simplification

## Fase 1: Limpeza e Modelo

### Remoção de acoplamento com Stripe

- [ ] Remover `providerRegistry` e abstrações de provider que só existem para Stripe
- [ ] Remover rota `POST /api/v1/billing/webhooks/stripe`
- [ ] Remover `POST /api/v1/billing/portal`
- [ ] Remover sync administrativo de plano com Stripe
- [ ] Remover campos e fluxos que dependem de `stripeSubscriptionItemId`, `stripeProductId` e `stripePriceId`

### Redesenho do schema

- [ ] Remodelar `BillingPlan` para o formato `monthly | annual`
- [ ] Criar `BillingOffer`
- [ ] Remodelar `BillingSubscription` para o formato Asaas-first
- [ ] Criar `BillingInvoice`
- [ ] Criar `BillingAuditLog`
- [ ] Remover `BillingSubscriptionItem`
- [ ] Remover `BillingWebhookLog`
- [ ] Remover `BillingPlanHistory` do escopo do MVP

### Seeds mínimos

- [ ] Seed de plano `monthly`
- [ ] Seed de plano `annual`
- [ ] Seed de ofertas `monthly_credit_card`, `monthly_pix_automatic`, `annual_credit_card`, `annual_pix`

**Entregável:** domínio de billing reduzido ao modelo do `kadernim`, adaptado para `organization`

---

## Fase 2: Core Asaas

### Configuração

- [ ] Criar `asaas-config.service`
- [ ] Ler configuração exclusivamente de env, como no `kadernim`
- [ ] Validar ambiente `sandbox` e `production`
- [ ] Configurar `ASAAS_BASE_URL`
- [ ] Configurar `ASAAS_API_KEY`
- [ ] Configurar `WALLET_ASAAS_ID`
- [ ] Configurar `ASAAS_WEBHOOK_TOKEN`
- [ ] Garantir uso de `NEXT_PUBLIC_APP_URL` nos links gerados pelo billing
- [ ] Não persistir credenciais do Asaas em banco
- [ ] Não expor endpoint de escrita para configuração do Asaas

### Serviços

- [ ] Criar `asaas-client.ts`
- [ ] Criar `customer.service.ts`
- [ ] Criar `catalog.service.ts`
- [ ] Criar `payment.service.ts`
- [ ] Criar `pix-automatic.service.ts`
- [ ] Criar `checkout.service.ts`
- [ ] Criar `webhook.handler.ts`
- [ ] Criar `audit.service.ts` para idempotência de eventos

### Regras do checkout

- [ ] Validar `cpfCnpj`
- [ ] Validar `paymentMethod` (`PIX_AUTOMATIC`, `PIX` ou `CREDIT_CARD`)
- [ ] Definir `CREDIT_CARD` como método padrão do checkout
- [ ] Permitir `PIX_AUTOMATIC` apenas no `monthly`
- [ ] Permitir `PIX` manual apenas no `annual`
- [ ] Exigir dados de cartão apenas quando necessário
- [ ] Repassar `remoteIp` quando aplicável
- [ ] Garantir que nenhum log armazene dados sensíveis do cartão

**Entregável:** integração Asaas funcional em nível de serviço

---

## Fase 3: APIs do MVP

### Checkout

- [ ] `POST /api/v1/billing/checkout`
  - body com plano, método, CPF/CNPJ e dados de cartão quando necessário
  - retorna payload de autorização PIX Automático, QR Code PIX anual ou status inicial do cartão

### Webhook

- [ ] `POST /api/v1/billing/webhook`
  - valida `asaas-access-token`
  - usa idempotência por `asaasEventId`
  - atualiza `invoice`
  - ativa `subscription`
  - trata eventos de `PIX_AUTOMATIC`

### Status

- [ ] `GET /api/v1/billing/subscription`
- [ ] `GET /api/v1/billing/checkout/:invoiceId/status`
- [ ] `GET /api/v1/billing/pix-automatic/:authorizationId/status`
- [ ] Implementar `statusToken` para polling seguro quando fizer sentido

**Entregável:** API completa para o fluxo inicial de cobrança

---

## Fase 4: UI do Checkout

### Tela principal

- [ ] Redesenhar a área de billing para o novo catálogo
- [ ] Mostrar apenas `monthly` e `annual`
- [ ] Mostrar cartão e `PIX Automático` no `monthly`
- [ ] Mostrar cartão e `PIX` no `annual`
- [ ] Abrir checkout com cartão selecionado
- [ ] Dar destaque visual principal para cartão

### Checkout transparente

- [ ] Formulário com dados de cobrança
- [ ] Formulário de cartão dentro do app
- [ ] Resumo de valor
- [ ] Tratamento claro de erro

### PIX

- [ ] Tela de autorização PIX Automático
- [ ] Indicador de status da autorização
- [ ] Polling de status da autorização

### PIX anual

- [ ] Tela de QR Code
- [ ] Copia e cola
- [ ] Indicador de validade
- [ ] Polling de status

### Pós-checkout

- [ ] Tela de sucesso/pendência
- [ ] Status da assinatura atual
- [ ] Histórico mínimo de cobrança, se já estiver disponível

**Entregável:** fluxo visual completo de checkout transparente

---

## Fase 5: Go-Live

- [ ] Testar cartão mensal em sandbox
- [ ] Testar cartão anual em sandbox
- [ ] Testar PIX Automático em sandbox
- [ ] Testar PIX anual em sandbox
- [ ] Testar duplicidade de webhook
- [ ] Testar falha de autorização PIX Automático
- [ ] Testar cobrança vencida
- [ ] Rodar smoke test em staging
- [ ] Fazer primeiro pagamento real controlado
- [ ] Monitorar logs e erros de webhook

**Entregável:** billing Asaas do MVP em produção

### Prioridade de rollout

- [ ] Tratar cartão de crédito como critério principal de aceite
- [ ] Tratar PIX Automático como critério secundário de aceite
- [ ] Tratar PIX anual como critério complementar de aceite

---

## Fora Deste Backlog

- [ ] Não implementar `PIX` manual no plano mensal
- [ ] Não implementar boleto
- [ ] Não implementar portal self-serve
- [ ] Não implementar upgrade/downgrade
- [ ] Não implementar quotas por projeto no billing
- [ ] Não implementar matriz comercial `Starter / Growth / Pro / Enterprise`
