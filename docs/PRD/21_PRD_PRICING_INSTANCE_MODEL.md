# PRD 21 — Modelo de Precificacao por Projeto e Add-ons Operacionais

## Status

Proposto. Substitui o modelo de planos tiered (`Starter`, `Pro`, `Agency`) e tambem substitui o desenho anterior de cobranca centrado apenas em instancias de WhatsApp.

Contabilizacao detalhada de creditos e overage continua em PRD dedicado.

## Regra de Execucao

Este PRD deve ser executado como mudanca greenfield:

- nao manter coexistencia ativa de catalogo antigo no `src/`
- nao criar modo legacy, flag `isLegacy` ou fallback de pricing no runtime
- em desenvolvimento, o caminho preferencial e cutover destrutivo com reset de banco e recriacao do catalogo

## Decisao

O WhaTrack adota um modelo de cobranca centrado em **clientes ativos da agencia**.

No produto, esse cliente ativo continua sendo representado internamente por `Project`.

Regra comercial:

- `Organization` e a unidade de billing
- `Project` e a unidade operacional e de franquia
- o plano base inclui `3 projetos ativos`
- cada projeto inclui:
  - `1 numero de WhatsApp`
  - `1 conta Meta Ads`
  - `300 conversoes rastreadas / mes`
  - `10.000 creditos de IA / mes`
- `Projeto adicional`: `R$ 97 / mes`
- `WhatsApp adicional no mesmo projeto`: `R$ 49 / mes`
- `Conta Meta Ads adicional no mesmo projeto`: `R$ 49 / mes`

Regras de leitura:

- externamente, a oferta pode falar em `clientes ativos`
- internamente, o sistema continua usando `Project`
- add-ons de WhatsApp e Meta Ads **nao criam nova franquia**
- a franquia de conversoes e creditos pertence ao projeto

## Estrutura de Preco

```text
Plano base:                     R$ 497,00 / mes
Projetos incluidos:            3
Por projeto adicional:         R$ 97,00 / mes
WhatsApp adicional no projeto: R$ 49,00 / mes
Meta Ads adicional no projeto: R$ 49,00 / mes

Franquia por projeto:
- 1 numero de WhatsApp
- 1 conta Meta Ads
- 300 conversoes / mes
- 10.000 creditos de IA / mes
```

## Value Proposition

Esse modelo conversa melhor com o ICP real:

- a agencia pensa em `quantos clientes consigo operar`
- cada cliente tem sua estrutura operacional propria
- excecoes ficam cobertas por add-ons simples

| Agencia | Clientes ativos | Custo WhaTrack | Receita agencia | % da receita |
|---|---:|---:|---:|---:|
| Pequena | 3 | R$ 497 | R$ 4.500 | 11% |
| Media | 5 | R$ 691 | R$ 7.500 | 9% |
| Grande | 10 | R$ 1.176 | R$ 15.000 | 8% |
| Premium | 10 | R$ 1.176 | R$ 30.000 | 4% |

O custo continua justificavel porque o WhaTrack passa a ser lido como infraestrutura de retencao e prova de resultado por cliente.

## Franquia por Projeto

Cada `Project` ativo representa um cliente atendido pela agencia e carrega sua propria franquia mensal:

- `300 conversoes rastreadas`
- `10.000 creditos de IA`

Essas franquias:

- pertencem ao `Project`
- nao pertencem ao numero de WhatsApp
- nao pertencem a conta Meta Ads

Consequencias:

- se o projeto tiver `2 numeros de WhatsApp`, ambos compartilham as mesmas `300 conversoes` e `10.000 creditos`
- se o projeto tiver `2 contas Meta Ads`, ambas compartilham a mesma franquia do projeto
- se a agencia criar `1 projeto adicional`, esse novo projeto ganha uma nova franquia completa

## O que muda no sistema atual

### Billing Plans (seed)

O seed atual de planos tiered sai de cena e passa a existir um catalogo simples com:

**Plano base: `platform_base`**

```typescript
{
  slug: 'platform_base',
  name: 'WhaTrack',
  description: 'Plataforma para agencias provarem atribuicao real de Meta Ads ate o WhatsApp.',
  monthlyPrice: new Prisma.Decimal('497.00'),
  supportLevel: 'priority',
  isHighlighted: true,
  contactSalesOnly: false,
  displayOrder: 0,
  metadata: {
    cta: 'Teste gratis por 14 dias',
    trialDays: 14,
    includedProjects: 3,
    includedWhatsAppPerProject: 1,
    includedMetaAdsPerProject: 1,
    includedConversionsPerProject: 300,
    includedAiCreditsPerProject: 10000,
    features: [
      'Ate 3 clientes ativos',
      '1 numero de WhatsApp por cliente',
      '1 conta Meta Ads por cliente',
      '300 conversoes por cliente / mes',
      '10.000 creditos de IA por cliente / mes',
      'Suporte prioritario',
    ],
    additionals: [
      'R$ 97 por cliente adicional',
      'R$ 49 por numero de WhatsApp adicional no cliente',
      'R$ 49 por conta Meta Ads adicional no cliente',
    ],
  },
}
```

