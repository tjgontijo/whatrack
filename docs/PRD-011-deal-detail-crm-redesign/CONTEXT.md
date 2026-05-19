# Context: Detalhe de Negociacao CRM

**Ultima atualizacao:** 2026-05-19

## Definicao

Detalhe de negociacao e a superficie operacional onde o vendedor entende, edita e conduz uma oportunidade comercial.

**O que e:**

- Uma pagina de CRM para gerenciar uma deal individual.
- O local principal para ver valor, itens negociados, etapa, previsao, responsavel, proxima acao e historico.
- Uma tela editavel, com tabs e URL propria.
- Um ponto de integracao entre lead, catalogo de itens, vendas, origem de marketing e conversas.

**O que NAO e:**

- Nao e uma tela de atendimento WhatsApp.
- Nao e apenas um modal informativo.
- Nao e um relatorio passivo.
- Nao e a venda finalizada. A venda nasce quando a deal e ganha.

## Referencias de Produto

CRMs grandes tratam negociacao como objeto comercial central.

- HubSpot usa propriedades de deal como `dealname`, `dealstage`, `pipeline`, `amount`, `closedate`, owner, probability, priority e campos calculados de receita quando ha line items. Referencias: https://knowledge.hubspot.com/properties/hubspots-default-deal-properties e https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/deals/guide.
- Salesforce modela Opportunity com nome, stage, amount, probability e close date, alem de historico de mudancas em etapa, valor, probabilidade e data de fechamento. Referencias: https://help.salesforce.com/s/articleView?id=sf.opp_history.htm&type=5 e https://help.salesforce.com/s/articleView?id=mktg.pardot_opportunities_fields.htm&type=5.
- Pipedrive organiza o detalhe em deal, pessoa, organizacao, atividades, notas, arquivos, historico e campos customizados, alem de registrar mudancas de stage, value e expected close date. Referencia: https://support.pipedrive.com/en/article/deal-detail-view.

## Fluxo Completo

```txt
Lead ou conversa gera deal
  ↓
Deal entra no pipeline e em uma etapa
  ↓
Vendedor define nome, itens, valor, responsavel e proxima acao
  ↓
Deal evolui entre etapas
  ↓
Campos obrigatorios mudam conforme a etapa
  ↓
Deal e fechada como ganha ou perdida
  ↓
Se ganhou, cria ou sincroniza Sale e SaleItem
```

### Etapas operacionais

1. Criacao: a deal pode nascer de conversa, entrada manual ou origem futura de campanha.
2. Qualificacao: vendedor identifica necessidade, item ou servico, valor aproximado e proxima acao.
3. Proposta: vendedor registra itens negociados, desconto, valor total e data prevista.
4. Negociacao: vendedor acompanha alteracoes de valor, probabilidade, responsavel e atividades.
5. Fechamento ganho: sistema valida valor e itens, cria venda e itens de venda.
6. Fechamento perdido: sistema exige motivo de perda e preserva historico.

## Dados Armazenados Hoje

### Deal Model Atual

Localizacao: `prisma/schema.prisma`.

```typescript
{
  id: string,
  organizationId: string,
  projectId: string | null,
  conversationId: string,
  stageId: string,
  assigneeId: string | null,
  dealValue: Decimal | null,
  statusId: string,
  closedAt: Date | null,
  closedReason: string | null,
  messagesCount: number,
  inboundMessagesCount: number,
  outboundMessagesCount: number,
  firstResponseTimeSec: number | null,
  resolutionTimeSec: number | null,
  source: string,
  originatedFrom: string | null
}
```

### Lacunas Atuais

- `conversationId` e obrigatorio hoje, o que impede criacao manual de deals sem WhatsApp.
- Nao ha `dealName`.
- Nao ha `description`.
- Nao ha `expectedCloseDate`.
- Nao ha `probability`.
- Nao ha `weightedValue`.
- Nao ha `priority`.
- Nao ha `temperature`.
- Nao ha `nextStep`.
- Nao ha `nextStepDueAt`.
- Nao ha itens negociados antes da venda.
- Nao ha campos customizados por organizacao.
- Nao ha regras de campo por etapa.
- Historico comercial e limitado.

## Dados Propostos

### Deal, campos principais

