# PRD V1 Domain: Scheduling with N8N

## Objetivo

Assumir o `n8n` como scheduler oficial da V1 para jobs operacionais, removendo a dependência prática do cron nativo da Vercel free.

## Contexto

No plano gratuito da Vercel, o cron não atende a frequência operacional que a V1 precisa.

Exemplo real:

- `webhook-retry` precisa de recorrência curta para ter utilidade operacional
- `ai-classifier` precisa rodar em intervalo curto para não deixar a IA parecer quebrada
- `whatsapp-health-check` pode rodar em janela mais espaçada, mas ainda precisa fonte de execução confiável

Por isso, a fonte de verdade da V1 será:

- `n8n schedule trigger`
- chamada HTTP para rotas em `src/app/api/v1/cron/[domain]/[function]`
- autenticação por `Authorization: Bearer <secret>`

## Estado Implementado Hoje

Base já existente no código:

- `POST /api/v1/cron/ai/classifier`
- `POST /api/v1/cron/system/webhook-retry`
- `POST /api/v1/cron/whatsapp/health-check`
- autenticação por `CRON_SECRET`
- lock distribuído em Redis em jobs críticos
- o cron da Vercel saiu da operação da V1

## Decisão Oficial da V1

- `n8n` será o scheduler oficial da produção
- o contrato oficial alvo de execução fica concentrado em `/api/v1/cron/[domain]/[function]`
- o padrão HTTP oficial será `POST` para todos os gatilhos agendados

## Jobs Oficiais

### 1. AI Classifier

Endpoint oficial:

- `POST /api/v1/cron/ai/classifier`

Objetivo:

- drenar a fila Redis de tickets elegíveis
- disparar `CONVERSATION_IDLE_3M`
- gerar sugestões para a fila de aprovações

Frequência recomendada:

- a cada 1 minuto

Auth:

- `Authorization: Bearer ${CRON_SECRET}`

Exemplo `curl`:

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/ai/classifier' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 2. Webhook Retry

Endpoint oficial:

- `POST /api/v1/cron/system/webhook-retry`

Objetivo:

- reprocessar tentativas pendentes de webhook

Frequência recomendada:

- a cada 5 minutos

Auth:

- `Authorization: Bearer ${CRON_SECRET}`

Exemplo `curl`:

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/system/webhook-retry' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 3. WhatsApp Health Check

Endpoint oficial:

- `POST /api/v1/cron/whatsapp/health-check`

Objetivo:

- verificar saúde operacional da integração de WhatsApp

Frequência recomendada:

- 1 vez por dia

Auth:

- `Authorization: Bearer ${CRON_SECRET}`

Exemplo `curl`:

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/whatsapp/health-check' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Fluxo Operacional no N8N

Para cada job:

1. `Schedule Trigger`
2. `HTTP Request`
3. método `POST`
4. header `Authorization: Bearer <secret>`
5. timeout explícito
6. retry controlado pelo próprio `n8n`
7. notificação em caso de erro consecutivo

Configuração esperada no node HTTP Request do `n8n`:

- URL: `https://whatrack.com/api/v1/cron/[domain]/[function]`
- Method: `POST`
- Authentication: `None`
- Headers:
  - `Authorization: Bearer <secret>`
  - `Content-Type: application/json`
- Body: `{}`

## Configuração Mínima

Variáveis envolvidas:

- `CRON_SECRET`

Regras:

- não usar token em query string
- não expor rotas de job sem auth
- timezone do `n8n` deve estar explícito
- documentação operacional deve registrar frequência, endpoint e secret esperado

## Gaps Reais

- a documentação operacional ainda precisa assumir `n8n` como fonte oficial
- ainda faltam validações reais de chamada autenticada a partir do scheduler

## Tarefas de Hoje

1. Configurar os 3 jobs oficiais no `n8n`.
2. Testar manualmente cada rota com Bearer token.
3. Confirmar resposta esperada e lock distribuído.
4. Atualizar PRDs e docs operacionais para refletir a decisão.

## Critérios de Aceite

- `n8n` executa os jobs com a frequência esperada
- todos os jobs oficiais respondem autenticados
- falha de job gera sinal operacional observável
- não existe ambiguidade sobre qual scheduler manda na produção

## Riscos de Launch

- se o `n8n` não estiver configurado antes do launch, a IA e retries operacionais ficam degradados
- manter múltiplos endpoints de cron para o mesmo papel aumenta chance de configuração errada
