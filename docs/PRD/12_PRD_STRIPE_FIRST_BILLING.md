# PRD: Stripe-First Billing Migration

## Objetivo

Migrar o billing do Whatrack para `Stripe` como provider oficial, usando apenas cartão como método de cobrança e deixando a arquitetura preparada para um futuro segundo provider, com `Polar` como opção potencial.

## Decisão de Produto

Decisões fechadas para esta frente:

- o método oficial de cobrança será `cartão`
- a `Stripe` passa a ser o provider oficial do produto
- o provider legado sai do plano ativo de billing
- `Polar` pode entrar no futuro como segundo provider, mas não faz parte desta implementação
- o produto não vai expor múltiplos checkouts para o usuário escolher
- a UI e o suporte devem refletir uma única verdade operacional: o checkout principal é Stripe

## Motivo da Migração

O estado anterior do billing estava funcional, mas estruturalmente frágil para um SaaS recorrente:

- o fluxo atual força recorrência em cima de `MULTIPLE_PAYMENTS`
- o cancelamento não existe formalmente no provider usado hoje
- o webhook real já mostrou divergência de assinatura, payload e status
- o lifecycle de assinatura fica mais dependente de heurística local do que do contrato do provider

Para cobrança recorrente em cartão, a Stripe oferece um contrato muito mais adequado:

- checkout maduro para assinatura
- lifecycle real de subscription
- cancelamento no provider
- troca de plano no provider
- customer portal pronto
- documentação e ecossistema mais previsíveis

## Estado Implementado Hoje

A base atual do domínio já reduz o custo de migração:

- interface agnóstica em `src/lib/billing/providers/providers/billing-provider.ts`
- registry de providers em `src/lib/billing/providers/providers/provider-registry.ts`
- bootstrap de providers em `src/lib/billing/providers/init.ts`
- checkout centralizado em `src/services/billing/billing-checkout.service.ts`
- assinatura centralizada em `src/services/billing/billing-subscription.service.ts`
- rotas de billing já separadas em `src/app/api/v1/billing/*`

Hoje, a base já está migrando para Stripe, mas ainda exige limpeza final de runtime, env e documentação para ficar coerente com um único provider oficial.

## Resultado Esperado

Ao final desta migração:

- o checkout do app usa Stripe como única verdade operacional
- a assinatura local reflete o lifecycle real da Stripe
- cancelamento e mudança de plano passam a existir no provider
- o dashboard mostra links e estados coerentes com Stripe
- o modelo comercial alvo passa a ser base + add-ons operacionais
- a arquitetura continua preparada para um futuro segundo provider

## Modelo Comercial Alvo

O desenho alvo de billing na Stripe deve suportar:

- item base recorrente do produto
- add-on por projeto adicional
- add-on por numero de WhatsApp adicional
- add-on por conta Meta Ads adicional

Os limites de conversoes e creditos continuam sendo controlados pelo app por `projectId`, nao pela Stripe.

## Escopo

Entra nesta iniciativa:

- implementação do `StripePaymentProvider`
- seleção de provider ativo por ambiente/config
- webhook próprio da Stripe
- criação de sessão de checkout para assinatura
- leitura de assinatura real na Stripe
- cancelamento no provider
- suporte a upgrade/downgrade via provider
- customer portal ou deep link oficial para gestão de cobrança
- ajuste da UI de billing para Stripe-first
- documentação operacional nova de billing
- remoção do provider legado do fluxo ativo do produto

Fica fora desta fase:

- múltiplos métodos de pagamento além de cartão
- exposição de escolha manual de provider no produto
- implementação de `Polar`
- múltiplos providers em produção ao mesmo tempo
- billing multi-moeda

## Arquitetura Alvo

### Provider principal

- `stripe` será o provider ativo
- o `provider-registry` continua existindo para preservar a arquitetura extensível
- o segundo provider futuro, se existir, será tratado como nova frente e não como fallback desta migração

### Rotas de webhook

O contrato alvo deve deixar de ser um webhook único genérico e passar a ter webhook específico da Stripe:

- `POST /api/v1/billing/webhooks/stripe`

Motivo:

- Stripe tem autenticação, payload e lifecycle próprios
- manter o webhook genérico aumenta branching e risco operacional
- a separação por provider simplifica suporte, testes e observabilidade

### Lifecycle alvo da assinatura local

A model local continua existindo, mas passa a ser espelho do provider prioritário:

- checkout cria/atualiza assinatura local em estado transitório
- webhook Stripe consolida `status`, `period start`, `period end` e `cancel at period end`
- billing no app deixa de inventar estados que o provider não sustenta

