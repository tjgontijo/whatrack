# Diagnostico: AI Cadence Engine

**Ultima atualizacao:** 2026-03-23

---

## Problema Central

O WhaTrack precisa de uma forma de manter contato proativo com leads sem depender de campanhas manuais ou de o operador lembrar de fazer followup. A cadencia resolve isso de forma estruturada: uma vez configurada, ela funciona automaticamente, respeitando a janela de 24h do WhatsApp, e para quando o cliente responde.

---

## Riscos e Mitigacoes

### R1: Execucao duplicada de steps

**Risco:** O cron roda mais de uma vez antes do step ser executado, gerando dois envios para o mesmo step.

**Mitigacao:**
- A function Inngest usa `concurrency: { limit: 1, key: event.data.enrollmentId }` para garantir que apenas uma execucao por enrollment aconteca ao mesmo tempo.
- Antes de executar o step, verificar se `enrollment.currentStep` ainda corresponde ao step que foi agendado (idempotencia por version check).
- Se o enrollment ja avancou (step mudou entre o agendamento e a execucao), descartar silenciosamente.

---

### R2: Cadencia enviando durante conversa ativa

**Risco:** O lead esta conversando com o agente reativo e a cadencia envia uma mensagem no meio da conversa, causando confusao.

**Mitigacao:**
- Antes de executar qualquer step do tipo `send_*`, verificar se existe uma mensagem inbound recente (< 10 minutos) no ticket.
- Se existir conversa ativa: adiar o step por 30 minutos (`nextStepAt += 30min`).
- Esse comportamento e configuravel no `actionConfig.skipIfActiveConversation`.

---

### R3: Volume alto de enrollments com cron

**Risco:** Com muitos leads, o cron processa centenas de enrollments a cada 5 minutos, sobrecarregando o banco.

**Mitigacao:**
- O cron apenas busca os `enrollmentId` e emite eventos Inngest. A execucao acontece nos workers.
- Query eficiente usando o indice `(status, nextStepAt)` que ja existe no PRD-018.
- Processar em batches de 50 enrollments por chamada do cron.
- Inngest gerencia o rate limiting e a concorrencia dos workers.

---

### R4: Template da Meta nao aprovado

**Risco:** O step de CLOSED mode referencia um template que foi rejeitado ou suspenso pela Meta.

**Mitigacao:**
- Antes de enviar, verificar o status do template via `GET /templates/{template_name}` da Graph API.
- Se nao aprovado: registrar `AiEvent(ERROR)` com detalhe, pausar o enrollment, notificar o operador via UI (badge de erro na listagem).
- Nao falhar silenciosamente.

---

### R5: Interrupcao perdida

**Risco:** O cliente responde mas a interrupcao nao e processada (ex: webhook falhou), e a cadencia continua enviando.

**Mitigacao:**
- A verificacao de conversa ativa (R2) serve tambem como safety net: se o cliente respondeu recentemente, o step e adiado.
- O operador pode pausar ou interromper manualmente qualquer enrollment.
- Adicionar alertas de observabilidade para enrollments com muitos steps executados sem resposta do cliente.

---

## Decisoes de Design

### D1: Cron vs Inngest Schedule

O cron e implementado como Inngest `schedule` (função com `cron` trigger), nao como cron externo. Isso garante:
- Retry em caso de falha
- Observabilidade no dashboard do Inngest
- Um unico lugar para gerenciar todos os jobs assincronos

### D2: Step como function Inngest separada

O cron emite eventos individuais por enrollment (`ai/cadence.step.due`). Cada evento e processado por uma function Inngest separada. Isso:
- Isola falhas: um step falhando nao afeta outros enrollments
- Permite retry automatico por step
- Garante concorrencia controlada por `enrollmentId`

### D3: Interrupcao sincrona no webhook

A interrupcao de cadencias acontece de forma sincrona no `messageHandler()`, antes do Inngest processar o inbound. Isso garante que:
- O agente reativo (PRD-012) recebe a mensagem sem conflito com a cadencia
- O enrollment e marcado como interrompido antes de qualquer execucao de step

### D4: Sem persistencia de "ultimo step enviado"

O enrollment rastreia apenas `currentStep` (qual step deve ser executado a seguir). O historico completo de steps executados fica nos `AiEvent` com `type = CADENCE_STEP_EXECUTED`. Isso evita redundancia e mantém o `AiEvent` como fonte de verdade.
