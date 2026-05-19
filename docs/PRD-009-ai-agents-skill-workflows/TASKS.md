# Tasks

## Fase 1: Fundação

### AI-001: Instalar dependências de IA

Severidade: Alta  
Estimativa: 2h

Instalar Mastra, AI SDK e providers iniciais. Confirmar nomes de packages conforme versão atual antes de implementar.

Comandos previstos:

```bash
npm install @mastra/core ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

Critérios de aceite:

- dependências adicionadas em `package.json`;
- build TypeScript reconhece imports;
- nenhum provider é chamado no client.

### AI-002: Criar modelos Prisma de IA

Severidade: Alta  
Estimativa: 6h

Adicionar modelos:

- `AiProviderCredential`
- `AiSkillRun`
- `AiConversationMemory`
- `AiLeadScore`
- `AiPipelineSuggestion`
- `AiNextBestAction`
- `AiLeadTagSuggestion`
- `AiIcpReport`

Campos mínimos comuns:

- `id`
- `organizationId`
- `projectId`
- `createdAt`
- `updatedAt`

Campos mínimos de `AiSkillRun`:

- `skillId`
- `skillVersion`
- `status`
- `provider`
- `model`
- `inputHash`
- `output`
- `error`
- `startedAt`
- `finishedAt`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `latencyMs`

Critérios de aceite:

- migration criada;
- índices por tenant/conversa/deal;
- relações com `Organization`, `Project`, `Lead`, `Conversation`, `Deal` quando aplicável;
- `npx prisma generate` passa.

### AI-003: Implementar BYOK criptografado

Severidade: Alta  
Estimativa: 8h

Criar:

- `src/features/ai/provider/ai-provider-credential.repository.ts`
- `src/features/ai/provider/ai-provider-credential.service.ts`
- `src/features/ai/provider/ai-encryption.service.ts`
- `src/features/ai/provider/byok-model-resolver.ts`

Critérios de aceite:

- segredo criptografado antes de persistir;
- segredo nunca retorna para client;
- logs não imprimem segredo;
- provider pode ser desabilitado por tenant;
- fallback para env global só ocorre se explicitamente permitido.

### AI-004: Criar contrato skill-first

Severidade: Alta  
Estimativa: 6h

Criar runtime:

- `define-ai-skill.ts`
- `ai-skill-registry.ts`
- `ai-skill-runner.ts`
- `ai-agent-run.service.ts`

Contrato mínimo:

```ts
type AiSkillDefinition<Input, Output> = {
  id: string;
  version: string;
  inputSchema: ZodSchema<Input>;
  outputSchema: ZodSchema<Output>;
  run(input: Input, context: AiRunContext): Promise<Output>;
};
```

Critérios de aceite:

- toda skill registra id e versão;
- input/output são validados por Zod;
- execução cria `AiSkillRun`;
- erro é sanitizado antes de persistir.

### AI-005: Integrar Mastra como runtime de workflow

Severidade: Alta  
Estimativa: 8h

Criar:

- `src/features/ai/mastra/index.ts`
- `src/features/ai/mastra/workflows/conversation-intelligence.workflow.ts`
- `src/features/ai/mastra/workflows/icp-mining.workflow.ts`
- tools de leitura/salvamento via services.

Critérios de aceite:

- workflow roda skills em sequência controlada;
- Mastra não acessa Prisma diretamente fora das tools/services;
- outputs são persistidos via services da feature;
- workflow pode ser executado por worker.

### AI-006: Enfileirar análise após mensagem nova

Severidade: Alta  
Estimativa: 4h

Adicionar job `conversation-ai-analysis` após a transação principal em `message.handler.ts`.

Critérios de aceite:

- webhook não espera LLM;
- job é idempotente por conversa/mensagem;
- falha de IA não quebra ingestão;
- worker consegue reprocessar conversa.

## Fase 2: Skills de Conversa e Negociação

### AI-007: Criar builder de contexto da conversa

Severidade: Alta  
Estimativa: 8h

Criar service para carregar:

- últimas mensagens relevantes;
- memória anterior;
- lead;
- deal aberto;
- estágio atual;
- tags;
- fatos determinísticos do PRD-008;
- tracking resumido.

Critérios de aceite:

- DTO validado;
- limites de mensagens/tokens;
- filtros por tenant;
- campos sensíveis excluídos.

### AI-008: Implementar `conversation-memory`

Severidade: Alta  
Estimativa: 8h

Gerar e atualizar memória incremental da conversa.

Critérios de aceite:

- memória tem tópicos estruturados;
- mantém histórico/versionamento;
- UI consegue ler a última versão;
- evidências apontam mensagens ou trechos curtos permitidos.

### AI-009: Implementar `lead-score`

Severidade: Alta  
Estimativa: 8h

Calcular score com dimensões comerciais.

Critérios de aceite:

- score total entre 0 e 100;
- dimensões individuais entre 0 e 100;
- justificativa curta;
- confiança;
- fatores positivos/negativos.

### AI-010: Implementar `pipeline-orchestrator`

Severidade: Alta  
Estimativa: 10h

Sugerir estágio do pipeline a partir da conversa e do deal.

Critérios de aceite:

- não altera estágio automaticamente;
- retorna estágio sugerido, confiança e evidências;
- identifica quando deve manter estágio atual;
- registra sugestão em `AiPipelineSuggestion`.

### AI-011: Implementar `next-best-action` e `auto-tagging`

Severidade: Média  
Estimativa: 8h

Criar skills complementares.

Critérios de aceite:

- próxima ação humana clara;
- tags sugeridas sem aplicar automaticamente;
- outputs persistidos e auditáveis.

## Fase 3: UI e APIs

### AI-012: Criar endpoints read-only de insights

Severidade: Alta  
Estimativa: 6h

Criar ou estender endpoints da inbox para retornar:

- memória;
- lead score;
- sugestão de pipeline;
- próxima ação;
- tags sugeridas;
- status de processamento.

Critérios de aceite:

- valida tenant/permissão;
- não retorna prompts, chaves ou payload bruto;
- retorna estados `pending`, `ready`, `error`, `not_configured`.

### AI-013: Adicionar cards no DealPanel

Severidade: Média  
Estimativa: 8h

Adicionar seção compacta em `src/features/whatsapp/components/inbox/deal-panel.tsx`.

Cards sugeridos:

- Score IA;
- Próxima ação;
- Sugestão de estágio;
- Memória;
- Risco.

Critérios de aceite:

- UI deixa claro que são sugestões;
- não existe botão de envio automático;
- não aplica estágio sem ação humana;
- estados vazios e erro são tratados.

### AI-014: Criar settings BYOK

Severidade: Média  
Estimativa: 12h

Criar tela/admin para configurar provider/modelo por tenant.

Critérios de aceite:

- salvar credencial criptografada;
- testar conexão sem expor chave;
- mascarar chave existente;
- permitir desativar provider.

## Fase 4: ICP e Qualidade

### AI-015: Implementar `icp-miner`

Severidade: Média  
Estimativa: 16h

Job batch por período para analisar conversas e resultados.

Critérios de aceite:

- filtra por período/projeto;
- usa amostra controlada;
- gera relatório estruturado;
- persiste `AiIcpReport`;
- não trava workers de realtime.

### AI-016: Criar evals e fixtures

Severidade: Média  
Estimativa: 10h

Criar fixtures anonimizadas e testes de contrato.

Critérios de aceite:

- schemas recusam outputs inválidos;
- casos conhecidos geram estágio esperado;
- score é estável dentro de tolerância;
- prompts podem ser comparados por versão.

### AI-017: Observabilidade e custos

Severidade: Média  
Estimativa: 8h

Adicionar dashboards/logs internos para:

- status por skill;
- falhas por provider;
- latência;
- tokens;
- custo estimado quando aplicável.

Critérios de aceite:

- suporte consegue diagnosticar falha sem ver chave;
- cada insight aponta para execução;
- jobs com erro podem ser reprocessados.

## Ordem Recomendada

1. AI-001
2. AI-002
3. AI-003
4. AI-004
5. AI-005
6. AI-007
7. AI-006
8. AI-008
9. AI-009
10. AI-010
11. AI-012
12. AI-013
13. AI-011
14. AI-014
15. AI-015
16. AI-016
17. AI-017

## Estimativa Total

Estimativa inicial: 126h a 142h.

MVP útil para inbox com memória, score e sugestão de pipeline: 66h a 86h.
