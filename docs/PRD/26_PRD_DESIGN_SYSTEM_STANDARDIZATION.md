# PRD 25 — Padronizacao do Design System e Telas de Configuracao

## Status

Proposto. Cobre a padronizacao de shells, tokens de cor, pagina de account e nomenclatura de billing.

## Objetivo

Fazer o dashboard parecer um produto coeso, nao varios sistemas colados.

Este PRD resolve quatro problemas independentes mas relacionados:

1. **Tokens de cor hardcoded** nos componentes de layout compartilhados
2. **Tres shells de pagina** sem criterio de uso
3. **Pagina de Account** sem estrutura e com responsabilidades misturadas
4. **"Billing"** como nome em ingles em produto que usa portugues

---

## Diagnostico: O Que Esta Quebrado

### 1. Cores hardcoded nos componentes base

Os piores casos estao nos componentes de layout usados em toda tela.

**`src/components/dashboard/layout/page-shell.tsx`**
```tsx
// PROBLEMA: background hardcoded
<div className="flex h-full flex-col bg-gray-50 dark:bg-zinc-950">
// CORRETO: usar token
<div className="flex h-full flex-col bg-muted/30">
```

**`src/components/dashboard/layout/page-header.tsx`**
```tsx
// PROBLEMA: emerald hardcoded no icone
<div className="... bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">

// PROBLEMA: grays hardcoded no texto
<h1 className="text-display text-gray-900 dark:text-white">
<p className="text-caption mt-1 text-gray-500 dark:text-gray-400">

// CORRETO
<div className="... bg-primary/10 text-primary">
<h1 className="text-display text-foreground">
<p className="text-caption mt-1 text-muted-foreground">
```

**`src/components/dashboard/billing/billing-status.tsx`**
```tsx
// PROBLEMA: emerald e amber hardcoded nos pills de status
pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
pill: 'bg-amber-500/10 text-amber-700 border-amber-500/25'

// ACEITAVEL com ressalva: status semantico pode usar cor semantica
// Mas preferir: usar as variaveis CSS de sucesso/aviso se o tema suportar
// Ou isolar em constante nomeada, nao inline
```

**`src/app/dashboard/tickets/page.tsx`**
```tsx
// PROBLEMA: emerald hardcoded em valor monetario
<span className="font-semibold text-emerald-600">
// CORRETO
<span className="font-semibold text-primary">
// ou definir variavel semantica --color-currency no tema
```

**Impacto:** `page-shell` e `page-header` sao usados em praticamente todas as paginas. Corrigir esses dois arquivos melhora todo o produto de uma vez.

### 2. Tres shells de pagina sem criterio

| Shell | Arquivos | Caracteristica |
|---|---|---|
| `PageShell` | Projects, AI, Pipeline, Audit | PageHeader + PageContent, background proprio |
| `CrudPageShell` | Leads, Sales, Items, Categories | Toolbar + views (list/card/kanban), sem PageHeader |
| `TemplateMainShell` | WhatsApp, Meta Ads (settings) | Full-width, sem padding fixo, header proprio |

`TemplateMainShell` foi criado para telas operacionais de CRM (inbox, leads). Foi reaproveitado erroneamente nas telas de configuracao de WhatsApp e Meta Ads.

**Regra que faltou:**
```
Tela operacional com toolbar de filtros → CrudPageShell
Tela de configuracao/settings → PageShell
Tela nao padronizada (inbox, kanban especial) → caso a caso
```

### 3. Pagina de Account: quatro problemas numa tela

Estrutura atual de `/dashboard/account`:

```
Minha Conta (titulo hardcoded, sem PageShell)
  AccountProfileCard    ← perfil pessoal (nome, email, telefone)
  Security Card        ← senha (inline, sem componente proprio)
  AccountOrganizationCard  ← dados fiscais da empresa
  AccountBillingCard   ← plano atual, limites, link para billing
```

Problemas:

- Nao usa `PageShell` — padding, largura e background sao CSS custom
- Titulo hardcoded (`text-2xl font-semibold`) em vez de `PageHeader`
- Quatro responsabilidades diferentes na mesma pagina sem separacao visual clara
- Dados fiscais da **organizacao** misturados com dados pessoais do **usuario**
- Card de billing e redundante (o usuario ja tem a pagina de Assinatura)

