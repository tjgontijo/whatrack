# DIAGNOSTIC.md: AI Agents Foundation

## Decisões Técnicas

### 1. **Onde vive a lógica de um agente?**

**Decisão:** Em `src/services/ai/agents/` — uma pasta por tipo de agente.

```
src/services/ai/agents/
├── reactive/
│   ├── whatsapp-inbound.agent.ts
│   └── whatsapp-inbound.spec.ts
├── proactive/
│   ├── whatsapp-cadence.agent.ts
│   └── whatsapp-cadence.spec.ts
└── analytical/
    ├── audience-intelligence.agent.ts
    └── audience-intelligence.spec.ts
```

**Por que:**
- Separação clara por tipo
- Fácil de localizar e testar
- Cada agente é uma "mini-aplicação"

---

### 2. **Como um agente executa?**

**Decisão:** Via `executeAgent()` — função genérica que orquestra.

```typescript
interface AgentExecutionInput {
  agentSlug: string
  context: AgentContext          // dados do lead/conversa/ticket
  input: string | Record<...>    // mensagem ou payload
}

export async function executeAgent(input: AgentExecutionInput): Promise<Result<AgentExecutionOutput>>
```

**O que ela faz:**
1. Valida agente existe
2. Carrega configuração do projeto (modelId, temperature)
3. Resgata contexto relevante (lead data, histórico)
4. Chama o agente específico
5. Registra em AiEvent
6. Retorna resultado

**Testável?** Sim — cada passo é independente, mockável.

---

### 3. **Como testamos um agente antes de produção?**

**Decisão:** Com dataset de test cases + métricas.

**Test case:**
```typescript
{
  name: 'Responde "pricing" quando perguntado sobre preço',
  input: 'Quanto custa?',
  expectedSkill: 'send-pricing',
  expectedMetrics: {
    latency: '< 2s',
    accuracy: '>= 90%',
  }
}
```

**Fluxo de validação:**
1. Executar agente contra dataset
2. Comparar resultado esperado vs real
3. Gerar relatório de desempenho
4. Aprovar antes de publicar

---

### 4. **Qual é o "estado" de um agente?**

**Decisão:** Agentes são **stateless por padrão**.

- **Reactive agents:** não mantêm estado (input → output)
- **Proactive agents:** mantêm estado em `AiCadenceEnrollment` ou tabela específica
- **Analytical agents:** consultam estado em query-time

**Por que stateless é melhor:**
- Escalável (sem lock de estado)
- Previsível (mesmo input = mesmo output)
- Testável (sem side effects)
- Idempotente (seguro para retry)

---

### 5. **Qual LLM usamos por padrão?**

**Decisão:** `openai/gpt-4o-mini`

**Opções consideradas:**
- ❌ gpt-4 — caro, desnecessário para tarefas simples
- ✅ gpt-4o-mini — bom custo-benefício, rápido
- ❌ groq — mais barato, mas menos confiável

**Trade-off:**
- Podemos mudar por projeto (AiAgentProjectConfig.config.modelId)
- Podemos testar novo modelo em DRAFT antes de publicar

---

### 6. **Como versionamos agentes?**

**Decisão:** Versionamento em PRD-021, não no V1.

**Razão:** Adiciona complexidade prematura. V1 assume:
- 1 agente = 1 configuração ativa
- Mudanças de prompt = update no lugar
- Rollback manual (via git se necessário)

**Quando implementar versionamento:**
- Múltiplos usuários editando agentes
- A/B testing de prompts
- Auditoria de mudanças

---

### 7. **Como monitoramos desempenho?**

**Decisão:** Métricas via `AiEvent` aggregation + dashboard em PRD-023.

**Metrics calculadas:**
- Taxa de sucesso/erro
- Latência média
- Skills mais usadas
- Taxa de escalação
- Custo em tokens

**Como capturamos:**
```typescript
// Em cada execução de agente
await AiEventService.record({
  type: 'AGENT_EXECUTION',
  agentSlug: 'whatsapp-inbound',
  success: result.success,
  duration: endTime - startTime,
  tokensUsed: result.tokens,
  skillUsed: result.skillSlug,
})
```

---

### 8. **Prompt Engineering — como documentamos?**

**Decisão:** Prompts vivem no banco (AiAgent.defaultPrompt) + versionamento em code-as-config.

**Por que no banco:**
- Podem ser atualizados sem deploy
- Histórico de mudanças
- A/B testing futuro

**Estrutura:**
```prisma
model AiAgent {
  ...
  defaultPrompt String  // versão ativa
  draftPrompt String?   // em edição
}
```

---

### 9. **Erro em um agente — o que fazer?**

**Decisão:** Fallback automático + logging.

**Estratégia:**
- Agente tira erro → fallback para skill "human-handoff"
- Log do erro em AiEvent (type: 'AGENT_ERROR')
- Alert para team se taxa de erro > 10% em 1h

```typescript
try {
  result = await agent.execute(input)
} catch (err) {
  await AiEventService.record({
    type: 'AGENT_ERROR',
    agentSlug: agent.slug,
    error: err.message
  })
  result = await skillRunner.run('human-handoff', context)
}
```

---

### 10. **Qual é o escopo de "teste" neste PRD?**

**Decisão:** Testes unitários + integration tests. E2E em PRD-012 (smoke test).

| Tipo | O quê | Onde |
|------|-------|------|
| **Unit** | Lógica isolada de um agente | `agents/*.spec.ts` |
| **Integration** | Agente + AiEvent + services | `agents/*.integration.spec.ts` |
| **Smoke** | Agente respondendo real | PRD-012 T17 |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Agente dá resposta errada | Usuário fica confuso | Testes + revisão de prompts |
| Latência alta (>10s) | Experiência ruim | Limitar tokens, usar mini model |
| LLM refuses resposta | Silêncio para usuário | Fallback automático |
| Inconsistência entre prompts | Confusão | Documentar padrão no README |
| Custo de tokens explode | $ | Monitoramento + alertas |

---

## Open Questions

1. **Temperature**: Qual valor para cada tipo? (Hoje: 0.7 default)
2. **Max tokens**: Limite global? Ou por agente?
3. **Rate limiting**: Quantas execuções/min por agente?
4. **Fallback**: E se human-handoff falhar também?

**Resolverem em:** Reunião de review do PRD-019
