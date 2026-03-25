# PRD-017: WhatsApp Campaign Audience Builder

**Status:** Draft
**Data:** 2026-03-25
**Versao:** 1.1

---

## O Que e Este PRD?

Este PRD define a v2 do modulo de campanhas WhatsApp do produto. A proposta substitui o fluxo atual, centrado em um drawer com importacao CSV pontual, por um modulo `audiencia-first` com administracao propria de listas, tags e segmentos, mais um builder de campanha em pagina cheia.

O objetivo e tornar o disparo oficial do WhatsApp realmente operavel no dia a dia: criar e reutilizar audiencias, escolher templates aprovados, resolver variaveis por destinatario de forma previsivel, revisar exclusoes antes do envio e operar campanhas manuais ou agendadas sem o fluxo de aprovacao que hoje ja nao faz parte do produto desejado.

---

## Estrutura do PRD

PRD-017-whatsapp-campaign-audience-builder/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md

---

## Resumo Executivo

### Objetivo
- Substituir o drawer de criacao de campanha por um builder em pagina cheia, alinhado com a experiencia ja adotada no editor de templates.
- Introduzir uma tab `Audiencias` com gerenciamento de listas estaticas, tags de leads e segmentos salvos do CRM.
- Permitir que cada campanha resolva variaveis do template a partir de `campos do CRM`, `colunas da lista` ou `valores fixos`.
- Manter apenas dois modos operacionais de envio: `manual` e `agendado`.
- Remover por completo o fluxo de aprovacao do backend, da UI e do modelo de dados de campanhas.

### Status Atual
- A tela `/whatsapp/campaigns` usa `HeaderPageShell` com tabs `Visao Geral` e `Campanhas`.
- A criacao acontece em um drawer de 3 passos e hoje so suporta importacao CSV embutida na campanha.
- O backend ainda possui estados e endpoints de aprovacao, mas a UI ja nao opera esse fluxo de forma consistente.
- Nao existem entidades persistidas para `listas`, `tags` ou `segmentos`.
- O schema de campanhas menciona `tagIds`, mas a implementacao real nao suporta tags de leads.
- O filtro "fase do pipeline ha X dias" nao e confiavel hoje porque o sistema nao persiste quando o ticket entrou na fase atual.

### Escopo
Entra:
- nova experiencia full-page para `nova campanha` e `editar rascunho`
- tab `Audiencias` dentro de `/whatsapp/campaigns`
- listas estaticas com importacao CSV e reuso em multiplas campanhas
- tags de leads para segmentacao operacional/comercial
- segmentos salvos do CRM com filtros por projeto, origem, status, fase e tempo na fase
- resolucao de variaveis por `CRM | lista | valor fixo`
- preview de cobertura de variaveis, exclusoes e duplicidades antes do envio
- congelamento do snapshot de destinatarios e variaveis no momento de `enviar` ou `agendar`
- simplificacao do dominio de campanhas para `DRAFT | SCHEDULED | PROCESSING | COMPLETED | CANCELLED`
- historico de eventos de campanha sem conceito de aprovacao
- funil de engajamento na pagina de detalhe: `Enviados -> Entregues -> Lidos -> Responderam`
- filtro de destinatarios por status e busca por telefone na tabela de recipients
- acao de duplicar campanha (cria rascunho independente)

Fica fora:
- automacoes multi-etapa e jornadas
- testes A/B de templates (previsto para PRD separado, depende desta fundacao)
- criacao de um motor generico de custom fields para todo o CRM
- sincronizacao nativa com ecommerce/ERP para pedidos
- throttle configuravel e pause/resume de campanha em execucao
- roteamento automatico entre varias instancias com distribuicao inteligente
- mensagens livres fora de templates aprovados pela Meta

### Estimativa
- Ordem de grandeza: 3 a 4 sprints para uma v1 consistente.
- O bloco de tags + segmentos pode ser entregue incrementalmente sem travar a simplificacao do builder.

---

## Direcao Escolhida

Este PRD adota a abordagem `audience-first builder`.

Motivos principais:

- reuso real de listas e segmentos entre campanhas
- UX mais intuitiva para operacao diaria
- separacao correta entre preparar audiencia e configurar disparo
- base melhor para variaveis por template e campanhas agendadas

As alternativas consideradas e os trade-offs completos ficam documentados em `DIAGNOSTIC.md`.

---

## Arquivos/Areas Principais

- `prisma/schema.prisma`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/campaigns/...`
- `src/app/api/v1/whatsapp/campaigns/...`
- `src/app/api/v1/whatsapp/audiences/...`
- `src/app/api/v1/whatsapp/lead-tags/...`
- `src/components/dashboard/whatsapp/campaigns/...`
- `src/services/whatsapp/...`
- `src/services/tickets/...`
- `src/schemas/whatsapp/...`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Architecture Reference

Este PRD segue rigorosamente os padrões do **nextjs-feature-dev skill**:

- **Domain-organized code** em `src/lib/whatsapp/`
- **Layer separation** (queries, actions, services, schemas)
- **Server-first components** por padrão
- **Thin boundaries** (routes e Server Actions)
- **Result<T> pattern** para error handling
- **Zod validation** em todos os limites
- **Structured Pino logging** no service layer
- **Atomic commits** por task
- **Branch-per-feature** workflow

Leia `CONTEXT.md` > seção "Arquitetura de Camadas" para mapeamento completo.

---

## Proximo Passo

Implementar este PRD como base para a v2 do modulo de campanhas. Ao concluir, iniciar PRD separado para testes A/B de templates (PRD-018), que dependera da fundacao de `dispatchGroups` e do novo builder estabelecidos aqui.

Leia também:
- [nextjs-feature-dev skill](../../.claude/skills/nextjs-feature-dev/) para arquitetura detalhada
- [git-branching reference](../../.claude/skills/nextjs-feature-dev/references/git-branching.md) para workflow
- [nextjs-conventions reference](../../.claude/skills/nextjs-feature-dev/references/nextjs-conventions.md) para layer rules
