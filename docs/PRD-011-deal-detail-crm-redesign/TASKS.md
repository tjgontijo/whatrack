# Tasks: PRD-011 Deal Detail CRM Redesign

**Data:** 2026-05-19 | **Status:** Proposto | **Total Tasks:** 10 | **Estimado:** 7 a 10 dias uteis

## Fase 1: Criticos, 4 a 5 dias

### T1: Criar pagina dedicada de detalhe da deal, 0.5d

**Problema:** dialog nao e superficie adequada para uma negociacao completa.

**Localizacao:**

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/[dealId]/page.tsx` (novo)
- `src/features/deals/screens/deal-detail-screen.tsx` (novo)
- `src/features/deals/screens/deals-screen.tsx`
- `src/features/deals/components/dialogs/deal-details-dialog.tsx`

**O que fazer:**

1. Criar rota `/deals/[dealId]`.
2. Criar screen server ou composicao hibrida para detalhe.
3. Alterar click no Kanban/lista para navegar para a rota.
4. Remover dependencia do dialog para fluxo principal.
5. Manter `app/` fino, apenas lendo `params` e `searchParams` com `await`.

**Aceitacao:**

- [ ] Card do Kanban abre pagina de detalhe da deal.
- [ ] URL permite refresh sem perder deal aberta.
- [ ] Tab ativa fica em `searchParams`.
- [ ] Dialog atual nao e usado como experiencia principal.
- [ ] Arquivo de page em `app/` nao contem regra de negocio.

**Como testar:**

```bash
npm run lint
```

Cenario manual: abrir `/deals`, clicar em um card, confirmar navegacao para `/deals/[dealId]?tab=overview`.

### T2: Modelar campos comerciais e DealLineItem, 1d

**Problema:** o modelo atual nao registra dados essenciais da negociacao nem itens negociados.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/schemas/deal.schemas.ts`
- `src/features/deals/types.ts`

**O que fazer:**

1. Tornar `Deal.conversationId` opcional (`String? @db.Uuid`) e ajustar a relation `conversation` para permitir deals manuais sem WhatsApp.
2. Manter `leadId` obrigatorio no MVP. Criacao manual deve exigir lead existente ou criar lead antes da deal.
3. Adicionar campos comerciais a `Deal`: `name`, `description`, `expectedCloseDate`, `probabilityOverride`, `priority`, `temperature`, `nextStep`, `nextStepDueAt`, `currency`.
4. Definir `currency` com fallback, por exemplo `String @default("BRL")`, para migration segura em bases com deals existentes.
5. Criar `DealLineItem`.
6. Relacionar `DealLineItem` com `Deal`, `Organization`, `Project` e `Item`.
7. Garantir consistencia de `quantity` entre `DealLineItem` e `SaleItem`.
8. Atualizar schemas de create/update.
9. Definir regra de calculo de `dealValue` quando line items existirem.

**Snippet orientativo:**

```prisma
model DealLineItem {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid
  dealId         String   @db.Uuid
  itemId         String?  @db.Uuid
  name           String
  quantity       Int
  unitPrice      Decimal  @db.Decimal(12, 2)
  discountAmount Decimal? @db.Decimal(12, 2)
  total          Decimal  @db.Decimal(12, 2)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Observacao sobre `quantity`: o snippet acima usa `Int` porque `SaleItem.quantity` hoje e `Int`. Se o produto exigir quantidade fracionada, altere tambem `SaleItem.quantity` para `Decimal @db.Decimal(12, 2)` na mesma migration e ajuste T6 para converter sem perda de precisao.

**Aceitacao:**

- [ ] `Deal.conversationId` e opcional e relation `conversation` aceita `null`.
- [ ] Criacao manual de deal nao exige conversa, mas exige lead no MVP.
- [ ] `currency` tem default seguro, como `BRL`.
- [ ] Prisma schema tem campos comerciais em `Deal`.
- [ ] Prisma schema tem `DealLineItem`.
- [ ] `DealLineItem.quantity` e `SaleItem.quantity` usam tipos compativeis, sem perda silenciosa de precisao.
- [ ] IDs continuam gerados pelo banco, sem `cuid`, `nanoid` ou `uuid` no codigo.
- [ ] Schemas Zod validam numeros, datas e enums.
- [ ] Migration e gerada e revisada.

**Como testar:**

```bash
npx prisma validate
npm run lint
```

### T3: Criar contratos server para detalhe e update comercial, 1d

**Problema:** `deal.service.ts` concentra casos de uso e nao entrega DTO orientado a pagina CRM.

**Localizacao:**

- `src/features/deals/repositories/` (novo ou expandido)
- `src/features/deals/services/` (novos arquivos)
- `src/features/deals/mappers/` (novo)
- `src/app/api/v1/deals/[dealId]/route.ts`
- `src/app/api/v1/deals/[dealId]/line-items/route.ts` (novo, se usar API)

**O que fazer:**

1. Criar repository de detalhe com `select` explicito.
2. Criar service `get-deal-detail.service.ts`.
3. Criar service `update-deal-commercial-fields.service.ts`.
4. Criar service para criar, atualizar e remover line items.
5. Criar mapper para `DealDetailDTO`.
6. Manter API route fina, autenticando e chamando service.

**Fluxo esperado:**

```txt
Screen ou Query
  chama API route ou service server-side
