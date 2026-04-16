# Notas de Migração: Billing Novo

## Premissa

Não há clientes ativos que precisem ser preservados no modelo atual. Isso permite uma troca direta de arquitetura.

O objetivo não é migrar Stripe para Asaas com convivência longa. O objetivo é remover o desenho antigo e subir o novo fluxo do zero.

---

## Estratégia

### 1. Hard switch para Asaas

O novo billing deve assumir:

- um único provider
- um único modelo de checkout
- um único conjunto de tabelas
- configuração via `.env`, no mesmo padrão do `kadernim`

Não vale manter:

- abstração por provider
- rotas antigas por compatibilidade
- fields de Stripe sem uso no runtime novo
- credenciais de billing persistidas em banco
- API administrativa para editar chaves do Asaas

### 2. Trocar o modelo de dados inteiro

O modelo atual do Whatrack gira em torno de:

- `BillingSubscription`
- `BillingSubscriptionItem`
- `BillingPlan`
- `BillingWebhookLog`
- `BillingPlanHistory`

O modelo-alvo do MVP passa a ser:

- `BillingPlan`
- `BillingOffer`
- `BillingSubscription`
- `BillingInvoice`
- `BillingAuditLog`

Com estas regras de oferta:

- `monthly`: cartão ou `PIX_AUTOMATIC`
- `annual`: cartão ou `PIX`

### 3. Adaptar o padrão do Kadernim ao domínio de organização

No `kadernim`, o eixo da cobrança é o `user`.

No Whatrack, o eixo deve ser a `organization`.

Então a migração precisa garantir:

- `organizationId` em subscription
- `organizationId` em invoice
- associação do customer Asaas ao contexto de cobrança da organização

---

## Remoções Esperadas

### Código

- `src/lib/billing/providers/`
- `src/services/billing/billing-plan-stripe-sync.service.ts`
- `src/services/billing/handlers/stripe-webhook.handler.ts`
- rotas de portal Stripe
- hooks, schemas e componentes que existem apenas para o desenho antigo

### Schema

- `BillingSubscriptionItem`
- `BillingWebhookLog`
- `BillingPlanHistory`
- colunas Stripe-only de `BillingPlan`
- colunas Stripe-only de `BillingSubscription`

Se for mais simples tecnicamente, pode recriar as tabelas de billing em vez de tentar fazer migration cirúrgica.

---

## Ordem Recomendada

### Passo 1: congelar o billing atual

- desabilitar novos acoplamentos ao Stripe
- parar de expandir o modelo de add-ons

### Passo 2: remodelar o banco

- criar novo schema de billing
- criar seeds de `monthly` e `annual`
- criar seeds das ofertas por método, incluindo `PIX_AUTOMATIC` no mensal

### Passo 3: subir a integração Asaas

- config
- client
- customer
- payment
- checkout
- webhook
- leitura de `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `WALLET_ASAAS_ID` e `ASAAS_WEBHOOK_TOKEN` via env

### Passo 4: ligar a UI nova

- checkout transparente
- cartão como opção padrão
- fluxo de autorização PIX Automático
- QR Code PIX
- status da assinatura

### Passo 5: remover o que sobrou do legado

- serviços antigos
- rotas antigas
- componentes antigos
- testes que validam o comportamento legado

---

## Migrations de Banco

### Resultado esperado

```text
billing_plan
billing_offer
billing_subscription
billing_invoice
billing_audit_log
```

### Observação

Como o billing atual ainda não sustenta clientes ativos, a migration pode priorizar clareza do schema em vez de retrocompatibilidade.

---

## Checklist de Go-Live

- [ ] Stripe removido do runtime de billing
- [ ] Asaas configurado em sandbox
- [ ] webhook autenticado funcionando
- [ ] checkout cartão funcionando como fluxo principal
- [ ] checkout PIX Automático funcionando
- [ ] checkout PIX anual funcionando
- [ ] subscription ativando por webhook
- [ ] telas novas conectadas ao backend novo

---

## Regra de Decisão

Se surgir dúvida entre:

- preservar o desenho antigo
- ou aproximar o Whatrack do modelo já validado no `kadernim`

a decisão correta para este MVP é aproximar do `kadernim` e cortar escopo.
