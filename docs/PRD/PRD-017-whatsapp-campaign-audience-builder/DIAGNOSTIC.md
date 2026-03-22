# Diagnostic: WhatsApp Campaign Audience Builder

**Data:** 2026-03-22
**Status:** Draft

---

## Resumo Executivo

- O fluxo atual de campanhas resolve apenas o caso de importacao CSV imediata e nao sustenta administracao recorrente de audiencia.
- O maior risco de UX nao esta no envio para a Meta, e sim em como o usuario prepara publico, resolve variaveis e entende exclusoes.
- O backend ainda carrega um fluxo de aprovacao que ja nao pertence ao produto desejado e aumenta a complexidade sem valor.

---

## Abordagens Consideradas

## Approach A: Audience-first builder ⭐ Recommended
- How: introduzir listas, tags e segmentos persistidos e fazer a campanha consumir essas fontes com um builder full-page.
- Pros: experiencia intuitiva, reuso real, melhor governanca operacional, base correta para recorrencia.
- Cons: exige schema novo e refactor do fluxo atual.
- Effort: High

## Approach B: Campaign-first sem modulo de audiencias
- How: manter a audiencia como parte temporaria da campanha, trocando apenas o drawer por uma pagina.
- Pros: menos migracoes e menos endpoints.
- Cons: continua ruim para reuso, manutencao e preparacao de publico.
- Effort: Medium

## Approach C: CRM extensivel antes de campanhas
- How: criar primeiro uma plataforma ampla de campos customizados e so depois redesenhar campanhas.
- Pros: base mais generica para longo prazo.
- Cons: escopo excessivo para o problema atual e atraso na entrega operacional.
- Effort: High

---

## Problemas Encontrados

### 1. O fluxo atual de campanhas e tatico demais

**Problema:** A criacao de campanha acontece em um drawer curto, com audiencia descartavel e pouco contexto de administracao.

**Impacto:**
- Dificulta construir uma rotina operacional para times nao tecnicos.
- Faz a campanha parecer apenas uma importacao pontual, nao um modulo.

**Solucao Necessaria:**
1. Remover o drawer e adotar um builder em pagina cheia.
2. Separar a administracao de audiencia da configuracao de campanha.

### 2. A audiencia nao e um ativo reutilizavel do produto

**Problema:** Hoje a audiencia nasce dentro do payload da campanha e morre ali mesmo.

**Impacto:**
- Nao ha reuso entre campanhas.
- Nao ha historico de listas preparadas pelo time.
- Nao ha um lugar claro para importar, limpar e manter contatos.

**Solucao Necessaria:**
1. Criar entidades persistidas para listas de contatos.
2. Criar uma area administrativa de audiencias.

### 3. O produto quer tags, mas o CRM nao as modela

**Problema:** O schema de campanhas menciona `tagIds`, mas nao existe um dominio real de tags de leads.

**Impacto:**
- A API sugere uma capacidade que o produto nao cumpre.
- Nao ha base consistente para segmentacao comercial/operacional.

**Solucao Necessaria:**
1. Criar `LeadTag` e `LeadTagAssignment`.
2. Remover placeholders nao implementados ou passar a suportar tags de verdade.

### 4. A resolucao de variaveis esta acoplada a um CSV rigido

**Problema:** O template exige variaveis, mas o fluxo atual so aceita um CSV com colunas exatamente iguais ao modelo gerado.

**Impacto:**
- UX ruim para operacao diaria.
- Baixa flexibilidade para misturar CRM, lista e valores fixos.
- Dificulta campanhas recorrentes com o mesmo template.

**Solucao Necessaria:**
1. Introduzir um resolvedor de variaveis por origem.
2. Permitir mapear variaveis para `CRM`, `lista` ou `valor fixo`.
3. Persistir um preview claro de cobertura e exclusoes.

### 5. O CRM nao sabe ha quanto tempo o lead esta na fase atual

**Problema:** O ticket guarda a `stageId` atual, mas nao registra quando entrou nessa fase.

**Impacto:**
- Nao da para montar o filtro "fase X ha Y dias" com confiabilidade.
- O segmento salvo ficaria semanticamente errado.

