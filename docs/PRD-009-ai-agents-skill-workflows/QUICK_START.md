# Quick Start

## Objetivo do MVP

Entregar IA read-only na inbox de WhatsApp:

- memória da conversa;
- score do lead;
- sugestão de estágio do pipeline;
- próxima ação recomendada;
- status de processamento.

Sem envio de mensagens e sem alteração automática de estágio.

## Sequência de Implementação

### 1. Criar branch

```bash
git checkout -b feature/ai-agents-skill-workflows
```

### 2. Instalar dependências

Confirmar packages atuais antes de instalar.

```bash
npm install @mastra/core ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### 3. Adicionar modelos Prisma

Editar `prisma/schema.prisma` com os modelos de IA.

Depois rodar:

```bash
npx prisma migrate dev --name add-ai-agents-skill-workflows
npx prisma generate
```

### 4. Criar feature `src/features/ai`

Começar por:

```text
src/features/ai/provider/
src/features/ai/runtime/
src/features/ai/mastra/
src/features/ai/skills/
src/features/ai/repositories/
src/features/ai/services/
src/features/ai/schemas/
```

Seguir a arquitetura por feature do projeto:

- API routes finas;
- services com regra de negócio;
- repositories para Prisma;
- schemas Zod próximos da feature;
- componentes client apenas onde necessário.

### 5. Implementar BYOK antes das skills

Não começar prompts antes de resolver provider/credenciais.

Checklist:

- salvar chave criptografada;
- mascarar chave;
- resolver provider por tenant;
- bloquear retorno da chave;
- sanitizar logs;
- health check server-side.

### 6. Implementar `AiSkillRun`

Toda execução de skill deve criar registro com:

- skill;
- versão;
- provider;
- modelo;
- status;
- tokens;
- latência;
- erro sanitizado;
- hash de input.

Sem isso, não há auditoria nem suporte.

### 7. Criar builder de contexto

Criar service que recebe:

- `organizationId`;
- `projectId`;
- `conversationId`;
- opcionalmente `messageId`.

E retorna contexto limitado:

- mensagens recentes;
- lead;
- deal aberto;
- estágio;
- tags;
- fatos determinísticos do PRD-008;
- memória anterior.

### 8. Implementar workflow Mastra

Workflow inicial:

```text
conversation-intelligence
  -> build context
  -> conversation-memory
  -> lead-score
  -> pipeline-orchestrator
  -> next-best-action
  -> persist insights
```

Para o MVP, `auto-tagging` pode entrar depois se o tempo apertar.

### 9. Enfileirar no handler de mensagem

Em `src/features/whatsapp/services/handlers/message.handler.ts`, após persistência da mensagem e atualização dos dados operacionais:

- enfileirar job `conversation-ai-analysis`;
- não aguardar LLM;
- tratar erro de enqueue sem quebrar webhook;
- usar idempotência.

### 10. Expor insights na inbox

Criar endpoint read-only ou estender query existente para o painel lateral.

Dados mínimos:

- `processingStatus`;
- `memory`;
- `leadScore`;
- `pipelineSuggestion`;
- `nextBestAction`;
- `lastRunAt`.

### 11. Adicionar UI no `DealPanel`

Adicionar cards compactos:

- Score IA;
- Sugestão de estágio;
- Próxima ação;
- Memória.

Texto deve deixar claro que a IA recomenda, não executa.

## Comandos de Validação

```bash
npx prisma generate
npx tsc --noEmit --pretty false
npx biome lint .
```

Se houver testes na feature:

```bash
npx vitest run src/features/ai
```

## Checklist de Segurança

- Chave BYOK nunca vai para o browser.
- Chave BYOK nunca aparece em logs.
- Prompt não inclui access tokens.
- Prompt não inclui payload bruto de webhook.
- Output de LLM sempre passa por Zod.
- Toda query tem `organizationId` e `projectId`.
- Falha de IA não falha webhook.
- Sugestão de pipeline não muda estágio automaticamente.

## Definition of Done do MVP

- Usuário configura provider BYOK.
- Nova mensagem dispara job assíncrono.
- Worker executa workflow de conversa.
- Memória, score e sugestão são persistidos.
- Inbox exibe insights read-only.
- Toda execução aparece em `AiSkillRun`.
- Build TypeScript passa.
- Nenhuma mensagem é enviada pela IA.
