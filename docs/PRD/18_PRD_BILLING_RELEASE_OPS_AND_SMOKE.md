# PRD: Billing Release Ops and Smoke

## Objetivo

Fechar a operação real do billing em produção, garantindo que Stripe, cron, documentação, observabilidade e smoke test estejam alinhados com o código antes de tratar o domínio como concluído.

## Problema Atual

Hoje parte do billing compila e roda, mas ainda não existe um fechamento operacional único:

- docs ativas divergem do código
- setup Stripe ainda mistura intenção e implementação
- não há smoke único e obrigatório do billing
- overage e reconciliação ainda não têm operação documentada

## Escopo

### Entra nesta iniciativa

1. consolidar setup oficial da Stripe
2. consolidar envs obrigatórias
3. consolidar webhook setup real
4. consolidar cron de billing
5. definir observabilidade mínima
6. definir smoke obrigatório de billing
7. definir gate de go/no-go do domínio

### Fica fora desta iniciativa

- refactor de catálogo
- refactor de provider
- implementação de overage

## Operação Alvo

### Stripe

Deve existir um único guia oficial cobrindo:

- products
- prices
- webhook secret
- portal configuration
- API keys de test e live

### Cron

Para billing, a operação deve prever pelo menos:

- closeout de ciclos
- retry/reconciliation de webhook pendente, se existir esse caminho

Contrato alvo:

- `POST /api/v1/cron/billing/close-cycles`
- autenticação via `Authorization: Bearer ${CRON_SECRET}`

### Observabilidade mínima

Para cada cobrança/assinatura:

- log de webhook recebido
- log de webhook processado
- log de falha de processamento
- log de closeout de ciclo
- log de falha na criação de invoice item

## Smoke Obrigatório

### Smoke 1: assinatura nova

1. sign up
2. onboarding leve criando o primeiro projeto
3. inicio do trial Stripe com `14 dias gratis`
4. webhook
5. assinatura em `trialing`
6. account e billing refletindo:
   - plano base
   - primeiro projeto ativo
   - sem add-ons

### Smoke 2: customer portal

1. abrir portal
2. ver subscription
3. retornar ao app

### Smoke 3: cancelamento

1. solicitar cancelamento
2. confirmar mudança de estado local
3. confirmar estado no provider

### Smoke 4: expansao comercial

1. adicionar projeto adicional
2. adicionar WhatsApp adicional no mesmo projeto
3. adicionar conta Meta Ads adicional no mesmo projeto
4. confirmar Stripe e app

### Smoke 5: overage

1. gerar eventos acima do limite
2. fechar ciclo
3. confirmar invoice item
4. confirmar reset do ciclo

## Checklist de Produção

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- IDs de prices/produtos coerentes com o catalogo:
  - `platform_base`
  - `additional_project`
  - `additional_whatsapp_number`
  - `additional_meta_ad_account`
- configuracao de trial de 14 dias coerente com o onboarding self-serve
- `ACTIVE_PAYMENT_PROVIDER=stripe`
- `CRON_SECRET`
- portal Stripe habilitado
- webhook apontando para domínio correto
- cron de billing configurado no scheduler oficial

## Mudanças Técnicas Esperadas

### 1. Revisar documentação ativa

Revisar:

- `docs/STRIPE_SETUP_GUIDE.md`
- `docs/BILLING_DEPLOYMENT.md`

Objetivo:

- tudo que a doc disser precisa existir no código

### 2. Documentar cron de billing

Criar ou revisar:

- guia de `n8n`
- exemplos de `curl`
- frequência recomendada

### 3. Criar checklist de smoke executável

Objetivo:

- permitir smoke rápido antes de cada release sensível de billing

Entregáveis esperados:

- `docs/BILLING_RELEASE_CHECKLIST.md`
- `docs/BILLING_SMOKE_CHECKLIST.md`

## Critérios de Aceite

- existe um único caminho documentado para setup Stripe
- existe um único caminho documentado para cron de billing
- smoke de billing pode ser executado sem interpretação ambígua
- documentação não promete comportamento inexistente

## Dependências

- `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`
- `16_PRD_BILLING_OVERAGE_EXECUTION.md`
- `17_PRD_BILLING_LEGACY_CLEANUP_AND_DATA_MIGRATION.md`

## Riscos

- documentação continuar adiantada em relação ao código
- setup manual diferente entre ambientes
- overage entrar em produção sem operação de closeout