### 4. "Billing" no sidebar

O link no sidebar diz "Billing" (ingles). A pagina ja usa "Assinatura" no titulo e no metadata. O usuario ve dois nomes para a mesma coisa.

```
Sidebar:  "Billing"       ← ingles
Pagina:   "Assinatura"    ← portugues
Metadata: "Assinatura | WhaTrack"  ← portugues
```

---

## Decisoes

### Decisao 1: Corrigir tokens de cor nos componentes base

**Arquivos a modificar:**

`src/components/dashboard/layout/page-shell.tsx`
```tsx
// Antes
bg-gray-50 dark:bg-zinc-950
// Depois
bg-muted/30
```

`src/components/dashboard/layout/page-header.tsx`
```tsx
// Icone
bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
→ bg-primary/10 text-primary

// Titulo
text-gray-900 dark:text-white
→ text-foreground

// Descricao
text-gray-500 dark:text-gray-400
→ text-muted-foreground
```

`src/components/dashboard/layout/page-toolbar.tsx`
```tsx
// Nao e usado em nenhuma pagina — remover o arquivo
```

`src/components/dashboard/billing/billing-status.tsx`
```tsx
// Extrair as cores semanticas para constantes nomeadas no topo do arquivo
// Nao mudar para tokens genericos (emerald=ativo, amber=aviso faz sentido semantico)
// Mas isolar em objeto de configuracao, nao espalhado inline no JSX
const STATUS_STYLES = {
  active:  { pill: '...emerald...', dot: '...' },
  warning: { pill: '...amber...',   dot: '...' },
} as const
```

`src/app/dashboard/tickets/page.tsx`
```tsx
// emerald hardcoded em 3 lugares para valor monetario
text-emerald-600 → text-primary
```

### Decisao 2: Remover TemplateMainShell das telas de settings

As telas de configuracao de WhatsApp e Meta Ads devem usar `PageShell` como todas as outras telas de settings.

**Regra definitiva de uso de shell:**

```
PageShell      → toda tela de configuracao/settings
CrudPageShell  → toda tela CRUD com toolbar, filtros e multiplas views
Caso especial  → inbox (3 paineis), kanban com drag externo, full-screen charts
```

**Arquivos a modificar:**
- `src/app/dashboard/settings/whatsapp/page.tsx` — trocar `TemplateMainShell` + `TemplateMainHeader` por `PageShell` + `PageHeader`
- `src/app/dashboard/settings/meta-ads/page.tsx` — idem
- Ajustar padding interno dos componentes filhos que dependiam do modelo full-width

### Decisao 3: Redesenho da pagina de Account

A pagina de account passa a ser `/dashboard/settings/perfil` (conforme PRD 24).

**Nova estrutura:**

```
PageShell maxWidth="3xl"
  PageHeader title="Minha conta" icon={User}

  [Secao: Dados pessoais]
  SettingsSection
    title="Perfil"
    description="Seu nome e informacoes de contato."
    Campo: Nome
    Campo: E-mail (somente leitura — alterado via suporte)
    Campo: Telefone
    Acao: [Salvar]

  [Secao: Seguranca]
  SettingsSection
    title="Seguranca"
    description="Altere sua senha de acesso."
    Campo: Senha atual
    Campo: Nova senha
    Campo: Confirmar nova senha
    Acao: [Alterar senha]

  [Secao: Aparencia]
  SettingsSection
    title="Aparencia"
    description="Preferencia de tema da interface."
    Controle: Light / Dark / Sistema
    (sem botao salvar — aplica instantaneamente)
```

**O que sai:**
- `AccountOrganizationCard` → vai para `/dashboard/settings/organizacao`
- `AccountBillingCard` → removido. Link para `/dashboard/settings/assinatura` disponivel no menu de settings
- `Security Card` inline → vira `SettingsSection` proprio

**Novo componente `SettingsSection`:**

```tsx
// src/components/dashboard/settings/settings-section.tsx
interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode  // botoes de salvar ficam aqui, nao dentro do form
}
```

