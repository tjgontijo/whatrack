# Diagnóstico

## Severidade Alta

### 1. Não existe persistência de IA

O schema atual não possui modelos para credenciais, execuções, insights, memória, scores ou sugestões. Sem isso, qualquer chamada de LLM vira efeito colateral difícil de auditar, reprocessar ou explicar.

Impacto:

- impossível rastrear custo e modelo usado;
- impossível revisar por que a IA sugeriu um estágio;
- difícil evitar duplicidade de processamento;
- sem histórico por versão de skill/prompt.

Correção:

- adicionar modelos Prisma específicos para IA;
- registrar cada execução em `AiSkillRun`;
- salvar outputs normalizados por tipo de insight.

### 2. BYOK ainda não tem fronteira multi-tenant

`src/lib/env/env.ts` já aceita chaves globais como `OPENAI_API_KEY` e `GOOGLE_API_KEY`, mas BYOK exige credenciais por cliente/projeto, criptografia, health check e mascaramento.

Impacto:

- risco de cobrança no provider errado;
- risco de vazamento em logs ou responses;
- falta de controle por organização;
- dificuldade para desabilitar IA por tenant.

Correção:

- criar `AiProviderCredential`;
- criptografar segredo usando `ENCRYPTION_KEYS`;
- resolver provider/modelo por tenant;
- impedir qualquer retorno do segredo ao client.

### 3. Executar IA inline no webhook seria perigoso

`message.handler.ts` já faz trabalho crítico de ingestão, criação de lead/conversa/deal, dados operacionais e realtime. Adicionar LLM ali aumentaria latência e risco de falha no recebimento de mensagens.

Impacto:

- webhook mais lento;
- retry duplicado pelo provider;
- custo e falha de IA afetando CRM;
- pior experiência de realtime.

Correção:

- enfileirar job após persistência;
- worker processa IA fora do caminho crítico;
- retry/idempotência por `conversationId`, `messageId` e `skillVersion`.

## Severidade Média

### 4. Falta builder de contexto semântico para IA

Hoje há serviços de query para inbox, mas não há um builder dedicado para transformar mensagens, memória anterior, tags, deal e fatos do PRD-008 em contexto compacto e estável para IA.

Impacto:

- prompts inconsistentes;
- mais tokens que o necessário;
- risco de enviar dados sensíveis;
- baixa reprodutibilidade.

Correção:

- criar `conversation-ai-context.service.ts`;
- retornar DTO validado;
- limitar mensagens e campos;
- incluir resumo anterior quando existir.
- consumir os fatos determinísticos do PRD-008 em vez de recalcular métricas.

### 5. Não há registry/versionamento de skills

Sem registry, prompts e schemas tendem a ficar espalhados. Isso dificulta evolução, replay e comparação de qualidade.

Impacto:

- regressões silenciosas;
- dificuldade de avaliar mudanças;
- outputs incompatíveis entre versões.

Correção:

- criar `ai-skill-registry.ts`;
- toda skill deve ter `id`, `version`, `inputSchema`, `outputSchema`, `costPolicy` e `run`.

### 6. APIs da inbox ainda não expõem insights

`listWhatsAppChats`, `listWhatsAppChatMessages` e `getConversationOpenDeal` ainda retornam dados operacionais, mas não retornam memória, score ou sugestões.

Impacto:

- UI não consegue mostrar IA sem endpoints adicionais;
- risco de misturar queries de IA em componentes.

Correção:

- criar endpoint read-only para insights da conversa;
- ou estender `conversation-deal.service.ts` com uma seção `aiInsights`.

### 7. Falta ledger de custo, latência e erro

BYOK reduz cobrança interna, mas ainda precisamos registrar uso para transparência, suporte e segurança.

Impacto:

- sem visibilidade de abuso;
- sem alertas por falha de provider;
- sem base para planos futuros.

Correção:

- persistir tokens, latência, provider, modelo, status e erro sanitizado em `AiSkillRun`;
- opcionalmente consolidar em `AiUsageLedger`.

## Severidade Baixa

### 8. UI ainda não tem estados de IA

A inbox precisará de estados para carregando, sem provider configurado, erro, insight desatualizado e sugestão pronta.

Impacto:

- experiência confusa;
- operador pode interpretar falta de insight como ausência de risco.

Correção:

- adicionar cards compactos no `DealPanel`;
- manter comandos read-only no MVP.

### 9. ICP precisa de tela ou relatório dedicado

O `icp-miner` é batch e não pertence à conversa individual. Ele precisa de relatório por período, filtros e histórico.

Impacto:

- relatório de ICP pode virar dado solto sem governança.

Correção:

- persistir `AiIcpReport`;
- criar listagem posterior em analytics/settings.

## Riscos de Produto

- Usuário confiar demais em score sem evidência.
- Sugestão de pipeline parecer automação quando é apenas recomendação.
- Memória resumida perder detalhes importantes.
- ICP refletir vieses de atendimento ou campanhas antigas.
- Custos de tokens crescerem se o contexto não for limitado.

## Riscos Técnicos

- Duplicidade de jobs em retries de webhook.
- Falta de idempotência por conversa/mensagem.
- Quebra de tenant isolation em queries de contexto.
- Logs acidentais com PII ou chaves.
- Dependência excessiva de API específica do Mastra.

## Princípios de Mitigação

- IA nunca bloqueia ingestão de mensagens.
- Toda saída de LLM passa por schema Zod.
- Toda sugestão vem com evidências e confiança.
- Toda execução é auditável.
- Toda query passa por `organizationId` e `projectId`.
- Chaves BYOK ficam server-side e criptografadas.
- Mastra orquestra, Prisma persiste.
