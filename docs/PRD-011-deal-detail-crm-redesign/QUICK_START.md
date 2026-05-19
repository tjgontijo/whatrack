# Quick Start: PRD-011 Deal Detail CRM Redesign

**TL;DR:** transformar detalhe de deal em pagina CRM dedicada com tabs, dados comerciais, itens negociados, campos por etapa, historico e fechamento robusto. 10 tasks: 4 criticas, 4 moderadas, 2 menores. Total: 7 a 10 dias uteis.

## Resumo das Tasks

| # | Problema | Severidade | Fix |
|---|----------|------------|-----|
| T1 | Dialog inadequado | Critico | Criar pagina `/deals/[dealId]` |
| T2 | Deal sem dados comerciais | Critico | Estender `Deal` e criar `DealLineItem` |
| T3 | Contratos acoplados | Critico | Criar repositories, services e DTOs |
| T4 | Layout ruim | Critico | Implementar tela CRM com tabs |
| T5 | Campos por etapa ausentes | Moderado | Criar custom fields e regras por fase |
| T6 | Fechamento incompleto | Moderado | Validar ganho/perda e sincronizar venda |
| T7 | Historico insuficiente | Moderado | Registrar mudancas comerciais |
| T8 | WhatsApp no centro | Moderado | Mover para tab `activities` |
| T9 | Card pouco informativo | Menor | Adicionar resumo comercial |
| T10 | Testes incompletos | Moderado | Cobrir services, schemas e fluxo manual |

## Criticos Primeiro

### T1: Pagina dedicada

**Como testar:**

```bash
npm run lint
```

Esperado: card do Kanban navega para `/deals/[dealId]?tab=overview`.

### T2: Modelo comercial

**Como testar:**

```bash
npx prisma validate
```

Esperado: schema valido com `conversationId` opcional, `currency` com default seguro, campos comerciais e `DealLineItem`.

### T3: Contratos server

**Como testar:**

```bash
npm test -- src/features/deals
```

Esperado: services retornam DTO de detalhe sem Client Component importar server-only.

### T4: Tela CRM com tabs

**Como testar:**

```bash
npm run lint
```

Esperado: tabs `overview`, `items`, `activities`, `history`, `attribution`, `settings` funcionam por URL.

## Arquivos Principais

- `prisma/schema.prisma` - tornar `Deal.conversationId` opcional, adicionar campos em `Deal`, garantir `currency @default("BRL")` e criar `DealLineItem`.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/[dealId]/page.tsx` - nova rota fina.
- `src/features/deals/screens/deal-detail-screen.tsx` - nova screen de detalhe.
- `src/features/deals/components/detail/*` - componentes da tela CRM.
- `src/features/deals/forms/*` - formularios de propriedades e line items.
- `src/features/deals/repositories/*` - acesso a banco com `select` explicito.
- `src/features/deals/services/*` - casos de uso server-side.
- `src/features/deals/mappers/*` - DTOs para UI.
- `src/features/deals/schemas/deal.schemas.ts` - validacoes compartilhadas.
- `src/features/deals/components/kanban/deals-kanban-card.tsx` - navegacao e resumo comercial.

## Comecar

```bash
git checkout -b feature/deal-detail-crm-redesign
npx prisma validate
npm run lint

# T1: criar rota de detalhe
# T2: modelar campos comerciais e DealLineItem
# T3: criar services/repositories/DTOs
# T4: criar tela CRM com tabs

git commit -m "feat(deals): add CRM deal detail foundation"
```

## Ordem Recomendada de Commits

1. `feat(deals): add deal detail route`
2. `feat(deals): add commercial deal schema`
3. `feat(deals): add deal detail services`
4. `feat(deals): add CRM detail tabs`
5. `feat(deals): add stage field rules`
6. `feat(deals): improve close deal flow`
7. `test(deals): cover CRM deal detail`

## Validacao Manual

1. Abrir Kanban.
2. Clicar em uma deal.
3. Confirmar pagina de detalhe.
4. Alterar tab via UI.
5. Atualizar pagina e confirmar tab preservada.
6. Editar valor previsto.
7. Adicionar item negociado.
8. Verificar total da negociacao.
9. Fechar como ganho e confirmar venda.
10. Fechar outra deal como perdida e confirmar motivo obrigatorio.

## Decisoes A Confirmar Antes de Implementar

- Se `dealValue` sempre sera calculado por line items ou podera ser override manual.
- Se quantidades fracionadas entram no MVP. Se entrarem, migrar `SaleItem.quantity` para `Decimal`; se nao, manter `DealLineItem.quantity` como `Int`.
- Quais campos customizados entram no MVP.
- Se regras de campos customizados serao herdadas por `DealStageTemplate` agora ou configuradas manualmente apos criacao do funil.
- Se historico comercial usara model novo ou audit existente.
- Se item livre em `DealLineItem` sera permitido desde o MVP.

**Status:** pronto para iniciar.