Extensao proposta em `Deal`:

```typescript
{
  conversationId: string | null,
  name: string | null,
  description: string | null,
  expectedCloseDate: Date | null,
  probabilityOverride: number | null,
  priority: "low" | "medium" | "high" | null,
  temperature: "cold" | "warm" | "hot" | null,
  nextStep: string | null,
  nextStepDueAt: Date | null,
  currency: string
}
```

Observacoes tecnicas:

- `conversationId` deve se tornar opcional no Prisma, junto com a relation `conversation`, para permitir deals manuais ou vindas de origem futura que nao passam pelo WhatsApp.
- `leadId` deve continuar obrigatorio no MVP. Criacao manual de deal deve exigir lead existente ou criar lead antes da deal.
- `currency` deve ter fallback para registros existentes, por exemplo `String @default("BRL")`, para evitar falha de migration em bases com dados.
- `dealValue` deve continuar como valor total previsto da deal. Quando houver line items, o sistema pode recalcular `dealValue` a partir dos itens ou permitir override controlado, a definir na implementacao.

### DealLineItem Model

Novo model proposto:

```typescript
{
  id: string,
  organizationId: string,
  projectId: string | null,
  dealId: string,
  itemId: string | null,
  name: string,
  quantity: Int | Decimal,
  unitPrice: Decimal,
  discountAmount: Decimal | null,
  total: Decimal,
  billingCycle: string | null,
  sortOrder: number,
  createdAt: Date,
  updatedAt: Date
}
```

Uso:

- `itemId` aponta para `Item` quando o produto existe no catalogo.
- `name` permite item livre quando ainda nao ha catalogo completo.
- `total` alimenta valor negociado.
- Ao ganhar deal, `DealLineItem` deve virar `SaleItem`.
- A tipagem de `quantity` precisa ser consistente com `SaleItem.quantity`. Hoje `SaleItem.quantity` e `Int`. Se o produto aceitar quantidade fracionada, T2 deve migrar `SaleItem.quantity` para `Decimal`. Se nao aceitar, `DealLineItem.quantity` deve ser `Int`.

### Custom Fields

Campos customizados devem ser gerais da negociacao, com regras por fase.

```txt
DealFieldDefinition
  define campo: chave, label, tipo, opcoes, ordem, ativo

DealFieldValue
  guarda valor de um campo em uma deal

DealStageFieldRule
  define visibilidade e obrigatoriedade de campo em uma etapa
```

Regra de produto:

- O campo pertence a deal.
- A fase controla se o campo aparece, se e obrigatorio e se pode ser editado.
- Campos do sistema nao devem ser deletaveis.
- No MVP, regras de campos podem ser configuradas diretamente nas etapas criadas.
- Como ja existem `DealStageTemplate` e `DealStageTemplateItem`, o desenho deve reservar caminho para templates carregarem regras de campos futuramente.

Exemplo:

```txt
Campo: budget_confirmed
Tipo: boolean
Fase Qualificacao: opcional
Fase Proposta: obrigatorio
Fase Ganho: obrigatorio e bloqueante
```

## Estados

```txt
open
  ↓
closed_won

open
  ↓
closed_lost
```

### Estados Detalhados

#### open

- Deal ativa.
- Pode mudar etapa.
- Pode alterar itens, valor, proxima acao, responsavel e campos customizados.

#### closed_won

- Deal ganha.
- Deve ter valor final.
- Deve ter venda vinculada quando houver fluxo financeiro.
- Campos criticos ficam bloqueados ou exigem permissao superior para alteracao.

#### closed_lost

- Deal perdida.
- Deve ter motivo de perda.
- Nao deve gerar venda.
- Mantem historico e origem para analise.

## Integracao com Outros Dominios

### Deals e Leads

A deal deve exibir lead associado, telefone, nome, origem e link para ficha do lead. Dados do lead ficam secundarios no layout, nao substituem dados da deal.

### Deals e Items

`DealLineItem` deve aceitar item do catalogo existente em `src/features/items`. O catalogo continua sendo fonte de produtos e servicos ativos.

### Deals e Sales

Quando a deal e ganha, itens negociados devem alimentar `Sale` e `SaleItem`. O fechamento nao deve depender de digitar tudo novamente.

