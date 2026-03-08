# PRD V1: Launch Residuals

## Objetivo

Consolidar somente o que ainda falta para colocar a V1 no ar depois da execução dos PRDs `01` a `08`, sem reabrir escopo de produto.

## Leitura Atual

Os domínios principais já foram atacados na branch `launch-v1`.

O que ainda separa o produto do `go-live` não é feature nova. É fechamento operacional:

- scheduler externo ativo
- banco de produção alinhado com migrations e seeds
- smoke manual dos fluxos críticos
- decisão explícita sobre o que é bloqueante versus degradável amanhã

## O Que Falta de Verdade

### 1. Infra Externa Obrigatória

- configurar o `n8n` como scheduler oficial da V1
- cadastrar os workflows com timezone explícito e bearer token correto
- validar execução real das rotas:
  - `POST https://whatrack.com/api/v1/cron/ai/classifier`
  - `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
  - `POST https://whatrack.com/api/v1/cron/whatsapp/health-check`
- confirmar que `CRON_SECRET` no ambiente de produção é o mesmo usado no `n8n`

### 2. Banco e Ambiente de Produção

- executar `prisma migrate deploy` no banco do ambiente final
- executar os seeds obrigatórios do launch
- confirmar especialmente lookup tables e dados mínimos de billing/catálogo
- validar variáveis críticas de produção:
  - auth
  - billing
  - WhatsApp/Meta
  - Redis
  - OpenAI
  - cron secret

### 3. Smoke Manual de Launch

Fluxos obrigatórios:

1. `landing -> sign-up/sign-in -> onboarding -> dashboard`
2. `dashboard -> checkout -> pagamento -> webhook -> assinatura ativa`
3. `WhatsApp onboarding -> mensagem recebida -> lead/ticket criado`
4. `ticket elegível -> IA classifica -> insight aparece -> aprovação -> venda criada`
5. `fechamento manual de ticket ganho -> sale sincronizada -> dashboard atualizado`
6. `Meta Ads connect -> campanhas/insights carregam -> 1 evento de conversão chega no Meta`

### 4. Decisões de Go/No-Go

Bloqueantes para amanhã:

- `n8n` rodando com sucesso nos jobs oficiais
- webhook de billing processando evento real
- fluxo WhatsApp -> IA -> venda funcionando
- onboarding e checkout funcionando ponta a ponta
- migrations e seeds aplicados no ambiente final

Degradáveis somente com ajuste explícito de comunicação:

- Meta Ads, se OAuth ou CAPI não validarem com conta real
- analytics secundário que hoje ainda esteja operacionalmente degradado

## Não Reabrir Escopo

Não entra neste PRD:

- novas features
- novo redesign
- refactor estrutural grande
- ampliar automações de IA
- reconstruir analytics além do necessário para o launch

## Ordem de Execução

1. Aplicar migrations e seeds no ambiente final.
2. Configurar e testar `n8n`.
3. Rodar smoke manual completo.
4. Decidir `go`, `go com degradação controlada` ou `no-go`.
5. Fazer deploy final e acompanhar logs do dia 1.

## Critérios de Aceite

- ambiente final está com schema e seeds corretos
- jobs agendados no `n8n` executam com autenticação válida
- smoke manual dos fluxos críticos foi executado sem erro bloqueante
- eventuais degradações ficaram documentadas e refletidas na comunicação do launch

## Checklist Curta de Amanhã

- deploy da `launch-v1`
- confirmar logs de webhook, cron e app
- validar primeira compra/teste
- validar primeira mensagem/processamento de IA
- validar primeiro evento de conversão Meta, se Meta estiver no escopo do dia 1

## Risco Principal

O maior risco restante não está mais no código versionado. Está na operação externa do launch.
