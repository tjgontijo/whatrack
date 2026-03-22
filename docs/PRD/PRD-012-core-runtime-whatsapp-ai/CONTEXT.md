# Contexto: Core Runtime WhatsApp AI

**Ultima atualizacao:** 2026-03-21

---

## Definicao

Esta feature entrega o runtime minimo de IA necessario para operar atendimento automatizado no WhatsApp dentro do WhaTrack.

O foco da V1 nao e AI Studio. O foco e ter um caminho confiavel de producao:

```text
inbound -> debounce -> triage -> skill -> outbound -> log
```

Tudo que nao for essencial para esse caminho fica no PRD-013.

---

## Quem Usa

- usuarios internos com permissao `manage:ai`
- operadores do projeto que ativam ou pausam o agente
- clientes finais que enviam mensagens inbound no WhatsApp

---

## Fluxo Atual

### Estado Atual Da IA

```text
Webhook inbound WhatsApp
  -> processWhatsAppWebhookPayload()
  -> WebhookProcessor
  -> messageHandler()
  -> transaction CRM: lead + conversation + ticket + message
  -> enqueueForClassification()
  -> cron drena fila
  -> dispatchAiEvent()
  -> todos os agentes rodam
  -> AiInsight e criado
  -> frontend recebe evento via Centrifugo
  -> humano aprova/rejeita depois
```

### Realidades Tecnicas Que Importam Para A V1

- o runtime real do WhatsApp e por `WhatsAppConfig`, associado a `projectId`
- o inbound ja persiste CRM antes de side effects
- `publishToCentrifugo` e apenas realtime interno
- a camada Meta atual suporta templates, mas precisa ganhar envio de texto livre para o agente
- existem pontos de UI no contexto de projeto que serao reconstruidos sobre o runtime novo
- o PRD-011 remove o legado antes desta etapa; a V1 nao precisa conviver com o runtime antigo

---

## Regras De Negocio Relevantes

- a configuracao do agente e por projeto
- um projeto tem no V1 apenas um blueprint ativo
- o agente precisa poder ser pausado imediatamente
- mensagens de crise ou handoff forcado nao devem depender do LLM
- o envio outbound do agente deve ser idempotente
- a persistencia local do outbound continua dependendo do webhook echo/status da Meta

---

## Dados E Integracoes

### Modelos Novos Da V1

```text
AiProjectConfig
  -> organizationId
  -> projectId
  -> businessName
  -> niche
  -> productDescription
  -> pricingInfo
  -> nextStepType
  -> businessHours
  -> assistantName
  -> escalationContact
  -> testingModeEnabled
  -> agentEnabled

AiBlueprintActivation
  -> organizationId
  -> projectId
  -> blueprintSlug
  -> isActive

AiConversationState
  -> organizationId
  -> projectId
  -> conversationId
  -> state
  -> pendingMessages
  -> pendingMessagesUpdatedAt
  -> lastProcessedFingerprint
  -> lastProcessedAt

AiSkillExecutionLog
  -> executionKey
  -> organizationId
  -> projectId
  -> conversationId
  -> ticketId
  -> skillId
  -> routingDecision
  -> output
  -> outboundPayload
  -> outboundResult
  -> success
  -> errorMessage
  -> durationMs
```

### Integracoes Existentes

- Meta WhatsApp Cloud API
- Prisma/Postgres
- Centrifugo
- Redis
- permissao `manage:ai`

### Integracoes Novas

- Inngest
- runtime Mastra

---

## Estado Desejado

### Escopo De Runtime

O workflow V1 trabalha com:

```ts
{
  organizationId: string
  projectId: string
  instanceId: string
  conversationId: string
  ticketId?: string
  leadId?: string
  waChatId: string
  waName?: string
  userMessage: string
  timestamp: string
  messageId: string
}
```

### Blueprint E Skills Da V1

No V1 existe apenas um blueprint default:

```text
whatsapp-commercial-agent
```

Skills minimas da V1:

- `send-welcome`
- `collect-lead-qualification`
- `explain-product-service`
- `send-pricing`
- `human-handoff`
- `out-of-hours-reply`

### Fluxo Desejado Da V1

```text
Webhook inbound WhatsApp
  -> messageHandler()
  -> transaction CRM existente
  -> append inbound em pendingMessages
  -> commit
  -> inngest.send('whatsapp/message.received')
  -> return 200

[silencio de 5s]
  -> Inngest dispara workflow
  -> carrega config do projeto
  -> verifica kill switch
  -> le snapshot do buffer
  -> orchestrator triage
  -> safety-policy
  -> out-of-hours override
  -> business-rules-policy
  -> runSkill()
  -> send outbound idempotente via WhatsApp
  -> clear buffer se o snapshot ainda for o atual
  -> save state
  -> salvar execution log

[depois]
  -> webhook echo/status persiste outbound localmente
  -> realtime existente segue atualizando frontend
```

---

## Limite Claro Da V1

Esta V1 nao abre o runtime para operacao livre pelo usuario. Ela apenas garante que o core do atendimento automatizado funciona com seguranca e observabilidade minima.
