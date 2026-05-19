# PRD-009: AI Agents Skill Workflows

## Resumo

Implementar uma camada de IA **skill-first** para analisar semanticamente conversas de WhatsApp e negociações sem enviar mensagens automaticamente. A primeira entrega atua na inbox read-only em `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/inbox`, criando memória, score interpretativo, sugestões de pipeline, tags semânticas e próximos passos para apoiar o operador comercial.

O desenho recomendado usa **Mastra** como runtime de agentes e workflows, **Vercel AI SDK** como camada de modelos/provedores, **Prisma** como fonte de verdade, **Redis/BullMQ ou fila existente** para execução assíncrona e **BYOK** com credenciais criptografadas por organização/projeto.

## Objetivos

- Criar infraestrutura multi-tenant para executar agentes de IA com auditoria, versionamento e reprocessamento.
- Permitir BYOK por organização/projeto/provedor, sem expor chaves ao cliente.
- Enfileirar análise de IA após mensagens recebidas, sem aumentar risco no webhook do WhatsApp.
- Entregar inteligência read-only na inbox: memória da conversa, lead score interpretativo, sugestão de estágio, próximos passos e tags semânticas.
- Manter mudanças de pipeline como sugestão no MVP, exigindo confirmação humana.
- Preparar base para relatórios de ICP e mineração de padrões comerciais por período.
- Consumir os fatos determinísticos do PRD-008, sem recalcular KPIs operacionais dentro dos agentes.

## Fora de Escopo Inicial

- Envio automático de mensagens via IA.
- Mudança automática de estágio sem aprovação humana.
- Treinamento/fine-tuning de modelos.
- RAG amplo com base documental da empresa.
- Calcular KPIs determinísticos, sinais de SLA, horário, janela, estágio parado ou volume de mensagens. Isso pertence ao PRD-008.
- Expor prompts completos, mensagens sensíveis ou chaves em logs/client responses.

## Decisão Arquitetural

Usaremos Mastra para orquestrar agentes e workflows porque o produto desejado é mais que uma chamada isolada de LLM. Precisamos de steps, skills versionadas, reprocessamento, observabilidade, execução assíncrona, evals e coordenação entre agentes como `conversation-memory`, `lead-score`, `pipeline-orchestrator` e `icp-miner`.

Mastra não deve virar fonte de verdade nem acessar banco diretamente em agentes soltos. A fronteira correta é:

- **Prisma/repositories/services**: dados, tenant scope, permissões, persistência e transações.
- **Mastra workflows/agents**: sequência de execução, roteamento entre skills, retries e composição.
- **AI SDK/provider adapter**: seleção de provider/modelo e execução BYOK.
- **Fila/worker**: desacoplar IA do webhook e da renderização da inbox.

## Entregas

1. Infra de IA em `src/features/ai`.
2. Modelos Prisma para credenciais, execuções e insights.
3. Runtime skill-first com registry, schemas Zod e versionamento.
4. Workflow de inteligência de conversa acionado por mensagens novas.
5. Cards read-only na inbox/deal panel.
6. Settings para BYOK e seleção de modelos.
7. Job batch para ICP por período.
8. Testes unitários de services/schemas e fixtures para evals.

## Dependência

Este PRD depende conceitualmente do `PRD-008-deterministic-conversation-intelligence`. Os agentes recebem os fatos calculados por ele como contexto estruturado e focam na interpretação semântica da conversa.

## Referências Técnicas

- Mastra Agents: https://mastra.ai/ai-agents
- Mastra Workflows: https://mastra.ai/ai-workflows
- Vercel AI SDK Agents: https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk
- AI SDK Providers: https://ai-sdk.dev/providers/ai-sdk-providers
- Vercel AI Gateway BYOK: https://vercel.com/docs/ai-gateway/authentication-and-byok/byok
- Vercel AI Gateway + Mastra: https://vercel.com/docs/ai-gateway/ecosystem/framework-integrations/mastra