Layout visual:
```
┌──────────────────────────────────────────────┐
│ Titulo da secao                              │
│ Descricao curta da secao                     │
│ ────────────────────────────────────────     │
│ [campos do formulario]                       │
│                                              │
│                               [Salvar]       │
└──────────────────────────────────────────────┘
```

Regras:
- Borda inferior entre header da secao e campos
- Botao de acao sempre no canto inferior direito da secao
- Sem `CardHeader` / `CardContent` misturados — estrutura propria
- Espacamento padrao: `space-y-4` entre campos, `pt-4` entre divisor e campos

### Decisao 4: Renomear "Billing" para "Assinatura"

**No sidebar:**

`src/components/dashboard/sidebar/sidebar-client.tsx`
```tsx
// Antes
{ label: 'Billing', href: '/dashboard/billing', icon: CreditCard }
// Depois
{ label: 'Assinatura', href: '/dashboard/settings/assinatura', icon: CreditCard }
```

Apos PRD 24 estar implementado, o item sai do sidebar completamente e vive em Settings > Assinatura.

**Em todos os textos da interface:**

| Antes | Depois |
|---|---|
| "Abrir billing" | "Ver assinatura" |
| "Ver planos e limites" | "Ver assinatura" |
| Breadcrumb "Billing" | "Assinatura" |
| Toast "Redirecionando para billing..." | "Redirecionando para assinatura..." |
| Titulo da pagina admin "Billing Plans" | "Planos e Cobranca" |

---

## Novo Componente: `SettingsSection`

Este componente se torna o padrao para toda secao de configuracao.

```tsx
// src/components/dashboard/settings/settings-section.tsx

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  onSave?: () => void
  isSaving?: boolean
  saveLabel?: string
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  onSave,
  isSaving,
  saveLabel = 'Salvar',
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="border-t border-border px-6 py-5 space-y-4">
        {children}
      </div>
      {onSave && (
        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
```

Uso nas telas de settings:
```tsx
<SettingsSection
  title="Perfil"
  description="Seu nome e informacoes de contato."
  onSave={handleSave}
  isSaving={isPending}
>
  <div className="grid gap-2">
    <Label>Nome</Label>
    <Input value={name} onChange={...} />
  </div>
  <div className="grid gap-2">
    <Label>Telefone</Label>
    <Input value={phone} onChange={...} />
  </div>
</SettingsSection>
```

---

## Padrao de Tela de Settings

Toda tela dentro de `/dashboard/settings/` deve seguir:

```tsx
<PageShell maxWidth="3xl">
  <PageHeader
    title="[Nome da secao]"
    description="[Descricao de uma linha]"
    icon={[IconeLucide]}
  />
  <PageContent>
    <div className="space-y-6">
      <SettingsSection title="..." description="..." onSave={...}>
        {/* campos */}
      </SettingsSection>
      <SettingsSection title="..." description="...">
        {/* campos somente leitura ou acoes perigosas */}
      </SettingsSection>
    </div>
  </PageContent>
</PageShell>
```

Excecoes que podem usar `maxWidth="5xl"` ou sem maxWidth:
- Tela de Equipe (tabela larga de membros)
- Tela de Auditoria (tabela com muitas colunas)
- Hub de Integracoes (layout de duas colunas)

---

## Padrao de CRUD

Para referencia — o padrao correto que ja existe e deve continuar:

```tsx
// Telas de CRUD (leads, sales, items, categories, tickets)
// Usam CrudPageShell — NAO usar PageShell nessas telas
<CrudPageShell
  title="Leads"
  icon={Users}
  view={view}
  setView={setView}
  enabledViews={['list', 'cards']}
  searchInput={<SearchInput />}
  filters={<FiltersBar />}
>
  <CrudDataView
    data={items}
    view={view}
    emptyView={<CrudEmptyState />}
    tableView={<CrudListView />}
    cardView={<CrudCardView />}
  />
</CrudPageShell>
```

**Projects** deve migrar de `PageShell` para `CrudPageShell` para ficar consistente com os demais CRUDs.

---

## Arquivos a Modificar

### Correcao imediata de tokens (sem mudanca visual significativa)

