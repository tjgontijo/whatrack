# Contexto: AI Studio Platform

**Ultima atualizacao:** 2026-03-23 (v2.0 — refatorado para blueprint wizard + AiEvent timeline)

---

## Definicao

O AI Studio e a camada de governanca que permite ao time operar o agente sem tocar em banco de dados ou codigo. Ele e construido sobre os modelos do PRD-018 (`AiEvent`, `LeadAiContext`, `AiAgent`) e do PRD-012 (`AiProjectConfig`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`).

O principio central do studio: **banco de dados e runtime sao soberanos; a UI nao pode se tornar fonte de verdade**.

---

## Quem Usa

- Usuarios com permissao `manage:ai`: editam skills, publicam versoes, gerenciam policies
- Operadores e admins: ativam/pausam agente, visualizam logs, investigam problemas
- Suporte/ops: investigam execucoes e erros via execution logs

---

## O Que O PRD-012 Entregou

- `AiProjectConfig`: configuracao basica por projeto
- `AiSkill` e `AiSkillVersion`: runtime de skills com versionamento
- `AiSkillExecutionLog`: log de cada execucao
- `AiCrisisKeyword`: palavras de escalada
- Workflow inbound-message operacional
- UI minima: toggle de agente e configuracao basica

## O Que O PRD-018 Entregou

- `AiEvent` via `AiEventService`: timeline append-only de todas as acoes de IA
- `LeadAiContext` via `LeadAiContextService`: contexto persistido do cliente
- `AiAgent` e `AiAgentProjectConfig`: registry e configuracao de agentes
- `executePrompt`: camada de abstracao sobre Mastra

---

## Novos Modelos Deste PRD

### TerminologyRule

Regras de terminologia que o agente deve respeitar (ex: nunca chamar o produto de "servico", sempre usar "solucao").

```prisma
model TerminologyRule {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId  String   @db.Uuid
  orgId      String   @db.Uuid
  term       String   @db.VarChar(100)      // termo proibido ou a substituir
  replacement String? @db.VarChar(100)     // substituto recomendado (null = proibido sem substituto)
  context    String?  @db.Text             // quando se aplica
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([projectId])
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

Com base nas respostas, o sistema mapeia para um `blueprintSlug` e configura o `AiAgentProjectConfig.config.blueprintSlug`. O usuario nunca ve o slug — ve apenas uma descricao amigavel do modo do agente.

Blueprints V1 disponíveis:
- `whatsapp-commercial-agent`: conversao de leads, qualificacao, apresentacao de produto
- `whatsapp-cs-agent`: atendimento pos-compra, resolucao de problemas, NPS

O wizard e o unico caminho de selecao de blueprint. Nao existe dropdown de slug na UI.

---

## Skills no AI Studio

Skills sao as "habilidades" do agente — cada skill e um prompt com contexto e instrucoes especificas para uma situacao.

### Ciclo de vida de uma skill

```
Rascunho (AiSkillVersion.isPublished = false)
  -> Edicao via UI (markdown editor para o prompt)
  -> Preview com contexto mockado
  -> Publicacao explicita (AiSkillVersion.isPublished = true)
  -> Versao anterior fica como historico
```

### Regras de skills

- Publicar uma versao e acao explícita e irreversivel (nao existe unpublish)
- O runtime usa sempre a versao publicada mais recente
- O diff de prompt entre versoes deve ser visivel antes de publicar
- Skills de sistema (isSystem: true) podem ser editadas, mas nao deletadas

---

## Execution Logs

`AiSkillExecutionLog` (do PRD-012) e `AiEvent` (do PRD-018) sao as duas fontes de observabilidade.

- `AiSkillExecutionLog`: detalhe tecnico de cada skill executada (routingDecision, output, outboundPayload)
- `AiEvent`: timeline completa de todas as acoes de IA, incluindo contexto atualizado, crise detectada, etc.

O dashboard de logs deve cruzar as duas fontes para oferecer:
- Filtro por tipo de evento, skill, data, status (sucesso/erro)
- Drilldown: clicar em um log abre o JSON do routingDecision, output e resultado do outbound
- Custo inline (modelId, tokens, costUsd) em cada linha

---

## AiEvent Timeline no Inbox

O ticket-panel do inbox deve exibir `AiEvent` junto de mensagens humanas. A timeline unificada mostra:

- Mensagens do cliente (tipo existente)
- Mensagens do agente (AiEvent.type = MESSAGE_SENT | TEMPLATE_SENT)
- Acoes de IA (AiEvent.type = SKILL_EXECUTED | TRIAGE_COMPLETED | CRISIS_DETECTED | LEAD_SCORED)
- Estados de cadencia (AiEvent.type = CADENCE_ENROLLED | CADENCE_STEP_EXECUTED)

Cada entrada de AiEvent no inbox deve ter badge colorido por tipo e tooltip com o metadata do evento.

---

## Meta Ads Audit como Skill

O endpoint atual `/api/v1/meta-ads/audit` usa `dispatchAiEventForAudit()` com arquitetura paralela. Neste PRD, ele deve ser migrado para:

1. Criar uma skill `meta-ads-audit` com prompt dedicado
2. O endpoint chama `skill-runner.ts` com essa skill
3. O resultado gera `AiEvent(SKILL_EXECUTED)` em vez de `AiInsight`
4. O custo e registrado inline no `AiEvent`

---

## Regras De Negocio

- Tudo project-scoped
- Publicar versao de skill e acao explicita
- Logs sao auditaveis e nao editaveis
- Policies ficam server-side; a UI e apenas operacao
- UI nao pode contornar permissoes do backend
- `manage:ai` e necessario para editar skills e publicar versoes
- `view:ai` pode existir para leitura de logs sem edicao

---

## Estado Desejado

Ao final deste PRD, um usuario com `manage:ai` deve conseguir, sem tocar em banco ou codigo:

- Configurar o agente via wizard (perguntas de negocio → blueprint)
- Listar skills do projeto com status (publicada/rascunho)
- Editar prompt de uma skill e comparar com a versao anterior
- Publicar nova versao
- Adicionar/remover crisis keywords
- Adicionar/remover regras de terminologia
- Ver timeline completa de AiEvent no inbox do ticket
- Ver dashboard de execution logs com filtros e drilldown
- Verificar custo por execucao
