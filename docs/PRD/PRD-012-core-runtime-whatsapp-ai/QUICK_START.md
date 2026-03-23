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

---

## Setup

```bash
npx prisma validate
npx prisma db seed
```

---

## Ordem De Execucao

| Fase | Tasks | O que faz |
|---|---|---|
| Fase 1 | T1-T6 | Permissao `manage:ai`, schema novo e defaults por projeto |
| Fase 2 | T7-T15 | Buffer, transporte, workflow e idempotencia |
| Fase 3 | T16-T18 | API minima, testes e validacao |

---

## Checklist Da V1

- [ ] Projeto novo recebe defaults de IA automaticamente
- [ ] Permissao `manage:ai` existe e protege mutacoes do runtime
- [ ] Mensagem inbound e agrupada por `conversationId`
- [ ] Agente pode ser pausado via config
- [ ] Crise/handoff nao dependem do LLM
- [ ] Retry nao duplica outbound
- [ ] Outbound real sai pela camada WhatsApp
- [ ] Echo/status persiste outbound localmente
- [ ] API de configuracao retorna e atualiza `AiProjectConfig`
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
