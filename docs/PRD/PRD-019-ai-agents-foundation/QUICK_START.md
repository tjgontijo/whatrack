# QUICK_START.md: PRD-019

## Como Ler Este PRD

1. **README.md** — o que é e por que é importante
2. **CONTEXT.md** — arquitetura completa de agentes
3. **DIAGNOSTIC.md** — decisões técnicas e open questions
4. **TASKS.md** — tarefas detalhadas por fase
5. **Este arquivo** — guia de execução rápida

---

## Resumo em 60 segundos

**Problema:** PRD-018 criou infraestrutura de agentes, mas ninguém estudou **como eles funcionam realmente**.

**Solução:** PRD-019 é um estudo profundo que:
- Define 3 tipos de agentes (reactive, proactive, analytical)
- Implementa 5 agentes reais (2 reactive + 1 proactive + 3 analytical)
- Cria testes automatizados para validar antes de produção
- Implementa métricas de desempenho

**Escopo:** Apenas lógica dos agentes. UI do "AI Studio" é PRD-020+.

---

## Estrutura de Fases

### **Fase 1** — Estrutura + Agente Reactive (whatsapp-inbound)
- T1: Diretórios + tipos base
- T2-T5: Implementar + testar whatsapp-inbound

**Duração estimada:** 1 dia

### **Fase 2** — Proactive + Analytical
- T6: whatsapp-cadence
- T7: 3 agentes analytical
- T8-T10: Factory + integração + seeds

**Duração estimada:** 1.5 dias

### **Fase 3** — Testes + Validação
- T11-T13: Test dataset + validator + métricas
- T14: Validação final

**Duração estimada:** 1 dia

**Total estimado:** 3-3.5 dias

---

## Decisões-Chave (Se Acha Estranho, Leia o DIAGNOSTIC)

| O quê | Decisão | Por quê |
|-------|---------|---------|
| Onde colocar lógica? | `src/services/ai/agents/` | Isolado e testável |
| Stateless ou stateful? | Stateless (por padrão) | Escalável, idempotente |
| Qual LLM? | openai/gpt-4o-mini | Custo-benefício |
| Versionamento? | Não (PRD-021) | Prematura |
| Teste como? | Unit + integration | Rápido + confiável |

---

## Open Questions para Review

Antes de começar a implementar, responder:

1. **Temperature**: Vale usar 0.7 como padrão? Ou varia por agente?
2. **Max tokens**: Global limit ou por skill?
3. **Rate limiting**: Quantas execuções/min por agente?
4. **Fallback**: E se human-handoff falhar?

---

## Critérios de Sucesso

✅ PRD-019 está pronto quando:

- [ ] Todos os 5 agentes implementados
- [ ] T1-T10 concluídos com zero erros de compilação
- [ ] Dataset de test cases criado (3+ per agente)
- [ ] `npm run test` — todos passando
- [ ] `npm run lint` — 0 erros
- [ ] Métricas sendo registradas em cada execução
- [ ] README.md documenta como estender com novos agentes
- [ ] Integração com PRD-012 workflow funcionando

---

## Próximos PRDs

Depois de PRD-019:

1. **PRD-020** — Agent Studio (UI para editar agentes)
2. **PRD-021** — Agent Versioning (versionamento + rollback)
3. **PRD-022** — Multi-Agent Orchestration (agentes chamando agentes)
4. **PRD-023** — Agent Analytics (dashboard de performance)

---

## Como Começa a Implementação?

1. Ler completamente: README → CONTEXT → DIAGNOSTIC → TASKS
2. Responder as Open Questions
3. Criar branch: `git checkout -b prd-019-ai-agents-foundation`
4. Executar tasks na ordem: T1 → T2 → T3 → ... → T14
5. Fazer commits pequenos após cada task
6. Abrir PR quando Fase 1 estiver pronta para review

---

## Dúvidas Comuns

**P: Por que PRD-019 é separado de PRD-012?**
R: PRD-012 é infra (Inngest queue, schema). PRD-019 é lógica de agentes. Separação limpa.

**P: Posso fazer PRD-019 e PRD-012 em paralelo?**
R: Sim! PRD-019 não depende de PRD-012 estar 100% pronto. Ambos podem rodar em paralelo depois que Fase 1-2 de PRD-012 estiverem feitas.

**P: E se o agente quebrar em produção?**
R: Métricas + alertas (T13) vão pegar. Fallback para human-handoff automático.

**P: Qual é a diferença entre Reactive vs Proactive?**
R: Reactive responde a mensagem de usuário. Proactive inicia conversa. Lê CONTEXT.md seção "Tipos de Agentes".