- `src/components/dashboard/layout/page-shell.tsx` — bg-gray-50 → bg-muted/30
- `src/components/dashboard/layout/page-header.tsx` — 4 substituicoes de cor
- `src/app/dashboard/tickets/page.tsx` — 3 x emerald-600 → text-primary
- `src/components/dashboard/billing/billing-status.tsx` — extrair STATUS_STYLES

### Remocao

- `src/components/dashboard/layout/page-toolbar.tsx` — nao e usado em nenhuma pagina

### Novos

- `src/components/dashboard/settings/settings-section.tsx` — padrao de secao

### Modificacao de settings existentes

- `src/app/dashboard/settings/whatsapp/page.tsx` — TemplateMainShell → PageShell
- `src/app/dashboard/settings/meta-ads/page.tsx` — TemplateMainShell → PageShell

### Account

- `src/components/dashboard/account/my-account-content.tsx` — reescrever com SettingsSection
- `src/components/dashboard/account/account-billing-card.tsx` — remover
- `src/app/dashboard/account/page.tsx` — migrar para PageShell

### Sidebar e nomenclatura

- `src/components/dashboard/sidebar/sidebar-client.tsx` — "Billing" → "Assinatura"
- Busca global por "billing" em textos de UI e substituir por "assinatura"
- `src/components/dashboard/billing/billing-cancel-dialog.tsx` — revisar textos

---

## Ordem de Execucao Recomendada

### Fase 1: Tokens (sem risco, ganho imediato)

1. Corrigir `page-shell.tsx` — 1 linha
2. Corrigir `page-header.tsx` — 4 substituicoes
3. Corrigir `tickets/page.tsx` — 3 substituicoes
4. Extrair `STATUS_STYLES` em `billing-status.tsx`
5. Remover `page-toolbar.tsx`

### Fase 2: Componente SettingsSection

1. Criar `settings-section.tsx`
2. Testar isolado na tela de Pipeline (menor e mais simples)
3. Migrar Pipeline para o novo padrao

### Fase 3: Account redesenhada

1. Reescrever `my-account-content.tsx` com `SettingsSection`
2. Extrair SecuritySection como componente proprio
3. Mover `AccountOrganizationCard` para `/dashboard/settings/organizacao`
4. Remover `AccountBillingCard`
5. Aplicar `PageShell maxWidth="3xl"` na pagina

### Fase 4: Config pages em PageShell

1. Migrar WhatsApp settings para `PageShell` + `PageHeader`
2. Migrar Meta Ads settings para `PageShell` + `PageHeader`
3. Ajustar padding dos componentes internos que dependiam de full-width

### Fase 5: Nomenclatura

1. Renomear "Billing" → "Assinatura" no sidebar
2. Busca global por textos "billing" em UI e substituir
3. Corrigir breadcrumbs

---

## Criterios de Aceite

- nenhuma cor hardcoded em `page-shell.tsx` e `page-header.tsx`
- `page-toolbar.tsx` removido
- toda tela de settings usa `PageShell` + `PageHeader` + `SettingsSection`
- pagina de account usa `PageShell maxWidth="3xl"` e `SettingsSection`
- `AccountBillingCard` removido
- dados fiscais saem da pagina de account
- "Billing" renomeado para "Assinatura" em todos os textos de UI do usuario
- WhatsApp settings e Meta Ads settings visuamente coerentes com Pipeline e AI Studio
- Projects CRUD migrado para `CrudPageShell`

---

## Riscos e Trade-offs

- Mudar `bg-gray-50` para `bg-muted/30` no shell pode alterar levemente o contraste de fundo — validar em dark mode
- `PageHeader` com `bg-primary/10 text-primary` em vez de emerald: se o tema usar cor primaria diferente de verde, o icone muda de cor — isso e o comportamento correto, nao um bug
- Migrar WhatsApp e Meta Ads de `TemplateMainShell` para `PageShell` pode quebrar layouts internos que assumiam full-width — revisar componentes filhos
- Remover `AccountBillingCard` exige que o usuario saiba onde encontrar a assinatura — mitigar com link explicito nos settings e com o redesenho de navegacao do PRD 24
