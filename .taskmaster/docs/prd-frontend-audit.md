# PRD: Sistema de Auditoria e Padronização do Frontend

## 1. Visão Geral

### Problema
O frontend do Whatrack apresenta inconsistências significativas entre páginas:
- Cada página parece um sistema diferente
- Componentes diferentes para funções similares
- Espaçamentos e layouts inconsistentes
- Mix de componentes customizados e Shadcn UI
- Padrões de código variados

### Objetivo
Criar um sistema de análise que gere relatórios detalhados de cada página, identificando:
1. Desvios do padrão estabelecido
2. Componentes fora do Design System
3. Inconsistências de layout e espaçamento
4. Oportunidades de refatoração

### Estrutura de Arquivos
```
.taskmaster/docs/
  └── prd-frontend-audit.md          # Este PRD

front_analytics/
  ├── _TEMPLATE.md                   # Template para análise
  ├── _SUMMARY.md                    # Relatório consolidado
  └── [nome-da-pagina].md            # Análise de cada página (19 arquivos)
```

---

## 2. Escopo de Páginas (19 Total)

### Páginas Públicas (6)
| ID | Rota | Arquivo | Categoria |
|----|------|---------|-----------|
| 01 | `/` | `src/app/page.tsx` | Marketing |
| 02 | `/pricing` | `src/app/pricing/page.tsx` | Marketing |
| 03 | `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Auth |
| 04 | `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Auth |
| 05 | `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Auth |
| 06 | `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Auth |

### Onboarding (1)
| ID | Rota | Arquivo | Categoria |
|----|------|---------|-----------|
| 07 | `/onboarding` | `src/app/(onboarding)/page.tsx` | Onboarding |

### Dashboard (12)
| ID | Rota | Arquivo | Categoria |
|----|------|---------|-----------|
| 08 | `/dashboard` | `src/app/dashboard/page.tsx` | Analytics |
| 09 | `/dashboard/leads` | `src/app/dashboard/leads/page.tsx` | Data Tables |
| 10 | `/dashboard/sales` | `src/app/dashboard/sales/page.tsx` | Data Tables |
| 11 | `/dashboard/tickets` | `src/app/dashboard/tickets/page.tsx` | Data Tables |
| 12 | `/dashboard/products` | `src/app/dashboard/products/page.tsx` | Data Tables |
| 13 | `/dashboard/inbox` | `src/app/dashboard/inbox/page.tsx` | Messaging |
| 14 | `/dashboard/inbox/instance/[id]` | `src/app/dashboard/inbox/instance/[instanceId]/page.tsx` | Messaging |
| 15 | `/dashboard/settings/profile` | `src/app/dashboard/settings/profile/page.tsx` | Settings |
| 16 | `/dashboard/settings/organization` | `src/app/dashboard/settings/organization/page.tsx` | Settings |
| 17 | `/dashboard/settings/team` | `src/app/dashboard/settings/team/page.tsx` | Settings |
| 18 | `/dashboard/settings/billing` | `src/app/dashboard/settings/billing/page.tsx` | Settings |
| 19 | `/dashboard/settings/whatsapp` | `src/app/dashboard/settings/whatsapp/page.tsx` | Settings |

---

## 3. Critérios de Análise

### 3.1 Layout & Estrutura

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Container máximo | `max-w-7xl mx-auto` | Alta |
| Padding horizontal | `px-4 sm:px-6 lg:px-8` | Alta |
| Padding top (dashboard) | `pt-6` ou `py-6` | Alta |
| Gap entre seções | `space-y-6` ou `gap-6` | Média |
| Wrapper de página | `<div className="space-y-6">` | Média |

### 3.2 Componentes UI

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Biblioteca base | Shadcn UI (`@/components/ui/*`) | Alta |
| Botões | `<Button>` de Shadcn | Alta |
| Inputs | `<Input>` de Shadcn | Alta |
| Cards | `<Card>` de Shadcn | Alta |
| Tabelas | `<Table>` de Shadcn ou TanStack Table | Média |
| Formulários | React Hook Form + Zod | Alta |
| Modais/Dialogs | `<Dialog>` de Shadcn | Alta |
| Selects | `<Select>` de Shadcn | Média |
| Loading states | `<Skeleton>` de Shadcn | Média |

### 3.3 Tipografia

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Título de página | `text-2xl font-bold tracking-tight` | Alta |
| Subtítulo | `text-muted-foreground` | Média |
| Títulos de seção | `text-lg font-semibold` | Média |
| Texto de corpo | `text-sm` | Baixa |

### 3.4 Page Header

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Estrutura | Título + Descrição + Ações | Alta |
| Layout | `flex justify-between items-center` | Média |
| Ações | Botões à direita | Média |

