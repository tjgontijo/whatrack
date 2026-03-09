# PRD V1 Domain: Billing

## Objetivo

Cobrar com consistência, ativar assinatura corretamente e expor no produto a verdade operacional do modelo de cobrança.

## Estado Implementado Hoje

Base já existente no código:

- checkout em `src/app/api/v1/billing/checkout/route.ts`
- assinatura em `src/app/api/v1/billing/subscription/route.ts`
- cancelamento em `src/app/api/v1/billing/cancel/route.ts`
- webhook em `src/app/api/v1/billing/webhooks/stripe/route.ts`
- serviço de assinatura em `src/services/billing/billing-subscription.service.ts`
- catálogo de planos em `BillingPlan`
- provider Stripe em `src/lib/billing/providers/providers/stripe-provider.ts`

## Verdade Operacional Atual

- o checkout recorrente usa Stripe Checkout
- cancelamento e troca de plano usam o lifecycle oficial da Stripe
- a assinatura local espelha `status`, período e trial do provider
- essa verdade precisa estar refletida na UI, no suporte e na documentação

## Escopo Oficial da V1

Entra no launch:

- checkout self-serve
- ativação de assinatura via webhook
- leitura de status atual da assinatura
- cancelamento no provider com estado explícito
- exibição clara do estado da assinatura no dashboard

Fica fora do esforço de hoje:

- billing multi-provedor

## Gaps Reais

- é obrigatório validar o webhook da Stripe com evento real antes do launch
- migration e seed de status precisam estar aplicadas no banco de destino
- a documentação interna de billing ainda pode conter instruções antigas e contraditórias
- o suporte precisa saber explicar trial, cancelamento e mudança de plano na V1
- se `webhook-retry` entrar no launch, ele deve rodar via `n8n`, não depender do cron limitado da Vercel free

## Tarefas de Hoje

1. Aplicar migration e seed pendentes no ambiente de release.
2. Validar `checkout -> pagamento -> webhook -> assinatura ativa`.
3. Validar `cancelamento -> status refletido no app`.
4. Revisar docs operacionais para remover fluxo antigo que não corresponde ao handler real.
5. Confirmar envs, secrets e rotina `webhook-retry` no ambiente final.

## Critérios de Aceite

- checkout abre URL válida e pagamento conclui
- webhook atualiza assinatura real no banco
- dashboard mostra estado correto da assinatura
- cancelamento não engana o usuário sobre o que aconteceu
- suporte consegue explicar o comportamento da cobrança sem ambiguidade

## Riscos de Launch

- qualquer divergência entre pagamento, webhook e status quebra confiança imediatamente
- documentação antiga de billing induz configuração errada em produção
