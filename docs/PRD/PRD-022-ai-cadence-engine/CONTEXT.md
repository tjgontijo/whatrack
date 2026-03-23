# Contexto: AI Cadence Engine

**Ultima atualizacao:** 2026-03-23

---

## Definicao

Uma cadencia e uma sequencia de followups automatizados, com delays, executados pelo agente proativo do WhaTrack. A cadencia existe para manter contato com leads que nao responderam, clientes que precisam de NPS, ou qualquer lead em qualquer estagio do pipeline.

A diferenca fundamental entre cadencia e campanha:

| | Campanha | Cadencia |
|---|---|---|
| Audiencia | Snapshot congelado no envio | Lead individual |
| Trigger | Manual ou agendada | Automatico por evento ou enrollment |
| Mensagens | Sempre template | Mix de skill (janela aberta) ou template (janela fechada) |
| Interrupcao | Nao se interrompe | Interrompe quando cliente responde |
| Steps | Um unico disparo | Sequencia de N steps com delays |

---

## Quem Usa

- **Operadores**: criam e configuram cadencias para casos de uso recorrentes (follow-up de proposta, NPS pos-atendimento, reengajamento)
- **Agente proativo** (`whatsapp-cadence`): executa os steps automaticamente
- **Sistema**: interrompe cadencias quando o cliente responde

---

## Modelos (do PRD-018)

Os modelos ja existem no schema. Este PRD apenas implementa a logica de execucao.

### AiCadence

Define o template da sequencia. Associada a um projeto.

```
trigger: "ticket_created" | "ticket_stage_changed" | "lead_scored" | "manual" | "inactivity"
config: { targetLifecycleStages: string[], maxEnrollmentsPerLead: number }
```

### AiCadenceStep

Cada step da sequencia:

```
order: Int (1, 2, 3...)
delayHours: Int (horas de espera apos step anterior ou apos enrollment no step 1)
windowMode: "OPEN" | "CLOSED" | "ANY"
actionType: "send_skill" | "send_template" | "update_stage" | "score_lead" | "wait_reply"
actionConfig: JSON especifico por tipo
```

### AiCadenceEnrollment

Estado do lead dentro de uma cadencia:

```
status: "active" | "paused" | "completed" | "interrupted" | "failed"
currentStep: Int (step atual, 0 = ainda nao iniciou)
nextStepAt: DateTime (quando executar o proximo step)
interruptReason: "customer_replied" | "manual_pause" | "agent_takeover" | "cadence_deactivated" | "lead_converted"
```

---

## Fluxo de Execucao

### 1. Enrollment de um lead

```text
Evento trigger (ticket criado, stage mudou, manual, etc.)
  -> verificar se a cadencia esta ativa
  -> verificar se o lead ja tem enrollment ativo nessa cadencia
  -> se nao: criar AiCadenceEnrollment com:
     - status: "active"
     - currentStep: 0
     - nextStepAt: agora + delayHours do step 1
  -> registrar AiEvent(CADENCE_ENROLLED)
```

### 2. Cron de polling

```text
Inngest cron: a cada 5 minutos
  -> buscar todos os AiCadenceEnrollment onde:
     - status = "active"
     - nextStepAt <= agora
  -> para cada enrollment: emitir evento Inngest "ai/cadence.step.due"
```

### 3. Execucao de um step (function Inngest por enrollment)

```text
Function: ai/cadence.step.due
  -> carregar enrollment + step correspondente
  -> verificar se o lead ainda esta ativo (nao converteu, etc.)
  -> verificar windowMode do step:
     - OPEN: verificar Ticket.windowOpen
       - se fechada: pular step ou usar fallback de template
     - CLOSED: verificar se a janela esta fechada
       - se aberta: aguardar (nextStepAt += 1h, repetir verificacao)
     - ANY: usar skill se janela aberta, template se fechada

  -> executar acao:
     - send_skill: chamar skill-runner.ts com a skill configurada
     - send_template: chamar whatsapp-ai-send.service.ts com template
     - update_stage: mover ticket para novo estagio
     - score_lead: atualizar aiScore no LeadAiContext
     - wait_reply: aguardar resposta por X horas (nextStepAt += timeoutHours)

  -> registrar AiEvent(CADENCE_STEP_EXECUTED)

  -> se era o ultimo step:
     - enrollment.status = "completed"
     - AiEvent(CADENCE_COMPLETED)
  -> se nao era o ultimo:
     - enrollment.currentStep++
     - enrollment.nextStepAt = agora + delayHours do proximo step
```

### 4. Interrupcao quando cliente responde

