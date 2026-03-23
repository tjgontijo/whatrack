# Contexto: AI Studio Platform

**Ultima atualizacao:** 2026-03-23 (v2.2 — alinhado ao runtime e ao padrao real de frontend)

---

## Definicao

O AI Studio e a camada de governanca que permite ao time operar o agente sem tocar em banco de dados ou codigo. Ele e construido sobre os modelos do PRD-018 (`AiEvent`, `LeadAiContext`, `AiAgent`) e do PRD-012 (`AiProjectConfig`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`, `AiCrisisKeyword`).

O principio central do studio: **banco de dados e runtime sao soberanos; a UI nao pode se tornar fonte de verdade**.

---

## Quem Usa

- Usuarios com permissao `manage:ai`: editam skills, publicam versoes, gerenciam policies e configuram o agente
- Usuarios com permissao `view:ai`: leem logs, timeline e configuracao sem editar
- Operadores e admins: investigam execucoes, erros e custos

---

## Contrato De Frontend

O AI Studio deve seguir o padrao visual ja estabelecido no dashboard.

### Casca da pagina

- Rota: `/settings/ai-studio`
- Shell obrigatorio: `HeaderPageShell`
- Selector obrigatorio: `HeaderTabs`
- Tabs de alto nivel da V1: `Agente`, `Skills`, `Policies`, `Logs`
- Nao usar navegacao lateral nova, sub-header paralelo ou segundo selector

### Slots do header

- `title`: `AI Studio`
- `selector`: `HeaderTabs`
- `searchValue` / `onSearchChange`: usados apenas nas tabs que precisam de busca
- `primaryAction`: varia por tab ativa
- `filters`: usados nas tabs que precisam de filtros no `Sheet` do shell
- `onRefresh` ou `refreshAction`: padrao de revalidacao manual

### Composicao interna

- `Agente`: `SettingsGroup` + `SettingsRow` para configuracoes e cards leves para resumo
- `Skills`: lista/tab operada dentro do mesmo hub; editor abre no mesmo contexto via conteudo condicional, `Sheet` ou `Dialog`
- `Policies`: `SettingsGroup` + `SettingsRow` ou tabelas/cards seguindo o estilo atual
- `Logs`: tabela operacional e cards de apoio, sem shell interno

### Regras adicionais

- o primeiro nivel dentro do `HeaderPageShell` nao adiciona `p-6`, `pt-6` ou `mt-6`
- a timeline no inbox continua sendo componente interno do `ticket-panel`; ela nao usa `HeaderPageShell`
- nova sub-rota so deve existir se houver necessidade real de deep link ou contexto isolado

---

## O Que O PRD-012 Entregou

- `AiProjectConfig`: configuracao basica por projeto
- `AiSkill` e `AiSkillVersion`: runtime de skills com versionamento
- `AiSkillExecutionLog`: log tecnico de cada execucao
- `AiCrisisKeyword`: palavras de escalada por projeto
- Workflow `inbound-message` operacional
- API minima `/api/v1/ai/config`

Importante: o PRD-012 **nao** entregou AI Studio, timeline no inbox ou modo read-only de IA.

## O Que O PRD-018 Entregou

- `AiEvent` via `AiEventService`: timeline append-only de todas as acoes de IA
- `LeadAiContext` via `LeadAiContextService`: contexto persistido do cliente
- `AiAgent` e `AiAgentProjectConfig`: registry e configuracao de agentes
- `executePrompt`: camada de abstracao sobre Mastra

---

## Novo Modelo Deste PRD

### TerminologyRule

Regras de terminologia que o agente deve respeitar por projeto (ex: nunca chamar o produto de "servico", sempre usar "solucao").

```prisma
model TerminologyRule {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String       @db.Uuid
  projectId      String       @db.Uuid
  term           String       @db.VarChar(100)
  replacement    String?      @db.VarChar(100)
  context        String?      @db.Text
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([organizationId, projectId])
  @@index([projectId, isActive])
  @@map("ai_terminology_rules")
}
```

---

## Blueprint Wizard

O conceito de "ativar um blueprint" nao deve ser apresentado ao usuario como uma lista tecnica de opcoes. Em vez disso, o studio deve ter um wizard que faz perguntas sobre o negocio e seleciona o blueprint correto por tras.

### Perguntas do wizard (exemplo)

1. "Qual o principal objetivo do seu agente?" → opcoes: Converter leads, Atender clientes, Fazer follow-up, Prospectar
2. "O seu cliente ja compra online ou prefere contato humano?" → opcoes: Online, Humano, Misto
3. "Qual o seu produto/servico?" → texto livre

Com base nas respostas, o sistema mapeia para um `blueprintSlug` e atualiza `AiProjectConfig.blueprintSlug`. O usuario nunca ve o slug — ve apenas uma descricao amigavel do modo do agente.

Blueprints V1 disponiveis:
- `whatsapp-commercial-agent`: conversao de leads, qualificacao, apresentacao de produto
- `whatsapp-cs-agent`: atendimento pos-compra, resolucao de problemas, NPS

O wizard e o caminho principal de selecao de blueprint. O slug tecnico continua sendo detalhe interno de runtime.

---

## Skills No AI Studio

Skills sao as "habilidades" do agente — cada skill e um prompt com contexto e instrucoes especificas para uma situacao.

### Regra de ownership

- Skills seedadas pelo sistema sao globais: `organizationId = null`, `projectId = null`, `isSystem = true`
- O studio **nao** edita diretamente uma skill global de sistema
- Ao editar uma skill global pela primeira vez em um projeto, o backend cria um override project-scoped
- O runtime resolve a skill efetiva nesta ordem:
  1. override do projeto
  2. skill global de sistema

### Ciclo de vida de uma skill

```text
Skill global do sistema
  -> (primeira edicao no projeto)
  -> cria override project-scoped
  -> cria nova AiSkillVersion em rascunho
  -> preview com contexto mockado
  -> publicacao explicita (isPublished = true)
  -> versao anterior fica como historico
```

### Regras de skills

- Publicar uma versao e acao explicita e irreversivel (nao existe unpublish)
- O runtime usa sempre a versao publicada mais recente da skill efetiva
- O diff de prompt entre versoes deve ser visivel antes de publicar
- Skill global de sistema pode ser visualizada no studio, mas nao mutada globalmente pela UI
- O fluxo de edicao deve permanecer dentro do contexto do hub do AI Studio sempre que possivel

---

## Execution Logs

`AiSkillExecutionLog` (PRD-012) e `AiEvent` (PRD-018) sao as duas fontes de observabilidade.

- `AiSkillExecutionLog`: detalhe tecnico de cada skill executada (`routingDecision`, `output`, `outboundPayload`, `outboundResult`)
- `AiEvent`: timeline completa de todas as acoes de IA, incluindo contexto atualizado, crise detectada, mensagens enviadas e operacoes de runtime

O dashboard de logs deve cruzar as duas fontes para oferecer:
- filtro por tipo de evento, skill, data e status (sucesso/erro)
- drilldown para abrir o JSON de `routingDecision`, `output` e resultado do outbound
- custo inline (`modelId`, `tokens`, `costUsd`) em cada linha

---

## AiEvent Timeline No Inbox

O `ticket-panel` do inbox deve exibir `AiEvent` junto de mensagens humanas. A timeline unificada mostra:

- mensagens do cliente (tipo existente)
- mensagens do agente (`AiEvent.type = MESSAGE_SENT | TEMPLATE_SENT`)
- acoes de IA (`AiEvent.type = SKILL_EXECUTED | TRIAGE_COMPLETED | CRISIS_DETECTED | LEAD_SCORED`)
- estados de cadencia futuros (`AiEvent.type = CADENCE_ENROLLED | CADENCE_STEP_EXECUTED`)

Cada entrada de `AiEvent` no inbox deve ter badge colorido por tipo e tooltip com o metadata do evento.

---

## Consumidores Externos De IA

Este PRD deve produzir services e APIs reutilizaveis para qualquer superficie futura que queira executar skills fora do inbound WhatsApp.

Regra:
- se uma superficie externa vier a existir no repo, ela deve reutilizar `skill-runner`, `AiSkillExecutionLog` e `AiEvent`
- nenhuma nova integracao deve criar uma segunda arquitetura paralela de IA

Este PRD nao assume um endpoint especifico inexistente no estado atual do repositorio.

---

## Regras De Negocio

- Tudo operacional e project-scoped por `organizationId + projectId`
- Publicar versao de skill e acao explicita
- Logs sao auditaveis e nao editaveis
- Policies ficam server-side; a UI e apenas operacao
- UI nao pode contornar permissoes do backend
- `manage:ai` e necessario para editar skills, publicar versoes e alterar policies
- `view:ai` e introduzido neste PRD para leitura de studio, logs e timeline sem edicao

---

## Estado Desejado

Ao final deste PRD, um usuario com `manage:ai` deve conseguir, sem tocar em banco ou codigo:

- configurar o agente via wizard (perguntas de negocio → blueprint)
- listar skills efetivas do projeto com status (publicada/rascunho)
- editar prompt de uma skill sem mutar a skill global de sistema
- comparar versoes e publicar nova versao
- adicionar/remover crisis keywords
- adicionar/remover regras de terminologia
- ver timeline completa de `AiEvent` no inbox do ticket
- ver dashboard de execution logs com filtros e drilldown
- verificar custo por execucao

Um usuario com `view:ai` deve conseguir ler tudo isso sem mutar nada.
