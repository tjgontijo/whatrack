# Diagnostic: WhatsApp Disparo em Massa via API Oficial

**Data:** 2026-03-19
**Status:** Draft

---

## Resumo Executivo

- O produto ja possui os primitives da integracao oficial, mas ainda nao possui um dominio de campanha.
- O maior risco da v1 nao esta no envio em si, e sim em audiencia, elegibilidade, rastreabilidade e correlacao de resposta.
- Sem esse modulo, o envio em massa vira uma operacao cega, dificil de auditar e facil de quebrar.

---

## Problemas Encontrados

### 1. Nao existe entidade de campanha

**Problema:** O sistema atual oferece envio unitario e gestao de templates, mas nao possui um agregado de campanha com estado, aprovacao, agenda, escopo e resultado.

**Impacto:**

- Nao ha workflow de rascunho ate conclusao.
- Nao ha auditoria operacional por disparo.

**Solucao Necessaria:**

1. Criar entidade de campanha e seus estados.
2. Criar leitura consolidada de status, progresso e resultado.

### 2. Nao existe pipeline de audiencia

**Problema:** Nao ha mecanismo unico para combinar audiencia de CRM e importacao, aplicar filtros, deduplicar e separar elegiveis de inelegiveis.

**Impacto:**

- Alto risco de duplicidade.
- Alto risco de enviar para destinatarios errados ou nao elegiveis.

**Solucao Necessaria:**

1. Criar servico de montagem de audiencia.
2. Normalizar telefone, deduplicar e registrar motivo de exclusao.

### 3. O modelo atual de mensagens e centrado em lead

**Problema:** A tabela de mensagens depende de `leadId`, mas a v1 permite destinatarios importados que nao devem virar lead automaticamente na importacao.

**Impacto:**

- O envio outbound para contatos importados nao cabe naturalmente no fluxo atual de conversa.
- A resposta de um contato importado precisa de uma estrategia de criacao ou vinculacao posterior.

**Solucao Necessaria:**

1. Criar entidade de destinatario de campanha desacoplada de lead.
2. Definir estrategia de vinculacao a lead apenas quando houver resposta ou conversao real.

### 4. Nao existe motor de execucao para lotes e agendamento

**Problema:** O projeto possui envio unitario, mas nao ha processamento de campanhas pendentes, lotes por instancia, locking, progresso e reprocessamento.

**Impacto:**

- Agendamento nao e confiavel sem um job dedicado.
- Falhas parciais ficam sem visibilidade e sem controle.

**Solucao Necessaria:**

1. Criar servico de execucao de campanha por lotes.
2. Criar endpoint de cron dedicado para campanhas.

### 5. Nao existe governanca de aprovacao e transicao de estado

**Problema:** A v1 exige aprovacao antes de enviar ou agendar, mas o produto atual nao modela essa etapa.

**Impacto:**

- Nao ha trilha operacional para saber quem aprovou e quando.
- O envio pode acontecer sem checkpoint de consistencia.

**Solucao Necessaria:**

1. Criar estados formais de campanha.
2. Registrar aprovacao e eventos de transicao.

### 6. Nao existe atribuicao explicita de resposta para campanha

**Problema:** O webhook atual processa mensagens e status, mas nao existe correlacao nativa entre uma resposta inbound e o destinatario de uma campanha especifica.

**Impacto:**

- Fica dificil medir resultado real.
- O produto perde capacidade de explicar quais campanhas geraram retorno.

**Solucao Necessaria:**

1. Persistir identificadores de envio por destinatario.
2. Marcar resposta recebida com origem de campanha.

---

## O Que Ja Esta Bom

| Item                              | Status | Evidencia                                                                             |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Integracao oficial com Meta       | OK     | Ja existem onboarding, templates e webhook no dominio WhatsApp                        |
| Gestao de instancias              | OK     | O projeto ja trabalha com `WhatsAppConfig`, `WhatsAppConnection` e escopo por projeto |
| Envio unitario de template        | OK     | Ja existe endpoint e servico para envio unitario                                      |
| Inbox e persistencia de mensagens | OK     | O produto ja possui chats, mensagens e webhook processando eventos                    |
| Infra basica para cron/job lock   | OK     | Ja existe cron auth e `JobTracker` simples em Redis                                   |

---

## Matriz de Risco

| Problema                                              | Severidade | Probabilidade | Risco   | Esforco |
| ----------------------------------------------------- | ---------- | ------------- | ------- | ------- |
| Audiencia sem elegibilidade e dedupe                  | Alto       | Alta          | Critico | Medio   |
| Agendamento sem motor dedicado                        | Alto       | Media         | Alto    | Medio   |
| Contato importado sem estrategia de vinculacao        | Alto       | Media         | Alto    | Medio   |
| Correlacao fraca entre envio e resposta               | Medio      | Alta          | Alto    | Medio   |
| Escopo crescer para analytics e automacao cedo demais | Medio      | Alta          | Alto    | Baixo   |

---

## Ordem Recomendada

1. Modelagem de campanha, grupos de envio e destinatarios
2. Servicos de audiencia, aprovacao e execucao
3. Rotas thin e cron de disparo
4. UI de criacao, preview e acompanhamento
5. Atribuicao de resposta e validacao final

---

## Gaps e features fora do escopo V1 (deferred)

### Bloqueio de opt-out para marketing

**Problema:** O PRD define que "Opt-out bloqueia campanhas de marketing, nao necessariamente operacionais." Porem, o produto atual nao possui um modelo de opt-out.

**Impacto:** A check de elegibilidade registra `exclusionReason` nos campos, mas nao ha checagem real. Campanhas de marketing podem enviar para contatos que deveriam estar bloqueados.

**Solucao v2:** Criar modelo `WhatsAppContactOptOut` com `organizationId`, `phone`, `optedOutAt`, `reason`. Aplicar filtro na audiencia antes do disparo.

### Filtro por tags

**Problema:** O PRD menciona "filtros por projeto, tags, estagio, origem e filtros avancados." O modelo `Lead` atual nao possui campo de tags.

**Implementado na V1:** `projectId`, `isActive`, `source`, `stageId`.

**Diferenca:** Filtro por tags fica para quando o modelo de tags for adicionado ao Lead.

---

## Mudancas de desenho em relacao ao PRD

### Destinatarios sem dispatchGroupId no fluxo de criacao original

O fluxo original do PRD nao especificava como a audiencia se vincula aos grupos de envio. A implementacao adotou round-robin: destinatarios sao distribuidos igualmente entre os dispatch groups da campanha na ordem de criacao. Isso garante que cada instancia receba uma fatia previsivel da audiencia.

### API de audiencia separada

Em vez de embutir audiencia no payload de criacao da campanha (que mistura dominio de criacao com dominio de audiencia), a implementacao usa endpoints separados:

- `POST .../add-audience` — adiciona leads do CRM a uma campanha ja criada
- `POST .../import` — importa telefones diretamente para uma campanha ja criada

Isso permite que o builder de campanha (UI) faca paso-a-passo: 1) crie a campanha com dispatch groups, 2) adicione audiencia. Essa abordagem eh mais alinhada com o padrao de API thin/routes do projeto.