## Mudanças Técnicas Necessárias

### 1. Implementar provider Stripe

Criar:

- `src/lib/billing/providers/providers/stripe-provider.ts`

Responsabilidades:

- criar checkout session de subscription
- consultar subscription real
- cancelar imediatamente ou no fim do período
- atualizar plano
- devolver contrato compatível com `PaymentProvider`

### 2. Tornar o provider ativo configurável

Ajustar:

- `src/lib/billing/providers/init.ts`

Objetivo:

- registrar `stripe`
- manter o bootstrap preparado para um segundo provider no futuro sem amarrar o domínio à Stripe

Contrato alvo:

- `ACTIVE_PAYMENT_PROVIDER=stripe`
- `Polar` só entra quando houver nova decisão explícita de produto

### 3. Criar webhook Stripe dedicado

Criar:

- `src/app/api/v1/billing/webhooks/stripe/route.ts`

Responsabilidades:

- validar assinatura oficial da Stripe
- normalizar eventos relevantes
- delegar para handler/service Stripe
- atualizar assinatura local e logs

Eventos mínimos da V1:

- ativação de assinatura
- renovação
- falha de pagamento
- cancelamento
- mudança de plano

### 4. Atualizar serviços centrais de billing

Revisar:

- `src/services/billing/billing-checkout.service.ts`
- `src/services/billing/billing-subscription.service.ts`
- `src/services/billing/handlers/*`

Objetivo:

- refletir o lifecycle real da Stripe
- evitar dependência de status artificiais
- permitir cancelamento e troca de plano no provider principal

### 5. Ajustar UI do dashboard

Revisar:

- `src/components/dashboard/billing/billing-status.tsx`
- `src/components/dashboard/billing/plan-selector.tsx`
- `src/components/dashboard/account/account-billing-card.tsx`

Objetivo:

- remover referências operacionais ao provider legado do produto
- mostrar links corretos para gestão de cobrança
- mostrar status coerentes com Stripe
- suportar mudança de plano e cancelamento via provider prioritário

### 6. Ajustar documentação operacional

Criar ou revisar:

- `docs/BILLING_DEPLOYMENT.md`
- guia novo de Stripe
- checklist de envs e webhooks

Objetivo:

- documentar a Stripe como caminho oficial
- remover o provider legado da documentação ativa de billing

## Estratégia de Rollout

### Fase 1: Stripe funcional e completa

- implementar provider Stripe
- ativar Stripe em staging
- validar billing end-to-end em cartão

### Fase 2: Stripe como padrão

- `ACTIVE_PAYMENT_PROVIDER=stripe` em produção
- checkout novo passa 100% pela Stripe
- webhook principal passa a ser Stripe
- dashboard passa a apontar para portal/gestão Stripe

### Fase 3: arquitetura preparada para futuro segundo provider

- preservar registry/interface agnóstica
- evitar acoplamento da camada de serviço à Stripe
- deixar o caminho livre para `Polar` se essa decisão vier depois

## Critérios de Aceite

- checkout novo abre e conclui via Stripe
- webhook Stripe ativa assinatura local corretamente
- cancelamento no app cancela no provider principal
- mudança de plano reflete no provider e no app
- dashboard mostra provider, status e gestão coerentes
- customer portal ou equivalente oficial abre corretamente

## Riscos

- migração parcial de UI deixando links antigos da AbacatePay
- inconsistência de status local se a model continuar refletindo regras do provider antigo
- acoplamento excessivo à Stripe inviabilizando futura entrada de Polar sem novo refactor

## Ordem Recomendada de Execução

1. provider Stripe
2. provider selection por env
3. webhook Stripe dedicado
4. ajuste de checkout/subscription services
5. ajuste de UI e customer portal
6. docs operacionais
7. remoção das referências ativas à AbacatePay
8. smoke real com pagamento em cartão

## Smoke Obrigatório

1. criar trial Stripe do produto base
2. concluir pagamento em cartão
3. confirmar ativação da assinatura no app
4. validar plano em `/dashboard/billing`
5. validar plano em `/dashboard/account`
6. validar add-ons operacionais
7. cancelar ao fim do período
8. validar webhook, banco e UI

## Definição de Done

Esta iniciativa só estará concluída quando:

- Stripe for o provider ativo em produção
- o fluxo principal de billing não depender mais da AbacatePay
- a UI não induzir o usuário ao provider antigo como caminho principal
- a documentação ativa de billing estiver 100% alinhada com Stripe
- a arquitetura continuar apta para um futuro provider como `Polar` sem novo redesenho estrutural