### Deals e Conversations

Conversas WhatsApp e mensagens entram como tab secundaria de atividades. O detalhe da negociacao nao deve ser dominado por metricas de atendimento.

### Deals e Meta Ads

`DealTracking` continua importante, mas deve ser exibido como atribuicao comercial e nao como bloco principal. Dados de campanha, origem e landing page ajudam analise, mas nao conduzem a negociacao.

## Layout Recomendado

### Rota

```txt
src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/[dealId]/page.tsx
```

### Tabs

```txt
overview
items
activities
history
attribution
settings
```

Tabs devem usar URL state:

```txt
/deals/[dealId]?tab=items
```

### Estrutura Visual

```txt
Header fixo
  Deal name, status, stage, owner, valor, data prevista, acoes

Conteudo
  Coluna principal
    Tab selecionada

  Sidebar
    Propriedades comerciais
    Lead
    Origem
    Datas
    Campos obrigatorios da etapa
```

### Overview

- Resumo da negociacao.
- Valor negociado.
- Probabilidade.
- Valor ponderado.
- Data prevista de fechamento.
- Proxima acao.
- Itens principais.
- Notas internas.

### Items

- Tabela de itens negociados.
- Produto ou servico.
- Quantidade.
- Preco unitario.
- Desconto.
- Total.
- Total geral.

### Activities

- Proximas atividades comerciais.
- Conversas e mensagens recentes.
- Ligacoes, reunioes e notas futuras, se existirem.

### History

- Mudanca de etapa.
- Mudanca de valor.
- Mudanca de itens.
- Mudanca de responsavel.
- Fechamento ganho ou perdido.

### Attribution

- Origem principal.
- Campanha.
- UTM.
- Meta Ads.
- Landing page.

## Validacoes

### Input Validation

- `name`: maximo 160 caracteres.
- `expectedCloseDate`: data valida.
- `probabilityOverride`: 0 a 100.
- `priority`: enum controlado.
- `temperature`: enum controlado.
- `dealValue`: numero nao negativo.
- `lineItems.quantity`: maior que zero.
- `lineItems.unitPrice`: nao negativo.
- `lineItems.discountAmount`: nao negativo e menor ou igual ao subtotal.

### Business Logic Validation

- Deal ganha deve ter valor final maior que zero, salvo permissao explicita.
- Deal ganha com itens deve gerar `Sale` e `SaleItem`.
- Deal perdida deve ter `closedReason`.
- Campos obrigatorios da etapa devem bloquear avanco ou fechamento.
- Itens inativos do catalogo nao devem ser adicionados a novas deals, mas podem continuar em deals antigas como snapshot.

## Permissoes

| Acao | Quem Pode | Condicao |
|------|-----------|----------|
| Ver deal | Membro da organizacao | Deal pertence a organizacao |
| Editar campos comerciais | Membro com acesso ao projeto | Deal pertence ao projeto |
| Mover etapa | Membro com acesso ao projeto | Etapa pertence a organizacao/projeto |
| Fechar como ganha | Vendedor ou admin | Campos obrigatorios preenchidos |
| Fechar como perdida | Vendedor ou admin | Motivo de perda preenchido |
| Editar deal fechada | Admin ou permissao futura | Acao auditada |
| Configurar campos por etapa | Admin | Organizacao/projeto valido |

## Por Que Isso e Critico?

- O Kanban so e util se cada card leva a uma negociacao completa.
- Sem itens negociados, o valor da pipeline vira estimativa fraca.
- Sem data prevista e probabilidade, forecast fica incompleto.
- Sem campos por etapa, o processo comercial nao fica padronizado.
- Sem historico, a equipe nao sabe por que valor, etapa ou fechamento mudaram.

## Resumo para Implementacao

- Criar pagina dedicada de detalhe de deal.
- Manter `app/` fino e mover composicao para `features/deals/screens`.
- Criar services e repositories novos ou quebrar `deal.service.ts` em casos de uso menores.
- Usar DTOs especificos para UI.
- Criar `DealLineItem` antes de tentar melhorar visualmente a tela.
- Usar tabs com URL state.
- Mover WhatsApp para tab secundaria.
- Implementar validacoes de fechamento e avanco por etapa.