```text
messageHandler() (webhook inbound, PRD-012)
  -> apos persistir mensagem no CRM
  -> verificar se o lead tem enrollments ativos
  -> para cada enrollment ativo:
     - enrollment.status = "interrupted"
     - enrollment.interruptedAt = agora
     - enrollment.interruptReason = "customer_replied"
     - AiEvent(CADENCE_INTERRUPTED)
  -> o agente reativo (PRD-012) assume a conversa normalmente
```

---

## Comportamento Window-Aware

### OPEN mode

O step so executa se `Ticket.windowOpen = true` e `Ticket.windowExpiresAt > agora`.

Se a janela estiver fechada, o runner tem tres opcoes (configurado no `actionConfig`):
1. **skip**: pular este step e avancar para o proximo
2. **fallback_template**: usar um template alternativo aprovado pela Meta
3. **wait**: reagendar para X horas depois e tentar novamente

Padrao recomendado: `fallback_template` quando existe template configurado, senao `skip`.

### CLOSED mode

O step so executa se a janela estiver fechada (requer template aprovado).

Se a janela estiver aberta (cliente respondeu recentemente), aguardar ate fechar:
- `nextStepAt += 2h` — tentar novamente em 2 horas

### ANY mode

O runtime decide automaticamente:
- Janela aberta → executar skill (texto livre)
- Janela fechada → executar template configurado como fallback

O `actionConfig` para ANY deve sempre ter `skillSlug` E `fallbackTemplateName`.

---

## Regras de Negocio

- Um lead so pode ter um enrollment ativo por cadencia (`@@unique([cadenceId, leadId])`)
- `maxEnrollmentsPerLead` controla o total historico (nao apenas ativos): se um lead ja foi inscrito N vezes, nao inscrever novamente
- Enrollments interrompidos ou completados podem ser reiniciados manualmente pelo operador
- A pausa de um enrollment (`paused`) nao cancela — so congela o `nextStepAt`; para retomar, o operador reativa e redefine `nextStepAt`
- Se a cadencia e desativada (`isActive: false`), todos os enrollments ativos sao interrompidos com `cadence_deactivated`
- Steps do tipo `wait_reply` so avancam se o cliente responder antes do `timeoutHours`. Se o timeout expirar sem resposta, o step e marcado como concluido e a cadencia avanca
- A cadencia nao interfere com o agente reativo: se o cliente responde, a cadencia e interrompida e o agente reativo assume; quando a conversa terminar, o operador pode reiniciar a cadencia manualmente

---

## Triggers de Enrollment

### ticket_created
Ao criar um ticket, verificar cadencias com este trigger ativas no projeto. Inscrever o lead automaticamente se o `lifecycleStage` do `LeadAiContext` estiver na lista `targetLifecycleStages`.

### ticket_stage_changed
Ao mover ticket para nova fase, verificar cadencias que trigam nesta fase. Inscrever se criterios atendidos.

### lead_scored
Ao atualizar `aiScore` do `LeadAiContext`, verificar cadencias com este trigger. Util para cadencias de reengajamento (ex: score caiu abaixo de 30).

### manual
Sem trigger automatico. O operador inscreve o lead manualmente via UI ou API.

### inactivity
Cron separado que verifica leads sem atividade ha X dias e os inscreve em cadencias de reengajamento. Configurado no `config.inactivityDays`.

---

## Registro de AiEvent

Cada acao da cadencia deve registrar um `AiEvent`:

| Acao | Tipo do AiEvent | metadata |
|------|-----------------|---------|
| Lead inscrito | `CADENCE_ENROLLED` | `{ cadenceSlug, stepCount, trigger }` |
| Step executado | `CADENCE_STEP_EXECUTED` | `{ cadenceSlug, stepOrder, actionType, windowMode, windowOpen }` |
| Template enviado | `TEMPLATE_SENT` + `CADENCE_STEP_EXECUTED` | ambos |
| Skill executada | `SKILL_EXECUTED` + `CADENCE_STEP_EXECUTED` | ambos |
| Cadencia interrompida | `CADENCE_INTERRUPTED` | `{ cadenceSlug, reason, completedSteps }` |
| Cadencia completada | `CADENCE_COMPLETED` | `{ cadenceSlug, totalSteps, duration }` |

---

## Estado Desejado

Ao final deste PRD:

- O Inngest tem um cron que roda a cada 5 minutos verificando enrollments com `nextStepAt <= now`.
- Cada step e executado como function Inngest separada, com retry automatico em caso de falha.
- O agente proativo envia mensagens corretamente dentro e fora da janela de 24h.
- Quando o cliente responde, todos os enrollments ativos sao interrompidos automaticamente.
- O operador consegue criar, configurar e ativar cadencias via UI.
- O operador consegue ver o estado do enrollment de um lead (passo atual, proximo passo, historico).
- O operador consegue inscrever um lead manualmente em uma cadencia.
- Todos os eventos sao registrados como `AiEvent` e visiveis no timeline do ticket.
