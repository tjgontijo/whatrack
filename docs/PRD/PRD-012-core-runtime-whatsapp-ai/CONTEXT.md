# Contexto: Core Runtime WhatsApp AI

**Ultima atualizacao:** 2026-03-23 (v2.0 — refatorado para PRD-018 como prerequisito)

---

## Definicao

Este PRD entrega o runtime minimo de IA para atendimento automatizado no WhatsApp. A infraestrutura de dados (LeadAiContext, AiEvent, AiAgent, Mastra, Inngest) e entregue pelo PRD-018. Este PRD consome essa fundacao e implementa o caminho:

```text
inbound -> debounce -> triage -> skill -> outbound -> AiEvent log
```

---

## Quem Usa

- Clientes finais que enviam mensagens inbound no WhatsApp
- Operadores que ativam, pausam ou configuram o agente por projeto
- Usuarios com permissao `manage:ai`

---

## Estado Atual da IA (legado)

```text
Webhook inbound
  -> messageHandler()
  -> transaction CRM existente
  -> enqueueForClassification()
  -> cron drena fila
  -> dispatchAiEvent()
  -> AiInsight criado (aprovacao humana)
```

Este fluxo sera substituido. O legado e removido pelo PRD-011. A infraestrutura nova e entregue pelo PRD-018.

---

## Realidades Tecnicas

- O runtime do WhatsApp e por `WhatsAppConfig`, associado a `projectId`
- O inbound ja persiste CRM antes de side effects
- A camada Meta suporta templates, mas precisa ganhar envio de texto livre
- O PRD-018 ja configurou Mastra com `@mastra/pg` e o client Inngest
- O PRD-018 ja entregou `executePrompt`, `AiEventService` e `LeadAiContextService`

---

## Regras De Negocio

- Configuracao do agente e por projeto
- Um projeto tem apenas um blueprint ativo na V1
- O agente pode ser pausado imediatamente via `AiAgentProjectConfig.paused`
- **Crisis keywords sao por projeto, nao global** — variam por nicho (medico, vidracaria, ecommerce)
  - Criados automaticamente baseado no niche do projeto
  - Personalizaveis pelo usuario via API/UI posterior
- Mensagens de crise nao dependem do LLM — sao deterministic
- Envio outbound deve ser idempotente: mesmo snapshot nao gera duas respostas
- A persistencia local do outbound depende do webhook echo/status da Meta
- Fora do horario comercial: resposta automatica, sem executar skill do LLM
- Testing mode: so executa para numeros na whitelist
- Debounce e configuravel por projeto (default 8000ms)

---

## Modelos Especificos Deste PRD

Estes modelos pertencem ao runtime de inbound. Os modelos de fundacao (LeadAiContext, AiEvent, AiAgent, etc.) pertencem ao PRD-018.

```text
AiProjectConfig
  -> projectId (unique)
  -> orgId
  -> businessName
  -> niche               // healthcare | retail | ecommerce | saas | other — usado para crisis keywords default
  -> productDescription
  -> pricingInfo
  -> nextStepType        // "schedule" | "proposal" | "store_visit" | "custom"
  -> assistantName
  -> escalationContact   // numero do humano para handoff
  -> businessHours       // JSON: { timezone, schedules: [{day, open, close}] }
  -> debounceMs          // ms de espera antes de processar (default 8000)
  -> testingModeEnabled
  -> testingPhones       // JSON: string[] — whitelist para testing mode

AiConversationState
  -> conversationId (unique)
  -> orgId
  -> projectId
  -> pendingMessages     // JSON: { id, text, timestamp }[]
  -> pendingMessagesUpdatedAt
  -> lastProcessedFingerprint  // hash do snapshot processado
  -> lastProcessedAt

AiSkill
  -> projectId (null = sistema/global)
  -> orgId
  -> slug
  -> name
  -> description
  -> isSystem            // true = skill do blueprint, false = custom
  -> isActive

AiSkillVersion
  -> skillId
  -> version             // semver string
  -> prompt              // texto completo do prompt
  -> mode                // "deterministic" | "llm"
  -> isPublished
  -> publishedAt

AiSkillExecutionLog
  -> executionKey        // fingerprint unico para idempotencia
  -> orgId
  -> projectId
  -> conversationId
  -> ticketId
  -> skillId
  -> skillVersion
  -> routingDecision     // JSON: resultado do orchestrator
  -> output              // texto gerado pelo agente
  -> outboundPayload     // JSON: payload enviado para a Meta
  -> outboundResult      // JSON: resposta da Meta
  -> aiEventId           // FK para AiEvent correspondente
  -> success
  -> errorMessage
  -> durationMs

AiCrisisKeyword
  -> projectId          // IMPORTANT: por projeto, nao global!
  -> orgId
  -> keyword            // palavra-chave que dispara escalacao
  -> isActive
  -> escalationResponse // resposta automatica a ser enviada
  -> severity           // low | medium | high | critical

// Nota: tabela inicia vazia. Usuario configura via API (consumida por UI em PRD-020).
// Exemplos do que usuario pode configurar:
// Médico: "suicidio", "crise", "emergencia", "internacao"
// Vidracaria: "roubo", "invasao", "vidro quebrado", "seguranca"
// E-commerce: "enganado", "fraude", "nao chegou", "produto falso"
// SaaS: "dados vazados", "conta hackeada", "perda de dados"
```

