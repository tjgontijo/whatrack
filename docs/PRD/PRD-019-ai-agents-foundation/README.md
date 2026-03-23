# PRD-019: AI Agents Foundation

**Version:** 1.0
**Date:** 2026-03-23
**Status:** Discovery Phase

---

## O que é esse PRD?

PRD-018 e PRD-012 implementaram a **infraestrutura** dos agentes (schema, Mastra setup, Inngest queue, runtime). Mas **ninguém estudou realmente como os agentes funcionam**.

PRD-019 é um estudo profundo sobre:

1. **Tipos de agentes** — reactive, proactive, analytical
2. **Ciclo de vida** — como um agente é criado, testado, publicado
3. **Capabilities** — o que cada agente pode fazer
4. **Configuração** — modelos, prompts, limites
5. **Testes** — como validar um agente antes de produção
6. **Monitoramento** — métricas de sucesso/falha

---

## O que NÃO é esse PRD?

- Não é criar a UI do "AI Studio completo"
- Não é implementar blueprints customizadas por usuário
- Não é integração com múltiplos LLMs
- Não é observabilidade rica

---

## Escopo

Este PRD define:

✅ **Tipos de agentes** com exemplos concretos
✅ **Ciclo de vida** de um agente (draft → published → active → archived)
✅ **Prompt engineering baseline** para cada tipo
✅ **Testes automatizados** de agentes
✅ **Métricas e alertas** de desempenho
✅ **Versionamento de agentes**

---

## Próximos passos

1. Ler `CONTEXT.md` — arquitetura de agentes
2. Ler `DIAGNOSTIC.md` — decisões técnicas
3. Ler `TASKS.md` — tarefas de implementação
4. Revisar e aprovar antes de iniciar

---

## Dependências

- **PRD-018** ✅ (Mastra, AiEvent, AiAgentRegistryService)
- **PRD-012** (em execução) — runtime base

Não há bloqueadores. PRD-019 pode começar em paralelo com PRD-012 na Fase 3.
