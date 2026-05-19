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

**Problema:** o modelo atual nao registra dados essenciais da negociacao nem itens negociados e exige que toda deal tenha `conversationId`.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/schemas/deal.schemas.ts`
- `src/features/deals/types.ts`

**O que fazer:**

1. Tornar `Deal.conversationId` opcional (`String? @db.Uuid`).
2. Adicionar campos comerciais a `Deal`: `name`, `description`, `expectedCloseDate`, `probabilityOverride`, `priority`, `temperature`, `nextStep`, `nextStepDueAt`.
3. Adicionar campo `currency` na `Deal` com fallback (`String @default("BRL")`).
4. Criar `DealLineItem` com `quantity` do tipo `Int` para manter compatibilidade com `SaleItem`.
5. Relacionar `DealLineItem` com `Deal`, `Organization`, `Project` e `Item`.
6. Atualizar schemas de create/update.
7. Definir regra de calculo de `dealValue` quando line items existirem (opcional).

**Snippet orientativo:**

```prisma
model DealLineItem {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid
  dealId         String   @db.Uuid
  itemId         String?  @db.Uuid
  name           String
  quantity       Int      @default(1)
  unitPrice      Decimal  @db.Decimal(12, 2)
  discountAmount Decimal? @db.Decimal(12, 2)
  total          Decimal  @db.Decimal(12, 2)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Aceitacao:**

- [ ] Prisma schema tem campos comerciais em `Deal` e `conversationId` eh opcional.
- [ ] Prisma schema tem `DealLineItem` com `quantity` como `Int`.
- [ ] IDs continuam gerados pelo banco.
- [ ] Migration e gerada e revisada com sucesso (campo `currency` default).

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
4. Criar service para criar, atualizar e remover line items (opcional para o cliente).
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

### T4: Implementar pagina CRM (Foco Agil), 1.5 a 2d

**Problema:** UI atual nao organiza dados comerciais relevantes e concorre com o Inbox de chat.

**Localizacao:**

- `src/features/deals/screens/deal-detail-screen.tsx` (novo)
- `src/features/deals/components/detail/` (novo)
- `src/features/deals/forms/` (novo, se houver edicao inline)

**O que fazer:**

1. Criar header com nome, status, etapa, valor, data prevista e **botao "Ir para Inbox"**.
2. Criar abas simplificadas: `overview`, `history`, `attribution`, `settings`.
3. No `overview`, adicionar bloco de "Resumo de Contexto" (ex: ultimas msgs ou resumo IA).
4. Permitir edicao direta do `dealValue` sem obrigar preenchimento de itens.
5. Criar secao opcional de itens negociaveis.
6. Criar sidebar de propriedades comerciais (Next Step, Data Previsao, etc).

**Aceitacao:**

- [ ] Vendedor consegue alterar valor total e etapa facilmente na tela principal.
- [ ] Overview mostra o contexto da conversa (IA ou ultimas msgs), proxima acao.
- [ ] Header possui link facil (deep link) para a tela de Inbox.
- [ ] Nao ha concorrencia com tela completa de WhatsApp na pagina da Deal.

**Como testar:**

```bash
npm run lint
```

Cenarios manuais:

- Abrir deal e testar edicao rapida de valor.
- Clicar em "Ir para Inbox".
- Adicionar itens opcionalmente e verificar mudanca de total.

## Fase 2: Robustez, 2.5 a 4 dias

### T5: Implementar campos customizados simples, 1 a 1.5d

**Problema:** clientes precisam salvar dados especificos (ex: CPF, Chassi) na deal.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/schemas/`
- `src/features/deals/services/`

**O que fazer:**

1. Criar `DealFieldDefinition` e `DealFieldValue`.
2. Permitir listar e salvar valores dinamicos na deal.
3. Exibir campos customizados na sidebar.
4. **Simplificacao:** Evitar criar "Travas Obrigatorias" estritas por fase (Stage Gates) neste MVP para nao burocratizar o arraste no Kanban. Apenas mostrar os campos.

**Aceitacao:**

- [ ] Campo customizado pode ser definido.
- [ ] Valor de campo e salvo por deal.
- [ ] Avanco de fase continua fluido sem bloqueios de sistema.

**Tempo:** 1 a 1.5d

### T6: Corrigir fechamento ganho/perdido (Sem travas excessivas), 0.5 a 1d

**Problema:** fechamento atual nao e rastreado direito.

**Localizacao:**

- `src/features/deals/services/deal.service.ts` ou novo `close-deal.service.ts`
- `src/features/sales/services/*`
- `prisma/schema.prisma`

**O que fazer:**

1. Ao ganhar, validar valor final.
2. Criar `Sale`. Se houver line items, converter em `SaleItem`. Se nao, fechar venda com valor principal apenas.
3. Ao perder, exigir `closedReason`.
4. Registrar historico do fechamento.

**Aceitacao:**

- [ ] Deal ganha com line items cria venda e itens de venda.
- [ ] Deal ganha SEM line items cria venda com sucesso usando `dealValue`.
- [ ] Deal perdida exige motivo.

**Como testar:**

```bash
npm test -- src/features/deals/services
```

### T7: Implementar historico comercial unificado, 0.5 a 1d

**Problema:** gestor nao sabe mudancas recentes.

**Localizacao:**

- `prisma/schema.prisma`
- `src/features/deals/services/`
- `src/features/deals/components/detail/deal-history-tab.tsx` (novo)

**O que fazer:**

1. Registrar mudancas comerciais (etapa, valor, proxima acao) e fechamento.
2. Intercalar na linha do tempo da aba `history` eventos de mensagens (ex: "Cliente enviou mensagem") para unificar contexto.

**Aceitacao:**

- [ ] Mudanca de etapa aparece no historico.
- [ ] Timeline mostra eventos misturados (negocio e eventos macro de comunicacao).

**Tempo:** 0.5 a 1d

### T8: Remover WhatsApp completo da Deal, 0.5d

**Problema:** Interface antiga trazia muito peso do chat para a UI da deal.

**Localizacao:**

- `src/features/deals/components/dialogs/deal-details-dialog.tsx`

**O que fazer:**

1. Remover componentes pesados de Conversation Intelligence do palco principal.
2. Garantir que a navegacao focada no chat acontece estritamente no botao "Ir para Inbox".

**Aceitacao:**

- [ ] Overview e focado na negociacao e apenas resumos de interacao.
- [ ] Interface e agil e carrega sem carregar modulos de web socket completos de chat, se desnecessario.

**Tempo:** 0.5d

## Fase 3: Melhorias, 0.5 a 1 dia

### T9: Atualizar Kanban e lista com resumo comercial, 0.5d

**Problema:** card/lista nao ajudam priorizacao comercial.

**Localizacao:**

- `src/features/deals/components/kanban/deals-kanban-card.tsx`
- `src/features/deals/components/list/deals-view-config.tsx`
- `src/features/deals/types.ts`

**O que fazer:**

1. Exibir alerta de proxima acao atrasada ou data prevista.
2. Manter layout denso e escaneavel, priorizando valor e urgencia.

**Aceitacao:**

- [ ] Card ajuda vendedor a decidir proxima acao sem abrir a deal.

### T10: Testes, seed e validacao final, 1d

**Problema:** mudanca altera banco, services e UI.

**Localizacao:**

- `src/features/deals/services/__tests__/*`
- `src/features/deals/schemas/*`
- `prisma/seed.ts` (se aplicavel)

**O que fazer:**

1. Adicionar testes para update comercial (com/sem conversationId).
2. Adicionar testes para fechamento ganho.
3. Adicionar dados de seed.

**Aceitacao:**

- [ ] Testes de services passam.
- [ ] Prisma validate passa.
- [ ] Lint passa.

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
| T2 | 1d | Decisao de campos MVP |
| T3 | 1d | T2 |
| T4 | 1.5 a 2d | T1, T3 |
| T5 | 1 a 1.5d | T2, decisao de custom fields |
| T6 | 0.5 a 1d | T2, T3 |
| T7 | 0.5 a 1d | Decisao de audit |
| T8 | 0.5d | T4 |
| T9 | 0.5d | DTO atualizado |
| T10 | 1d | T2 a T9 |

**Total:** 7 a 10 dias uteis.

**Status:** pronto para execucao.