**Add-on: `additional_project`**

```typescript
{
  slug: 'additional_project',
  name: 'Projeto adicional',
  description: 'Adiciona um novo cliente ativo com franquia completa.',
  monthlyPrice: new Prisma.Decimal('97.00'),
  displayOrder: 1,
}
```

**Add-on: `additional_whatsapp_number`**

```typescript
{
  slug: 'additional_whatsapp_number',
  name: 'WhatsApp adicional',
  description: 'Adiciona um numero de WhatsApp extra dentro do mesmo projeto.',
  monthlyPrice: new Prisma.Decimal('49.00'),
  displayOrder: 2,
}
```

**Add-on: `additional_meta_ad_account`**

```typescript
{
  slug: 'additional_meta_ad_account',
  name: 'Conta Meta Ads adicional',
  description: 'Adiciona uma conta Meta Ads extra dentro do mesmo projeto.',
  monthlyPrice: new Prisma.Decimal('49.00'),
  displayOrder: 3,
}
```

### Stripe

O modelo Stripe equivalente fica:

- **Product `platform_base`**
  - assinatura recorrente fixa de `R$ 497 / mes`
- **Product `additional_project`**
  - assinatura recorrente por quantidade
  - `licensed`
- **Product `additional_whatsapp_number`**
  - assinatura recorrente por quantidade
  - `licensed`
- **Product `additional_meta_ad_account`**
  - assinatura recorrente por quantidade
  - `licensed`
- **Overage de creditos**
  - price separado, possivelmente `metered`, em PRD futuro

Na Stripe, isso vira uma assinatura com multiplos itens:

- 1 item fixo `platform_base`
- 0..N itens `additional_project`
- 0..N itens `additional_whatsapp_number`
- 0..N itens `additional_meta_ad_account`

## Regras Operacionais de Billing

### Projeto faturavel

`Project` entra na conta comercial quando:

- esta `active`
- nao esta arquivado

Regras:

- os `3` primeiros projetos ativos estao incluidos no plano base
- a partir do `4o`, cada projeto ativo adicional gera `+1` na quantidade de `additional_project`
- arquivar um projeto libera sua vaga comercial

### WhatsApp adicional faturavel

Dentro de um projeto ativo:

- o primeiro numero de WhatsApp esta incluido
- a partir do segundo numero conectado/ativo, cada um gera `+1` em `additional_whatsapp_number`

### Meta Ads adicional faturavel

Dentro de um projeto ativo:

- a primeira conta Meta Ads esta incluida
- a partir da segunda conta conectada/ativa, cada uma gera `+1` em `additional_meta_ad_account`

### Franquia compartilhada no projeto

WhatsApps e contas Meta extras dentro do mesmo projeto:

- compartilham as `300 conversoes`
- compartilham os `10.000 creditos de IA`

Nao existe franquia nova por add-on de WhatsApp ou Meta.

## Trial

- `14 dias gratis`
- `sem cartao`
- onboarding continua focado no primeiro cliente

### Escopo do trial

Durante o trial:

- liberar `1 projeto`
- liberar `1 numero de WhatsApp`
- liberar `1 conta Meta Ads`
- liberar a franquia desse projeto para validacao inicial

Bloqueios no trial:

- criar projeto adicional
- conectar WhatsApp adicional no mesmo projeto
- conectar Meta Ads adicional no mesmo projeto

Motivo:

- evita abuso
- simplifica o onboarding
- mantem a experiencia centrada no primeiro cliente

Ao converter para pago:

- o plano base libera ate `3 projetos ativos`
- add-ons passam a ser permitidos

## O que NAO muda neste PRD

- mecanica detalhada de consumo de creditos por tipo de analise
- valor de overage por creditos
- ledger detalhado de creditos
- regras de notificacao de franquia perto do fim

Esses pontos continuam em PRD dedicado de creditos.

## Impacto em PRDs anteriores