### 3.5 Estados

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Loading | Skeleton ou spinner consistente | Alta |
| Empty state | Componente padronizado com ícone + texto + CTA | Média |
| Error state | Toast ou Alert consistente | Média |

### 3.6 Responsividade

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Mobile first | Classes base + breakpoints (sm, md, lg, xl) | Alta |
| Grid columns | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | Média |
| Tabelas | Scroll horizontal em mobile | Média |

### 3.7 Next.js 16 + React 19 Best Practices

> **Nota:** Este projeto usa **Next.js 16** com **React 19** e App Router.
>
> **Mudanças importantes do Next.js 15+:**
> - `params` e `searchParams` são **Promises** (precisam de `await`)
> - Server Components são o padrão
> - `turbopack` é o bundler padrão para dev
> - Caching mais granular com `unstable_cache` e `revalidateTag`
>
> **Novidades do React 19:**
> - `use()` hook para promises e context
> - Server Components nativos
> - Actions (`useActionState`, `useFormStatus`)
> - `useOptimistic` para UI otimista
> - Melhor hydration e streaming

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Server vs Client Components | Preferir Server Components, `'use client'` só quando necessário | Alta |
| `loading.tsx` | Cada rota deve ter loading state nativo | Alta |
| `error.tsx` | Error boundary em rotas críticas | Média |
| `not-found.tsx` | Página 404 customizada | Baixa |
| `<Link>` component | Usar `next/link` para navegação interna (prefetch) | Alta |
| `<Image>` component | Usar `next/image` para otimização | Média |
| Metadata/SEO | `generateMetadata` ou `metadata` export | Média |
| Route Groups | `(group)` para organização sem afetar URL | Baixa |
| Parallel Routes | `@slot` para UIs independentes | Baixa |
| Streaming/Suspense | `<Suspense>` para carregamento progressivo | Média |
| Dynamic params | `await params` (Next.js 15 breaking change) | Alta |

### 3.8 Navegação & UX

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Prefetch de links | Links visíveis fazem prefetch automático | Alta |
| Transições suaves | Sem "flash" branco entre páginas | Alta |
| Breadcrumbs | Navegação clara em páginas aninhadas | Média |
| Active state no menu | Indicador visual da página atual | Alta |
| Back button | Funciona corretamente com histórico | Alta |
| Deep linking | URLs compartilháveis com estado | Média |

### 3.9 Performance

| Critério | Padrão Esperado | Severidade |
|----------|-----------------|------------|
| Bundle size | Componentes não importam libs desnecessárias | Alta |
| Code splitting | Dynamic imports para componentes pesados | Média |
| Data fetching | Server-side quando possível, React Query client-side | Alta |
| Caching | Usar `revalidate` ou `cache` adequadamente | Média |
| Lazy loading | Imagens e componentes below-the-fold | Média |

---

## 4. Sistema de Pontuação

### Conformidade por Página (0-100)

```
Score = Σ(Peso × Conformidade) / Σ(Pesos) × 100
```

### Pesos por Severidade

| Severidade | Peso |
|------------|------|
| Alta | 3 |
| Média | 2 |
| Baixa | 1 |

### Classificação

| Score | Classificação | Ação |
|-------|---------------|------|
| 90-100 | Conforme | Manter |
| 70-89 | Aceitável | Ajustes menores |
| 50-69 | Não conforme | Refatoração necessária |
| 0-49 | Crítico | Reescrever página |

---

## 5. Formato do Output (front_analytics/)

### Template (`_TEMPLATE.md`)
Modelo padrão para análise de cada página.

### Por Página (`[nome].md`)
Análise detalhada com:
- Score de conformidade
- Checklist de critérios
- Desvios encontrados (por severidade)
- Componentes utilizados (Shadcn vs Custom)
- Estimativa de esforço para correção

### Consolidado (`_SUMMARY.md`)
- Ranking de todas as páginas por score
- Problemas mais recorrentes
- Priorização de refatorações

---

## 6. Plano de Execução

### Fase 1: Setup
- [x] Criar PRD em `.taskmaster/docs/`
- [ ] Criar template `front_analytics/_TEMPLATE.md`
- [ ] Criar estrutura de diretórios

### Fase 2: Análise
- [ ] Analisar 19 páginas
- [ ] Gerar arquivo de análise para cada página

### Fase 3: Consolidação
- [ ] Criar `_SUMMARY.md` com ranking
- [ ] Identificar padrões de problemas
- [ ] Priorizar refatorações

### Fase 4: Ação
- [ ] Criar tasks para refatorações prioritárias
- [ ] Implementar correções

---

## 7. Próximos Passos

1. Criar `front_analytics/_TEMPLATE.md` com o modelo de análise
2. Executar análise das 19 páginas
3. Gerar `front_analytics/_SUMMARY.md`