API route
  autentica e resolve org/project
Service
  valida input e regra
Repository
  acessa DB com select explicito
Mapper
  retorna DTO de UI
```

**Aceitacao:**

- [ ] Nenhum Client Component importa service ou repository.
- [ ] Repositories usam `import "server-only"`.
- [ ] Todo acesso Prisma usa `select` explicito.
- [ ] Services recebem input externo como `unknown`.
- [ ] DTO de detalhe separa `summary`, `commercialFields`, `lineItems`, `lead`, `stage`, `attribution`, `activitySummary`.

**Como testar:**

```bash
npm run lint
npm test -- src/features/deals
```

### T4: Implementar pagina CRM com tabs, 1.5 a 2d

**Problema:** UI atual nao organiza dados comerciais relevantes.

**Localizacao:**

- `src/features/deals/screens/deal-detail-screen.tsx` (novo)
- `src/features/deals/components/detail/` (novo)
- `src/features/deals/forms/` (novo, se houver edicao inline)
- `src/features/deals/queries/` e `src/features/deals/mutations/`

**O que fazer:**

1. Criar header com nome, status, etapa, owner, valor, data prevista e acoes.
2. Criar tabs `overview`, `items`, `activities`, `history`, `attribution`, `settings`.
3. Criar sidebar de propriedades comerciais.
4. Criar tab de itens com tabela editavel.
5. Criar estados de loading, error e empty.
6. Usar Client Components apenas para tabs interativas, forms e mutations.

**Aceitacao:**

- [ ] Overview mostra valor, probabilidade, valor ponderado, data prevista, proxima acao e itens principais.
- [ ] Items mostra produto, quantidade, preco unitario, desconto e total.
- [ ] Activities nao domina a tela principal.
- [ ] Attribution fica em tab propria.
- [ ] Layout funciona em desktop e mobile sem overflow horizontal.
- [ ] Tabs podem ser acessadas por URL.

**Como testar:**

```bash
npm run lint
```

Cenarios manuais:

- Abrir deal com valor e sem itens.
- Abrir deal com itens.
- Trocar tabs e atualizar pagina.
- Reduzir viewport para mobile.

## Fase 2: Robustez, 2.5 a 4 dias

### T5: Implementar campos customizados e regras por etapa, 1 a 1.5d

**Problema:** campos da deal nao podem variar por processo comercial ou fase.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/schemas/`
- `src/features/deals/services/`
- `src/features/deal-stages/` ou `src/features/deals/components/stage-fields/` (a confirmar)

**O que fazer:**

1. Criar `DealFieldDefinition`, `DealFieldValue` e `DealStageFieldRule`.
2. Adicionar service para listar campos aplicaveis na etapa atual.
3. Validar obrigatoriedade no update, move stage e close.
4. Exibir campos customizados na sidebar ou tab settings.
5. Definir comportamento inicial com `DealStageTemplate` e `DealStageTemplateItem`: no MVP, regras podem ser configuradas apos o funil ser criado. O schema deve evitar bloquear futura heranca de regras pelos templates.

**Aceitacao:**

- [ ] Campo customizado pode ser definido por organizacao e projeto.
- [ ] Valor de campo e salvo por deal.
- [ ] Etapa pode marcar campo como obrigatorio.
- [ ] Sistema bloqueia avanco quando campo obrigatorio falta.
- [ ] UI mostra campos obrigatorios de forma clara.
- [ ] PR ou implementacao documenta se regras de campos sao herdadas de templates agora ou configuradas manualmente apos criacao do funil.

**Tempo:** 1 a 1.5d

### T6: Corrigir fechamento ganho/perdido, 0.5 a 1d

**Problema:** fechamento atual nao valida a negociacao completa.

**Localizacao:**

- `src/features/deals/services/deal.service.ts` ou novo `close-deal.service.ts`
- `src/features/sales/services/*`
- `prisma/schema.prisma`

**O que fazer:**

