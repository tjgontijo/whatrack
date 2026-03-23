# Diagnostic: Core Runtime WhatsApp AI

**Data:** 2026-03-23
**Status:** Revised

---

## Resumo Executivo

- O problema central do produto hoje e arquitetura passiva demais para atendimento automatizado.
- O risco principal da V1 e envio duplicado de outbound se o workflow nao for idempotente.
- O impacto esperado da V1 e colocar o fluxo inbound automatizado no ar sem carregar toda a plataforma junto.

---

## Problemas Encontrados

### 1. IA Atual E Passiva E Lenta

**Problema:** a arquitetura atual depende de classificacao assincrona por cron e aprovacao humana posterior.

**Impacto:**
- nao existe atendimento automatizado real
- a latencia e incompatível com conversa de WhatsApp

**Solucao Necessaria:**
1. trocar cron por Inngest
2. trocar `AiInsight` por execucao direta de skill

### 2. Sem Memoria Persistida De Conversa

**Problema:** cada execucao reconstrói contexto sem um `ConversationState` persistido.

**Impacto:**
- respostas inconsistentes
- custo de tokens desnecessario

**Solucao Necessaria:**
1. criar `AiConversationState`
2. salvar `state` e `pendingMessages`

### 3. Configuracao Atual Nao Segue O Runtime Real

**Problema:** a configuracao legada nao reflete o escopo por projeto e por instancia do WhatsApp.

**Impacto:**
- risco de contexto incorreto entre projetos
- dificuldade de operar mais de um projeto na mesma organizacao

**Solucao Necessaria:**
1. mover config principal para `AiProjectConfig`
2. deixar `instanceId` apenas no runtime/transporte

### 4. Transporte Outbound Do Agente Nao Existe

**Problema:** o produto nao tem hoje uma camada de envio de texto livre pensada para o agente.

**Impacto:**
- o runtime poderia decidir corretamente e ainda assim nao responder ao cliente

**Solucao Necessaria:**
1. adicionar envio de texto livre em `MetaCloudService`
2. criar `whatsapp-ai-send.service.ts`

### 5. Falta Idempotencia No Outbound

**Problema:** um retry do workflow pode repetir envio se a mensagem ja saiu e o estado nao foi consolidado.

**Impacto:**
- cliente recebe respostas duplicadas
- log e estado divergem do transporte real

**Solucao Necessaria:**
1. gerar `executionKey` por snapshot de buffer
2. deduplicar no workflow antes do send
3. gravar fingerprint processado no estado e no log

### 6. Falta Kill Switch Operacional E Controle De Acesso

**Problema:** a V1 precisa responder automaticamente, mas sem uma chave simples de pausa isso fica arriscado.

**Impacto:**
- operacao sem maneira rapida de desligar o agente
- risco alto em incidente de prompt, policy ou transporte
- configuracoes de IA sem uma permissao dedicada ficam misturadas com outros dominios

**Solucao Necessaria:**
1. respeitar `AiAgentProjectConfig.enabled` e `AiAgentProjectConfig.paused`
2. introduzir a permissao `manage:ai`
3. expor esse controle via API minima do runtime

### 7. Provisioning Atual Nao Cobre Projeto Novo

**Problema:** o sistema atual provisiona IA no onboarding legado, nao no ciclo completo de criacao de projeto.

**Impacto:**
- projetos novos podem nascer sem defaults de IA

**Solucao Necessaria:**
1. criar `ensureAiProjectDefaults()`
2. chamar no onboarding
3. chamar em `createProject()`

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| Message handler ja persiste CRM antes de efeitos externos | ✅ | Bom ponto de ancoragem para append do buffer |
| Contexto do projeto ja existe nas rotas de configuracao | ✅ | Facilita o escopo project-first |
| Separacao Mastra orchestrator/executor e adequada | ✅ | Bom fit para o runtime V1 |

---

## Matriz De Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Outbound duplicado em retry | Alto | Media | Critico | 3h |
| Falta de kill switch | Alto | Media | Alto | 1h |
| Configuracao no escopo errado | Alto | Media | Alto | 2h |
| Provisioning incompleto | Medio | Alta | Alto | 2h |
| Remocao do cron sem cobertura de testes | Medio | Media | Medio | 2h |

---

## Ordem Recomendada

1. Schema project-first + defaults por projeto
2. Buffer de conversa + Inngest
3. Transporte outbound + idempotencia
4. Workflow Mastra inbound
5. API minima + logs minimos
6. Cutover e testes
