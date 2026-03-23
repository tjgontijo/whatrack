# Quick Start: PRD-017 WhatsApp Campaign Audience Builder

**Data:** 2026-03-22
**Status:** Draft

---

## Objetivo

Entregar a v2 do modulo de campanhas WhatsApp com:

- builder em pagina cheia
- audiencias persistidas
- listas, tags e segmentos
- variaveis resolvidas por origem
- envio manual ou agendado
- zero fluxo de aprovacao

---

## Branch Sugerida

```bash
feature/2026-03-22-whatsapp-campaign-audience-builder
```

---

## Ordem Recomendada de Leitura

1. `docs/PRD/PRD-001-whatsapp-disparo-em-massa/`
2. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/README.md`
3. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/CONTEXT.md`
4. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/DIAGNOSTIC.md`
5. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/TASKS.md`

---

## Ordem Recomendada de Execucao

1. Modelar banco e remover aprovacao do dominio
2. Implementar listas, tags e segmentos no backend
3. Implementar `stageEnteredAt` e segmentos por fase/tempo
4. Refatorar campanhas para snapshot final no enviar/agendar
5. Substituir drawer por builder full-page
6. Construir a tab `Audiencias`
7. Limpar componentes e endpoints mortos

---

## Regras de Implementacao

### 1. Nao reabrir o fluxo de aprovacao

Esta feature assume decisao de produto fechada:

- nao existe mais `submit`
- nao existe mais `approve`
- nao existe mais `PENDING_APPROVAL`
- nao existe mais `APPROVED`

Se algum trecho antigo ainda depender disso, ele deve ser removido ou migrado para historico de eventos.

### 2. Lista nao e campanha

Importacao CSV passa a alimentar `listas`, nao `campaigns` diretamente.

Consequencia pratica:

- o parser CSV deve continuar robusto
- a UI de campanha nao deve exigir CSV como etapa obrigatoria

### 3. Snapshot e congelado no envio/agendamento

Nao resolver variaveis "ao vivo" durante a execucao de uma campanha ja agendada.

Fluxo correto:

1. usuario revisa
2. sistema resolve recipients + variaveis
3. sistema persiste snapshot
4. campanha e enviada agora ou marcada como `SCHEDULED`

### 4. Segmento usa CRM real, lista usa dados importados

- `Segmento` consulta `Lead` + `Ticket`
- `Lista` consulta `WhatsAppContactListMember`
- `Tag` so vale para leads

Nao misturar estes conceitos no schema nem na UI.

### 5. Custom fields genericos ficam fora

Se faltar dado no CRM, a v1 usa:

- coluna da lista importada
- valor fixo da campanha

Nao criar uma plataforma generica de campos customizados nesta entrega.

### 6. Dados faltantes sempre excluem destinatarios na v1

Nao introduzir um campo de configuracao `missingVariablesBehavior` nesta entrega.

Comportamento esperado:

- preview obrigatorio antes do envio
- destinatarios com variavel obrigatoria faltante sao excluidos do snapshot
- envio/agendamento so segue se houver ao menos um destinatario valido

---

## Campos CRM Minimos para Auto-mapeamento

O builder deve tentar auto-mapear pelo menos:

- `lead.name`
- `lead.phone`
- `lead.mail`
- `lead.source`
- `lead.lastMessageAt`
- `ticket.stage.name`
- `ticket.stageEnteredAt`
- `ticket.createdAt`

Qualquer coisa fora disso pode ser:

- coluna da lista, ou
- valor fixo

---

## Checklist de UX

- O usuario entende primeiro `quem vai receber`, depois `o que vai ser enviado`.
- A tela nao exige pensar em JSON, payload ou nomes internos de API.
- Variaveis faltantes aparecem com linguagem simples e acao clara.
- O preview informa quantos contatos serao enviados, excluidos e por qual motivo.
- O fluxo de criacao cabe em uma pagina cheia sem drawer.

---

## Checklist Tecnico

- Route handlers continuam thin
- Services concentram regra de negocio
- Zod em todos os payloads novos
- `stageEnteredAt` atualizado em toda mudanca de fase
- testes cobrindo:
- resolver de variaveis
- deduplicacao de lista
- preview de segmento
- snapshot de campanha agendada
- remocao do fluxo de aprovacao

---

## Verificacao Sugerida

```bash
npm test -- src/services/whatsapp/__tests__/whatsapp-campaign.service.test.ts
npm test -- src/services/whatsapp/__tests__/whatsapp-campaign-execution.service.test.ts
npm test -- src/lib/whatsapp/__tests__/campaign-csv.test.ts
```

Adicionar suites novas para:

- `whatsapp-contact-list.service`
- `whatsapp-lead-tag.service`
- `whatsapp-audience-segment.service`
- `whatsapp-campaign-variable-resolver.service`

---

## Resultado Esperado ao Final

Ao final da implementacao, a area `/whatsapp/campaigns` deve funcionar como um modulo administrativo completo:

- gerencia audiencia
- cria campanha sem drawer
- resolve variaveis com previsibilidade
- envia ou agenda sem aprovacao
- acompanha o resultado de ponta a ponta