---

## Integracoes

**Existentes (consumidas):**
- Meta WhatsApp Cloud API (envio de mensagens)
- Prisma/Postgres (estado do runtime)
- Centrifugo (realtime para frontend)
- Permissao `manage:ai`

**Do PRD-018 (consumidas):**
- `executePrompt` — camada de abstracao Mastra
- `AiEventService.record()` — registrar acoes do workflow
- `LeadAiContextService.ensureContext()` / `updateContext()` — contexto do lead
- `AiAgentRegistryService.isAgentEnabled()` — verificar kill switch
- Client Inngest — enviar eventos

**Novas (criadas neste PRD):**
- Function Inngest: `whatsapp/message.received`
- Workflow Mastra: `inbound-message`

---

## Fluxo Desejado Da V1

### Parte 1: Webhook (sincrono, deve retornar 200 rapido)

```text
Webhook inbound WhatsApp
  -> messageHandler()
  -> transaction CRM existente (lead + conversation + ticket + message)
  -> append mensagem em AiConversationState.pendingMessages
  -> inngest.send('whatsapp/message.received', { conversationId, orgId, messageId })
  -> return 200
```

### Parte 2: Function Inngest (assincrono, com debounce)

```typescript
inngest.createFunction(
  {
    id: 'process-whatsapp-message',
    debounce: { key: 'event.data.conversationId', period: '8s' },
    concurrency: { limit: 1, key: 'event.data.conversationId' },
  },
  { event: 'whatsapp/message.received' },
  async ({ event }) => { /* chama o workflow */ }
)
```

### Parte 3: Workflow inbound-message (13 passos)

```text
Passo 1: carregar config
  -> AiProjectConfig + AiAgentProjectConfig
  -> se agente nao encontrado: registrar AiEvent(ERROR) e sair

Passo 2: verificar kill switch
  -> AiAgentProjectConfig.enabled e .paused
  -> se desabilitado: sair silenciosamente

Passo 3: verificar testing mode
  -> se testingModeEnabled: verificar se o numero esta na whitelist
  -> se nao esta: sair silenciosamente

Passo 4: carregar snapshot do buffer
  -> AiConversationState.pendingMessages
  -> gerar fingerprint do snapshot atual

Passo 5: enriquecer contato
  -> LeadAiContextService.ensureContext(leadId)
  -> carregar LeadAiContext para incluir no prompt

Passo 6: verificar janela de 24h
  -> Ticket.windowOpen e Ticket.windowExpiresAt
  -> registrar no contexto do workflow para uso posterior

Passo 7: verificar horario comercial
  -> AiProjectConfig.businessHours
  -> se fora do horario: executar skill out-of-hours-reply (deterministic) e ir para passo 12

Passo 8: detectar spam
  -> heuristica simples (mensagem muito curta, repetida, etc.)
  -> se spam: sair silenciosamente

Passo 9: triage / orchestrator
  -> executePrompt com instrucoes de classificacao
  -> retorna: { intent, segment, skill, riskLevel }
  -> registrar AiEvent(TRIAGE_COMPLETED)

Passo 10: detectar crise
  -> verificar AiCrisisKeyword no texto
  -> se crise: executar resposta deterministic + AiEvent(CRISIS_DETECTED) + sair

Passo 11: executar skill
  -> skill-runner.ts com a skill selecionada pelo orchestrator
  -> modo deterministic: interpolacao de template
  -> modo llm: executePrompt com prompt da skill + LeadAiContext
  -> registrar AiEvent(SKILL_EXECUTED)

Passo 12: enviar outbound idempotente
  -> verificar idempotencia via AiSkillExecutionLog.executionKey
  -> se janela aberta: enviar texto livre
  -> se janela fechada: enviar template (fallback configurado na skill)
  -> registrar AiEvent(MESSAGE_SENT ou TEMPLATE_SENT)

Passo 13: salvar estado
  -> limpar pendingMessages se o fingerprint ainda for o atual
  -> atualizar LeadAiContext (lifecycle, sugestao de proximo passo)
  -> salvar AiSkillExecutionLog
```

---

## Blueprint e Skills Da V1

Blueprint default da V1:

```
whatsapp-commercial-agent
```

Skills minimas da V1:

| Slug | Modo | Descricao |
|------|------|-----------|
| `send-welcome` | deterministic | Primeira mensagem de boas-vindas |
| `collect-lead-qualification` | llm | Coleta nome, necessidade, orcamento |
| `explain-product-service` | llm | Explica o produto/servico com base no AiProjectConfig |
| `send-pricing` | deterministic | Envia tabela de precos |
| `human-handoff` | deterministic | Transfere para humano com escalationContact |
| `out-of-hours-reply` | deterministic | Resposta padrao fora do horario |

---

## Estado Desejado

Ao final deste PRD:

- O webhook de inbound chama `inngest.send()` em vez de enfileirar para cron.
- O Inngest aguarda 8s de silencio antes de disparar o workflow.
- O workflow executa os 13 passos com seguranca.
- Cada acao do workflow gera um `AiEvent` via `AiEventService`.
- O `LeadAiContext` e atualizado ao final de cada workflow.
- O envio outbound e idempotente.
- A UI minima permite toggle de agente, seletor de blueprint e configuracao de business hours.
- O dashboard de execucoes mostra `AiSkillExecutionLog` paginado.