**Solucao Necessaria:**
1. Adicionar `stageEnteredAt` em `Ticket`.
2. Atualizar toda mudanca de fase para manter esse campo correto.
3. Backfillar dados existentes com uma regra explicita e documentada.

### 6. O fluxo de aprovacao virou complexidade morta

**Problema:** O backend ainda implementa `submit` e `approve`, mas a operacao desejada agora e somente `manual` ou `agendada`.

**Impacto:**
- Estados desnecessarios no dominio.
- Endpoints e tabelas que aumentam manutencao sem valor ao usuario.
- Confusao entre documentacao, backend e UI.

**Solucao Necessaria:**
1. Remover estados e endpoints de aprovacao.
2. Substituir historico de aprovacao por historico generico de eventos de campanha.

### 7. O builder atual nao administra bem campanhas baseadas no CRM

**Problema:** Apesar de o backend ja aceitar alguns filtros de CRM, a UI atual so expoe importacao CSV.

**Impacto:**
- Segmentacao por fase, origem e status fica escondida ou inutilizada.
- O produto nao atende o caso "disparar para quem esta na fase tal".

**Solucao Necessaria:**
1. Expor segmentos salvos do CRM no modulo de audiencias.
2. Permitir preview de contagem antes da campanha.

### 8. Falta uma fonte unica de verdade para o snapshot final da campanha

**Problema:** A audiencia e as variaveis podem mudar entre o planejamento e o envio, especialmente em campanhas agendadas.

**Impacto:**
- Risco de divergencia entre o que o usuario revisou e o que a campanha realmente enviou.
- Dificulta auditoria.

**Solucao Necessaria:**
1. Resolver e congelar destinatarios/variaveis no momento de `enviar` ou `agendar`.
2. Persistir tudo em `WhatsAppCampaignRecipient`.

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| Templates oficiais aprovados pela Meta | OK | O produto ja lista e usa templates aprovados no modulo de WhatsApp |
| Infra de disparo e cron | OK | Ja existem endpoint de dispatch e cron para campanhas agendadas |
| Snapshot por destinatario | OK | `WhatsAppCampaignRecipient` ja modela lead opcional, status e variaveis por recipient |
| CRM com fases de pipeline | OK | `Ticket` e `TicketStage` ja existem e ja sao usados no produto |
| Detalhe de campanha e rastreio de resultado | OK | A pagina de detalhe ja exibe grupos, destinatarios e falhas de envio |

---

## Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Modelar audiencia sem reuso real | Alto | Alta | Critico | Medio |
| Remover aprovacao sem limpar todos os estados antigos | Medio | Alta | Alto | Medio |
| Implementar segmento por fase sem `stageEnteredAt` | Alto | Alta | Critico | Baixo |
| Variaveis sem snapshot por recipient | Alto | Media | Alto | Medio |
| Explodir escopo com custom fields genericos | Medio | Alta | Alto | Alto |
| UX de builder ficar tecnica demais | Alto | Media | Alto | Medio |

---

## Ordem Recomendada

1. Modelagem de dados e simplificacao de estados de campanha
2. Backend de listas, tags e segmentos
3. Resolvedor de variaveis e snapshot final da campanha
4. Novo builder full-page e nova tab `Audiencias`
5. Limpeza do drawer e do fluxo de aprovacao antigo

---

## Gaps e Decisoes Deliberadas

### Campos customizados do CRM ficam fora desta v1

**Motivo:** O problema imediato pode ser resolvido com:

- campos padrao do CRM
- colunas arbitrarias das listas importadas
- valores fixos definidos na campanha

**Consequencia:** Templates que dependam de dados externos nao existentes no CRM vao exigir:

- importacao em lista com as colunas necessarias, ou
- definicao de valor fixo na campanha

### Multi-instancia distribuida fica fora da v1

**Motivo:** O fluxo atual de UI ja opera essencialmente com uma instancia por campanha, e a distribuicao manual/automatica abre outra frente de UX e execucao.

**Consequencia:** O builder v2 continua simples: uma campanha, uma instancia de envio na UI. O modelo interno pode continuar suportando grupos de dispatch, mas sem expor uma experiencia de balanceamento nesta entrega.