1. Ao ganhar, validar valor final e line items, quando exigidos.
2. Criar ou sincronizar `Sale` com `SaleItem`.
3. Ao perder, exigir `closedReason`.
4. Registrar historico do fechamento.
5. Converter `DealLineItem.quantity` para `SaleItem.quantity` sem arredondamento silencioso. Se houver quantidade fracionada, `SaleItem.quantity` deve ser migrado para `Decimal` antes do fechamento.

**Aceitacao:**

- [ ] Deal ganha com line items cria venda e itens de venda.
- [ ] Deal perdida sem motivo retorna erro controlado.
- [ ] Deal ganha sem valor retorna erro, salvo regra explicitamente permitida.
- [ ] Conversao de line items para sale items preserva quantidade e total.
- [ ] Fechamento atualiza status, closedAt e historico.

**Como testar:**

```bash
npm test -- src/features/deals/services
```

### T7: Implementar historico comercial, 0.5 a 1d

**Problema:** mudancas comerciais importantes nao ficam rastreadas para consulta.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/services/`
- `src/features/deals/components/detail/deal-history-tab.tsx` (novo)

**O que fazer:**

1. Definir se sera usado model novo `DealChangeLog` ou audit existente.
2. Registrar mudancas em etapa, valor, data prevista, probabilidade, responsavel, itens e fechamento.
3. Exibir timeline na tab `history`.

**Aceitacao:**

- [ ] Mudanca de etapa aparece no historico.
- [ ] Mudanca de valor aparece no historico.
- [ ] Mudanca de itens aparece no historico.
- [ ] Fechamento ganho/perdido aparece no historico.

**Tempo:** 0.5 a 1d

### T8: Reposicionar WhatsApp como atividade secundaria, 0.5d

**Problema:** WhatsApp e metricas de atendimento ocupam o centro da UI de negociacao.

**Localizacao:**

- `src/features/deals/components/dialogs/deal-details-dialog.tsx`
- `src/features/deals/components/detail/deal-activities-tab.tsx` (novo)
- `src/features/conversation-intelligence/components/conversation-intelligence-panel.tsx`

**O que fazer:**

1. Remover Conversation Intelligence do palco principal da deal.
2. Criar tab `activities`.
3. Mostrar resumo compacto de ultima conversa no overview, se util.
4. Evitar import profundo entre features quando possivel, preferir API publica ou composicao clara.

**Aceitacao:**

- [ ] Overview e focado na negociacao.
- [ ] WhatsApp aparece em tab secundaria.
- [ ] Nao ha metricas de atendimento no header comercial.

**Tempo:** 0.5d

## Fase 3: Melhorias, 0.5 a 1 dia

### T9: Atualizar Kanban e lista com resumo comercial, 0.5d

**Problema:** card/lista nao ajudam priorizacao comercial.

**Localizacao:**

- `src/features/deals/components/kanban/deals-kanban-card.tsx`
- `src/features/deals/components/list/deals-view-config.tsx`
- `src/features/deals/types.ts`

**O que fazer:**

1. Exibir item principal ou contagem de itens.
2. Exibir expected close date, quando existir.
3. Exibir alerta de proxima acao atrasada.
4. Manter layout denso e escaneavel.

**Aceitacao:**

- [ ] Card nao quebra visualmente.
- [ ] Vendedor enxerga valor e contexto comercial sem abrir a deal.
- [ ] Lista tem colunas comerciais relevantes.

### T10: Testes, seed e validacao final, 1d

**Problema:** mudanca altera banco, services e UI.

**Localizacao:**

- `src/features/deals/services/__tests__/*`
- `src/features/deals/schemas/*`
- `prisma/seed.ts` (se aplicavel)

**O que fazer:**

1. Adicionar testes para line items.
2. Adicionar testes para update comercial.
3. Adicionar testes para fechamento ganho/perdido.
4. Adicionar dados de seed para deal com itens.
5. Rodar lint, unit tests e validacao manual.

**Aceitacao:**

- [ ] Testes de services passam.
- [ ] Prisma validate passa.
- [ ] Lint passa.
- [ ] Fluxo manual de abrir, editar, adicionar item e fechar deal funciona.

**Como testar:**

```bash
npx prisma validate
npm run lint
npm test -- src/features/deals
```

## Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 | 0.5d | Nenhum |
| T2 | 1d | Decisao de campos MVP e tipo de `quantity` |
| T3 | 1d | T2 |
| T4 | 1.5 a 2d | T1, T3 |
| T5 | 1 a 1.5d | T2, decisao de custom fields e templates |
| T6 | 0.5 a 1d | T2, T3, tipo final de `quantity` |
| T7 | 0.5 a 1d | Decisao de audit |
| T8 | 0.5d | T4 |
| T9 | 0.5d | DTO atualizado |
| T10 | 1d | T2 a T9 |

**Total:** 7 a 10 dias uteis.

**Status:** pronto para execucao.
