# Contexto

## Estado Atual do Produto

A aplicação já possui uma inbox de WhatsApp read-only em:

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/inbox/page.tsx`
- `src/features/whatsapp/components/inbox/chat-window.tsx`
- `src/features/whatsapp/components/inbox/deal-panel.tsx`

A UI atual lista conversas, renderiza mensagens e mostra informações da negociação aberta. O rodapé do chat comunica que a resposta ocorre pelo app do WhatsApp, o que confirma a restrição de produto: **a IA não deve enviar mensagens nesta fase**.

O backend de listagem passa por:

- `src/app/api/v1/whatsapp/chats/route.ts`
- `src/app/api/v1/whatsapp/chats/[leadId]/messages/route.ts`
- `src/features/whatsapp/services/whatsapp-chat-query.service.ts`
- `src/features/conversations/services/conversation-deal.service.ts`

A ingestão de mensagens acontece em:

- `src/features/whatsapp/services/handlers/message.handler.ts`

Esse handler cria ou atualiza `Lead`, `Conversation`, `Deal`, `Message`, dados operacionais e eventos de realtime. Ele é o ponto ideal para **enfileirar** análise de IA depois da transação principal, mas não deve executar LLM inline.

## Modelos Relevantes

Modelos existentes em `prisma/schema.prisma` que a IA deve usar como contexto:

- `Organization`, `Project`, `Member`, `OrganizationRole`
- `Lead`, `Conversation`, `Message`
- `Deal`, `DealStage`, `DealTracking`
- `LeadTag`, `LeadTagAssignment`
- `Sale`, `SaleItem`, `Item`, `ItemCategory`
- `WhatsAppConfig`, `WhatsAppConnection`, `WhatsAppWebhookLog`
- `MetaAttributionHistory`, `MetaConversionEvent`

Não existem modelos específicos para IA hoje. Isso impede auditoria, histórico de execuções, BYOK por tenant, reprocessamento e exibição confiável de insights.

## Infra Existente Aproveitável

Dependências e infraestrutura já presentes:

- `prisma` para persistência.
- `zod` para validação de entrada/saída.
- `ioredis` e `bullmq` disponíveis no projeto.
- `src/lib/db/queue.ts` com base de fila/locks em Redis.
- `src/server/workers/index.ts` e `src/worker.ts` para workers.
- `src/lib/env/env.ts` com `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `REDIS_URL` e chaves de criptografia.

Essa base reduz o custo de implementar IA assíncrona, mas ainda falta uma feature dedicada para IA.

## Providers e BYOK

O produto deve suportar BYOK. A recomendação é criar uma camada própria de credenciais por tenant e usar o AI SDK como adaptador de providers. O AI Gateway pode ser suportado depois como provider opcional, mas o desenho inicial deve funcionar com chamadas diretas usando a chave do cliente.

Escopo mínimo de providers:

- OpenAI
- Anthropic
- Google
- Groq ou outro provider de baixo custo/latência, se fizer sentido comercial

As chaves devem ser:

- criptografadas no banco;
- escopadas por `organizationId`, opcionalmente `projectId`;
- nunca retornadas para cliente;
- mascaradas em UI;
- nunca logadas;
- validadas por health check server-side.

## Arquitetura Proposta

Estrutura sugerida:

```text
src/features/ai/
  provider/
    ai-provider-credential.repository.ts
    ai-provider-credential.service.ts
    byok-model-resolver.ts
    ai-encryption.service.ts
  runtime/
    define-ai-skill.ts
    ai-skill-registry.ts
    ai-skill-runner.ts
    ai-agent-run.service.ts
    ai-job-producer.ts
  mastra/
    index.ts
    workflows/conversation-intelligence.workflow.ts
    workflows/icp-mining.workflow.ts
    agents/conversation-memory.agent.ts
    agents/lead-score.agent.ts
    agents/pipeline-orchestrator.agent.ts
    tools/read-conversation-context.tool.ts
    tools/save-ai-insight.tool.ts
  skills/
    conversation-memory/
    lead-score/
    pipeline-orchestrator/
    auto-tagging/
    next-best-action/
    icp-miner/
  repositories/
  services/
  schemas/
  components/
```

