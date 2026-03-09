# Billing Smoke Checklist

## Objetivo

Executar um smoke único e reproduzível para validar checkout, trial, webhook, portal, cancelamento e closeout.

Use sempre uma organização de teste dedicada.

## Pré-condições

- ambiente apontando para Stripe correta (`test` ou `live`)
- catálogo sincronizado
- webhook Stripe ativo
- workflows do `n8n` ativos:
  - `/api/v1/cron/system/webhook-retry`
  - `/api/v1/cron/billing/close-cycles`

## Smoke 1. Nova assinatura com trial

Fluxo:

1. criar conta nova
2. concluir onboarding
3. abrir `/dashboard/billing`
4. escolher `Starter` ou `Pro`
5. concluir checkout com cartão

Esperado:

- Stripe cria `Checkout Session`
- webhook `checkout.session.completed` é entregue
- webhook `customer.subscription.created` ou `customer.subscription.updated` é entregue
- o app reflete assinatura ativa com trial em andamento
- `/dashboard/billing` mostra o plano correto
- `/dashboard/account` mostra o plano correto

Se falhar, coletar:

- request que falhou
- evento Stripe que não chegou
- registro em `billing_webhook_logs`

## Smoke 2. Customer Portal

Fluxo:

1. em `/dashboard/billing`, clicar em `Gerenciar assinatura`
2. confirmar redirecionamento para o Stripe Customer Portal
3. voltar ao app

Esperado:

- portal abre sem erro
- customer correto é carregado
- retorno volta para `/dashboard/billing`

## Smoke 3. Mudança de plano

Fluxo:

1. partir de uma assinatura `Starter`
2. abrir Customer Portal
3. mudar para `Pro`
4. aguardar webhook `customer.subscription.updated`

Esperado:

- Stripe atualiza a assinatura
- o app atualiza `planName`, `planType` e limites
- `/dashboard/billing` e `/dashboard/account` refletem `Pro`

## Smoke 4. Cancelamento

### Caminho obrigatório

Fluxo:

1. em `/dashboard/billing`, clicar em `Cancelar assinatura`
2. escolher `Encerrar no fim do período`
3. confirmar cancelamento

Esperado:

- o app marca `canceledAtPeriodEnd = true`
- a UI mostra renovação cancelada
- a assinatura continua ativa até o fim do ciclo

### Caminho destrutivo opcional

Executar apenas em organização descartável.

Fluxo:

1. abrir o mesmo diálogo
2. escolher `Encerrar acesso agora`
3. confirmar

Esperado:

- a assinatura fica cancelada no provider e no app

## Smoke 5. Overage e closeout

Este smoke deve rodar em staging ou em uma organização descartável.

Pré-condições:

- assinatura fora de trial
- uso acima do limite do plano
- `nextResetDate` elegível para fechamento

Fluxo:

1. gerar eventos acima do limite mensal
2. disparar `POST /api/v1/cron/billing/close-cycles`
3. aguardar processamento

Esperado:

- a rota retorna `200` ou `429`
- `billing_cycle_closeouts` registra o fechamento
- se houver excedente:
  - status final `invoiced`
  - `providerInvoiceItemId` preenchido
- se não houver excedente:
  - status final `no_overage`
- se o ciclo ainda estiver em trial:
  - status final `trial_skipped`

## Critério final

Billing aprovado para release quando:

- Smokes 1, 2, 3 e 4 passam
- Smoke 5 passa no ambiente operacional adequado
- nenhum erro crítico fica aberto em webhook, portal ou closeout
