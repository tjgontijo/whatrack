# QUICK START - PRD-012 Core Runtime WhatsApp AI

---

## Visao Rapida

Esta V1 entrega o core runtime do agente de WhatsApp:

- config por projeto
- debounce inbound via Inngest
- buffer de conversa persistido
- skill-runner com runtime Mastra
- outbound real via WhatsApp
- kill switch
- logs tecnicos minimos

O AI Studio avancado ficou fora e foi movido para o PRD-013.
O cleanup do stack atual acontece antes, no PRD-011.

---

## Setup

```bash
npm install inngest @mastra/loggers
bash scripts/reset-db.sh
```

---

## Ordem De Execucao

| Fase | Tasks | O que faz |
|---|---|---|
| Fase 1 | T1-T5 | Schema novo e defaults por projeto |
| Fase 2 | T6-T10 | Buffer, transporte e Inngest |
| Fase 3 | T11-T16 | Runtime Mastra e idempotencia |
| Fase 4 | T17-T21 | UI minima, logs e cutover |
| Fase 5 | T22-T24 | Testes e validacao |

---

## Checklist Da V1

- [ ] Projeto novo recebe defaults de IA automaticamente
- [ ] Mensagem inbound e agrupada por `conversationId`
- [ ] Agente pode ser pausado via config
- [ ] Crise/handoff nao dependem do LLM
- [ ] Retry nao duplica outbound
- [ ] Outbound real sai pela camada WhatsApp
- [ ] Echo/status persiste outbound localmente
- [ ] Inbox mostra atividade minima do agente
- [ ] Testes, build e lint passam

---

## Critério De Sucesso

A V1 esta pronta quando uma mensagem inbound real percorre com seguranca:

```text
messageHandler
  -> append buffer
  -> Inngest
  -> workflow
  -> runSkill
  -> send outbound
  -> log
```

sem duplicar resposta e com kill switch funcional.