| PRD | Impacto |
|---|---|
| PRD 12 (Stripe First) | Stripe passa a ser modelada com base + add-ons comerciais |
| PRD 14 (Stripe Core) | subscription precisa suportar 4 itens de assinatura e sincronizacao de quantidades |
| PRD 15 (Plans CRUD) | admin CRUD precisa gerenciar plano base + 3 add-ons |
| PRD 16 (Overage) | overage passa a ser por creditos do projeto, nao por eventos |
| PRD 18 (Smoke) | smoke deve validar trial, projeto adicional, WhatsApp extra e Meta Ads extra |
| PRD 19 (Projects) | `Project` vira tambem unidade de franquia operacional |
| PRD 20 (Onboarding) | trial permanece focado no primeiro projeto, nao na conta inteira |
| PRD 22 (Copy) | pricing e copy passam a falar em clientes ativos + extras operacionais |

## Metricas de Sucesso

- `active_projects_count`
- `additional_project_qty`
- `additional_whatsapp_number_qty`
- `additional_meta_ad_account_qty`
- `avg_projects_per_organization`
- `avg_mrr_per_organization`
- `credits_used_per_project`
- `conversions_tracked_per_project`

## Criterios de Aceite

- seed usa `platform_base` a `R$ 497 / mes`
- seed usa add-on `additional_project` a `R$ 97 / mes`
- seed usa add-on `additional_whatsapp_number` a `R$ 49 / mes`
- seed usa add-on `additional_meta_ad_account` a `R$ 49 / mes`
- trial de `14 dias` esta configurado
- trial libera apenas o primeiro projeto
- plano pago libera ate `3 projetos ativos`
- projeto adicional incrementa quantidade de billing corretamente
- WhatsApp adicional e Meta Ads adicional incrementam billing corretamente
- franquia de conversoes e creditos permanece por projeto
- nao restam referencias ativas a `Starter`, `Pro` ou `Agency`

## Plano de Cutover

Este PRD substitui o modelo anterior de billing e exige cutover claro.

### Artefatos ativos substituidos por este PRD

Documentos:

- `03_PRD_V1_DOMAIN_BILLING.md`
- `12_PRD_STRIPE_FIRST_BILLING.md`
- `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`
- `15_PRD_BILLING_PLANS_CRUD.md`
- `16_PRD_BILLING_OVERAGE_EXECUTION.md`
- `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md`
- `22_PRD_AGENCY_POSITIONING_AND_COPY.md`

Codigo e config:

- `prisma/seeds/seed_billing_plans.ts`
- `src/components/landing/LandingPricing.tsx`
- `src/components/dashboard/billing/billing-page-content.tsx`
- Stripe Products/Prices antigos
- docs operacionais de Stripe

### Impacto destrutivo

- planos `starter`, `pro`, `agency` deixam de existir
- `eventLimitPerMonth` deixa de ser a unidade comercial principal
- `maxWhatsAppNumbers` e `maxAdAccounts` deixam de ser limites fixos do plano
- trial deixa de refletir o catalogo antigo e passa a refletir o primeiro projeto

### Estrategia de cutover

Como o produto ainda esta em desenvolvimento, este cutover deve ser tratado como destrutivo e sem legado.

1. Atualizar seed para `platform_base` + 3 add-ons
2. Criar Products/Prices no Stripe
3. Atualizar billing services para sincronizar quantidades por projeto/WhatsApp/Meta
4. Atualizar landing e billing dashboard
5. Atualizar trial para liberar apenas o primeiro projeto
6. Remover do codigo e das docs ativas qualquer referencia operacional ao catalogo antigo
7. Se necessario em dev, recriar banco com `bash scripts/reset-db.sh`

### Checklist de validacao pos-cutover

- [ ] Products e Prices criados no Stripe
- [ ] Seed atualizado e executado
- [ ] Trial libera apenas o primeiro projeto
- [ ] Conversao para pago libera 3 projetos incluidos
- [ ] Projeto adicional incrementa `additional_project`
- [ ] WhatsApp adicional incrementa `additional_whatsapp_number`
- [ ] Meta Ads adicional incrementa `additional_meta_ad_account`
- [ ] Billing dashboard exibe base + extras
- [ ] Landing/pricing page exibe modelo novo

## Riscos e Trade-offs

- trial com apenas 1 projeto pode gerar duvida se a landing prometer os 3 incluidos cedo demais
- o modelo fica mais forte comercialmente, mas exige regras de sincronizacao mais cuidadosas no app
- franquia por projeto reduz complexidade comercial, mas exige ledger por projeto bem definido
- cutover de billing continua sendo operacao sensivel e precisa de execucao coordenada, mesmo sem legado