Os nomes de packages Mastra e AI SDK devem ser confirmados na implementação conforme a versão atual da documentação. A decisão de arquitetura não depende de APIs específicas de uma versão.

## Skills Iniciais

### `conversation-memory`

Mantém uma memória resumida e incremental da conversa:

- dados importantes do lead;
- dores, objetivos e objeções;
- orçamento, prazo, urgência e autoridade;
- preferências e próximos passos;
- pontos pendentes para o vendedor.

Persistência sugerida: `AiConversationMemory`.

### `lead-score`

Calcula score comercial interpretativo com base no conteúdo da conversa, deal, tracking e fatos estruturados vindos do PRD-008:

- fit;
- intenção;
- urgência;
- autoridade;
- orçamento;
- engajamento;
- clareza de necessidade.

Persistência sugerida: `AiLeadScore`.

### `pipeline-orchestrator`

Sugere estágio do pipeline, mas não altera automaticamente no MVP:

- estágio atual;
- estágio sugerido;
- confiança;
- evidências;
- motivo;
- ações recomendadas.

Persistência sugerida: `AiPipelineSuggestion`.

### `auto-tagging`

Sugere tags de lead a partir de padrões de conversa:

- problema principal;
- segmento;
- intenção;
- urgência;
- status de qualificação.

Persistência sugerida: `AiLeadTagSuggestion`.

### `next-best-action`

Sugere próxima ação humana:

- perguntar orçamento;
- confirmar necessidade;
- enviar proposta;
- pedir confirmação;
- fazer follow-up;
- marcar como baixa intenção.

Persistência sugerida: `AiNextBestAction`.

### `icp-miner`

Analisa conversas por período para traçar ICP:

- perfil de leads com maior conversão;
- dores mais frequentes;
- objeções recorrentes;
- canais/campanhas mais promissores;
- sinais de má qualificação;
- recomendações para marketing e vendas.

Persistência sugerida: `AiIcpReport`.

## Fluxo Principal

1. WhatsApp webhook recebe mensagem.
2. `message.handler.ts` salva `Message`, atualiza `Conversation`, `Lead`, `Deal` e dados operacionais.
3. Após commit, enfileira `conversation-ai-analysis`.
4. Worker carrega mensagens recentes, memória anterior e fatos estruturados do PRD-008.
5. Mastra executa workflow `conversation-intelligence`.
6. Skills geram saídas validadas por Zod.
7. Services persistem insights e `AiSkillRun`.
8. Inbox busca insights por API e exibe cards read-only.

## Dados de Contexto para IA

O contexto enviado ao modelo deve ser minimizado:

- últimas mensagens relevantes;
- resumo anterior, se existir;
- estágio atual e histórico mínimo do deal;
- fatos determinísticos já calculados pelo PRD-008;
- tags atuais;
- tracking de campanha quando útil;
- metadados não sensíveis.

Não enviar:

- access tokens;
- chaves de API;
- raw webhook completo;
- payloads com segredos;
- campos irrelevantes para decisão comercial.

## Relação com PRD-008

O PRD-009 não calcula métricas determinísticas. Ele consome o DTO produzido pelo PRD-008, por exemplo SLA, volume, janela, idade do deal, estágio parado e sinais de horário.

Responsabilidade deste PRD:

- interpretar intenção, objeções, dores e contexto semântico;
- resumir memória da conversa;
- sugerir avanço de pipeline com justificativa textual;
- sugerir tags semânticas;
- gerar próximos passos humanos;
- minerar ICP com base no conteúdo das conversas.

Responsabilidade do PRD-008:

- calcular tempos, contagens, buckets, janelas, SLA e regras operacionais;
- expor esses fatos como input estruturado para os agentes.
