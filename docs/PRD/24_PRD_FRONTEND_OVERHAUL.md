# PRD 26 — Frontend Overhaul: Navegacao, Design System e Padronizacao

## Status

Proposto. Substitui e consolida PRD 25 e PRD 26.

Este documento e a fonte de verdade para a reorganizacao completa do frontend do dashboard.

RBAC detalhado e modelagem de acesso:

- [27_PRD_RBAC_FRONTEND.md](/Users/thiago/www/whatrack/docs/PRD/27_PRD_RBAC_FRONTEND.md)
- [ARCHITECTURE_ACCESS_MODEL.md](/Users/thiago/www/whatrack/docs/ARCHITECTURE_ACCESS_MODEL.md)

## Problema Central

O dashboard foi construido em sprints separados sem uma convencao compartilhada. O resultado e que paginas do mesmo produto:

- usam shells de layout diferentes sem criterio
- tem cores hardcoded em componentes base que afetam toda a aplicacao
- exibem o mesmo dado (billing, account) em mais de um lugar
- usam terminologia mista (ingles e portugues)
- tem cabecalhos com estilos incompativeis
- botoes de acao aparecem em lugares diferentes a cada tela
- a tela de account mistura perfil pessoal, dados fiscais, billing e equipe
- **o redesenho de navegacao nao considerava RBAC** — menus sem controle de acesso adequado

O usuario sente que esta navegando em varios sistemas colados.

---

## Parte 0: RBAC e Controle de Acesso

Esta secao define quem ve o que no sidebar e nas telas de settings. Nao considerar RBAC no redesenho de navegacao cria brechas e UX inconsistente.

### 0.1 O sistema de RBAC atual

Importante:

- `Platform` usa papel global do SaaS
- `Workspace` usa papel e permissoes da organizacao
- `Project` define escopo de dados

Este PRD usa esse modelo, mas a matriz detalhada e a regra final de execucao ficam no PRD 27.

O produto ja tem RBAC implementado com tres camadas, mas a nomenclatura atual do codigo ainda mistura:

- papel global do SaaS
- papel do membro no workspace
- escopo por projeto

Por isso, a tabela abaixo deve ser lida apenas como **snapshot do estado atual do codigo**,
e nao como a regra final de produto.

**Snapshot atual de papeis no codigo:**

| Papel no codigo | Leitura correta |
|---|---|
| `session.user.role = owner` | owner global do SaaS |
| `session.user.role = admin` | admin global do SaaS |
| `session.user.role = user` | usuario global do SaaS |
| `member.role = owner` | owner do workspace |
| `member.role = admin` | admin do workspace |
| `member.role = user` | colaborador do workspace |

**24 permissoes da plataforma:**

```
view:dashboard     manage:leads
view:analytics     manage:tickets
view:whatsapp      manage:sales
view:ai            manage:items
view:campaigns     manage:meta
view:integrations  manage:whatsapp
view:audit         manage:ai
view:leads         manage:campaigns
view:tickets       manage:integrations
view:sales         manage:members
view:items         manage:organization
view:meta          manage:settings
```

**Hook de verificacao no cliente:**

```tsx
const { isOwner, isAdmin, can, canAny } = useAuthorization()

// Exemplos
isOwner                         // owner do workspace
isAdmin                         // admin+ do workspace
can('manage:members')           // verifica permissao especifica
canAny(['view:leads', 'manage:leads'])  // qualquer uma das permissoes
```

### 0.2 Situacao atual: gaps criticos

O sidebar hoje so protege **3 itens** por papel:

| Item | Visibilidade atual |
|---|---|
| Webhook Meta | Owner only |
| Design System | Admin+ |
| Planos Billing | Admin+ |

**Tudo o mais e exibido para qualquer usuario autenticado.**

Paginas de settings com guard de servidor:

| Pagina | Guard atual |
|---|---|
| `/dashboard/settings/billing` (admin plans) | `isAdmin` → redirect |
| `/dashboard/settings/pipeline` | `isAdmin` → redirect |
| `/dashboard/design-system` | `isOwner` → redirect |

**Paginas sem guard (qualquer usuario acessa):**
- Auditoria, AI Studio, WhatsApp settings, Meta Ads settings, Team settings, Org settings

### 0.3 Regra de acesso por item do sidebar (novo modelo)

**Sidebar principal — todos os usuarios autenticados:**

```
Dashboard            → view:dashboard
Analytics            → view:analytics
Meta Ads             → view:meta
Mensagens            → view:whatsapp
Projetos             → view:leads  (qualquer acesso operacional)
Leads                → view:leads
Tickets              → view:tickets
Vendas               → view:sales
IA Copilot
  aba Aprovacoes     → view:ai
  aba Uso e Custo    → admin+      (custo e dado sensivelmente financeiro)
```

Regra: se o usuario nao tem a permissao de `view:*`, o item **nao aparece** no sidebar.
Para o perfil atual do produto (todos os colaboradores precisam de acesso basico), a maioria dos itens aparece para todos — mas o criterio e a permissao, nao "estar logado".

**Settings — nav lateral:**

| Item | Papel minimo | Permissao |
|---|---|---|
| Perfil | Qualquer | — (proprio perfil) |
| Seguranca | Qualquer | — (propria senha) |
| Organizacao | Admin+ | `manage:organization` |
| Equipe | Admin+ | `manage:members` |
| Integracoes | Admin+ | `manage:integrations` |
| Pipeline | Admin+ | `manage:settings` |
| IA Studio | Admin+ | `manage:ai` |
| Catalogo | Admin+ | `manage:items` |
| Assinatura | Owner | `manage:organization` |
| Auditoria | Admin+ | `view:audit` |

**Sistema (super admin — global owner/admin):**

| Item | Papel |
|---|---|
| Planos e Cobranca | Global admin+ |
| Design System | Global owner |
| Webhook Meta | Global owner |

### 0.4 Comportamento na interface

**Sidebar principal:**
- Items sem permissao: **nao aparecem** (nao exibir item desabilitado)
- Razao: o sidebar deve ser limpo; items inacessiveis criam ruido

**Settings — nav lateral:**
- Secoes sem permissao: **nao aparecem** na nav lateral
- Usuario com papel `user` ve apenas: Perfil, Seguranca
- Usuario com papel `admin` ve: Perfil, Seguranca + toda a secao Workspace
- Usuario com papel `owner` ve: tudo

**Acesso direto por URL (deep link):**
- Mesmo sem o item na nav, o servidor faz o guard
- Redirecionar para `/dashboard` com feedback server-first conforme o PRD 27

### 0.5 Implementacao: onde colocar cada guard

**Sidebar:** verificar com `useAuthorization()` no `sidebar-client.tsx`

```tsx
// Exemplo: item de settings que requer workspace RBAC
const { isOwner, can } = useAuthorization()

// Settings nav lateral — mostrar apenas o que o usuario pode acessar
const settingsWorkspaceItems = [
  { label: 'Organizacao', href: '...', show: can('manage:organization') },
  { label: 'Equipe', href: '...', show: can('manage:members') },
  { label: 'Integracoes', href: '...', show: can('manage:integrations') },
  { label: 'Pipeline', href: '...', show: can('manage:settings') },
  { label: 'IA Studio', href: '...', show: can('manage:ai') },
  { label: 'Catalogo', href: '...', show: can('manage:items') },
  { label: 'Assinatura', href: '...', show: isOwner },
  { label: 'Auditoria', href: '...', show: can('view:audit') },
].filter(item => item.show)
```

**Pages (server-side guard):** cada page.tsx de settings restrita deve usar guard de `Workspace`, nunca `session.user.role`, exceto na secao `Sistema`.

```tsx
// Padrao para pages de workspace com permissao especifica
const access = await validatePermissionAccess('manage:members')
if (!access.hasAccess) {
  redirect('/dashboard')
}
```

Para paginas que exigem owner do workspace:

```tsx
const access = await validateOwnerAccess()
if (!access.hasAccess) redirect('/dashboard')
```

### 0.6 O que o usuario ve por papel

**Usuario com papel `user`:**

```
Sidebar:
  VISAO GERAL
    Dashboard
    Analytics           (se view:analytics)
  CAPTACAO
    Meta Ads            (se view:meta)
    Mensagens           (se view:whatsapp)
  CRM
    Projetos
    Leads               (se view:leads)
    Tickets             (se view:tickets)
    Vendas              (se view:sales)
  INTELIGENCIA
    IA Copilot          (aba Aprovacoes apenas)

Settings (footer):
  CONTA PESSOAL
    Perfil
    Seguranca
  (sem secao WORKSPACE)
```

**Usuario com papel `admin`:**

```
Sidebar: igual ao user + Uso e Custo no IA Copilot

Settings:
  CONTA PESSOAL
    Perfil
    Seguranca
  WORKSPACE
    Organizacao
    Equipe
    Integracoes
    Pipeline
    IA Studio
    Catalogo
    Auditoria
  (sem Assinatura)
```

**Usuario com papel `owner`:**

```
Sidebar: igual ao admin

Settings:
  CONTA PESSOAL
    Perfil
    Seguranca
  WORKSPACE
    Organizacao
    Equipe
    Integracoes
    Pipeline
    IA Studio
    Catalogo
    Assinatura         ← so o owner ve
    Auditoria
```

**Super admin (global owner/admin do sistema):**

```
Mesma visao do owner da organizacao +
  secao SISTEMA no sidebar (Design System, Webhook Meta, Planos e Cobranca)
```

### 0.7 Criterios de aceite de RBAC

- [ ] Usuario com papel `user` nao ve Assinatura em nenhum lugar da UI
- [ ] Usuario com papel `user` nao ve Organizacao, Equipe, Integracoes, Pipeline, IA Studio, Catalogo, Auditoria
- [ ] Usuario com papel `admin` ve Workspace mas nao ve Assinatura
- [ ] Usuario com papel `owner` ve Assinatura
- [ ] Acesso direto por URL a rota restrita redireciona para /dashboard com feedback server-first
- [ ] Super admin ve secao SISTEMA no sidebar
- [ ] IA Copilot: aba Uso e Custo visivel apenas para admin+
- [ ] Mudanca de papel de membro reflete na UI sem necessidade de logout (depende de invalidacao de cache do useAuthorization)

---

## Parte 1: Design System

### 1.1 Tokens de cor: correcoes nos componentes base

Os piores problemas estao em dois arquivos usados em quase toda tela. Corrigir eles melhora o produto inteiro sem tocar em mais nada.

**`src/components/dashboard/layout/page-shell.tsx`**

```tsx
// ANTES
<div className="flex h-full flex-col bg-gray-50 dark:bg-zinc-950">

// DEPOIS
<div className="flex h-full flex-col bg-muted/30">
```

**`src/components/dashboard/layout/page-header.tsx`**

```tsx
// ANTES: icone com cor hardcoded
<div className="... bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">

// ANTES: titulo com cor hardcoded
<h1 className="text-display text-gray-900 dark:text-white">

// ANTES: descricao com cor hardcoded
<p className="text-caption mt-1 text-gray-500 dark:text-gray-400">

// DEPOIS: tudo via token
<div className="... bg-primary/10 text-primary">
<h1 className="text-display text-foreground">
<p className="text-caption mt-1 text-muted-foreground">
```

**`src/app/dashboard/tickets/page.tsx`**

```tsx
// ANTES: valor monetario com cor hardcoded (3 ocorrencias)
<span className="font-semibold text-emerald-600">

// DEPOIS
<span className="font-semibold text-primary">
```

**`src/components/dashboard/billing/billing-status.tsx`**

```tsx
// ANTES: cores de status espalhadas inline no JSX
pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
pill: 'bg-amber-500/10 text-amber-700 border-amber-500/25'

// DEPOIS: extrair para constante nomeada no topo do arquivo
// As cores semanticas (verde=ativo, ambar=aviso) sao aceitaveis,
// mas nao podem ficar inline espalhadas pelo componente
const STATUS_STYLES = {
  active:   { pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
  warning:  { pill: 'bg-amber-500/10   text-amber-700   dark:text-amber-400   border-amber-500/25',   dot: 'bg-amber-500'   },
  danger:   { pill: 'bg-destructive/10 text-destructive border-destructive/25',                        dot: 'bg-destructive' },
  neutral:  { pill: 'bg-muted/30 text-muted-foreground border-border',                                 dot: 'bg-muted-foreground' },
} as const
```

**`src/components/dashboard/layout/page-toolbar.tsx`**

```tsx
// Arquivo nao e usado em nenhuma pagina. Remover.
```

### 1.2 Os tres shells: regra definitiva

Existem tres wrappers de pagina no codebase. Cada um tem um papel especifico.

| Shell | Quando usar | Exemplo |
|---|---|---|
| `PageShell` | Toda tela de settings/configuracao | Pipeline, AI Studio, Assinatura, Perfil |
| `CrudPageShell` | Toda tela CRUD com toolbar, filtros e views | Leads, Tickets, Vendas, Itens, Projetos |
| Caso especial | Inbox (3 paineis), kanban full-screen | WhatsApp Inbox |

**`TemplateMainShell` nao deve ser usado fora do CRM operacional.**

Hoje WhatsApp settings e Meta Ads settings usam `TemplateMainShell` — isso faz essas telas parecerem de outro produto. Devem ser migradas para `PageShell`.

**Projects** usa `PageShell` sendo CRUD — deve migrar para `CrudPageShell`.

### 1.3 Novo componente: `SettingsSection`

Toda secao dentro de uma tela de settings usa este componente. Substitui o uso direto de `Card` + `CardHeader` + `CardContent` com botao em lugar aleatorio.

```tsx
// src/components/dashboard/settings/settings-section.tsx

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  onSave?: () => void
  isSaving?: boolean
  saveLabel?: string
  danger?: boolean  // para secoes de acao destrutiva (cancelar conta, deletar)
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  onSave,
  isSaving,
  saveLabel = 'Salvar',
  danger = false,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card',
      danger ? 'border-destructive/30' : 'border-border',
      className
    )}>
      {/* Header da secao */}
      <div className="px-6 py-5">
        <h2 className={cn(
          'text-base font-semibold',
          danger ? 'text-destructive' : 'text-foreground'
        )}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Conteudo */}
      <div className="border-t border-border px-6 py-5 space-y-4">
        {children}
      </div>

      {/* Rodape com acao (opcional) */}
      {onSave && (
        <div className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end rounded-b-xl">
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant={danger ? 'destructive' : 'default'}
          >
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 1.4 Anatomia padrao por tipo de tela

#### Tela de Settings (configuracao)

```
PageShell maxWidth="3xl"
  PageHeader
    title="Nome da Secao"
    description="Uma linha descrevendo o que se faz aqui."
    icon={IconeLucide}
    actions={<Button>Acao Principal</Button>}  ← so se necessario

  PageContent
    div.space-y-6
      SettingsSection title="Grupo A" description="..." onSave={fn}
        [campos do formulario]
      SettingsSection title="Grupo B" description="..."
        [conteudo somente leitura ou informativo]
      SettingsSection title="Zona de Perigo" danger onSave={fn} saveLabel="Cancelar conta"
        [acao destructiva com aviso]
```

Excecoes que usam `maxWidth="5xl"` (conteudo largo):
- Tela de Equipe (tabela de membros)
- Hub de Integracoes (layout de 2 colunas)
- Auditoria (tabela com muitas colunas)

#### Tela CRUD

```
CrudPageShell
  title="Nome do Recurso"
  icon={IconeLucide}
  view={view} setView={setView}
  enabledViews={['list', 'cards']}  ← ou incluir 'kanban'
  searchInput={<SearchInput />}
  filters={<FiltersBar />}
  actions={<Button>Criar novo</Button>}

  CrudDataView
    emptyView={<CrudEmptyState icon={...} title="..." description="..." />}
    tableView={<CrudListView columns={...} />}
    cardView={<CrudCardView />}
```

#### Tela com Abas Internas

Para paginas que unificam subdominios (Meta Ads, IA Copilot):

```
PageShell maxWidth="7xl"  ← ou sem maxWidth para conteudo largo
  PageHeader title="..." icon={...}

  PageContent
    Tabs defaultValue="aba-principal"
      TabsList
        TabsTrigger value="aba-1">Aba 1</TabsTrigger>
        TabsTrigger value="aba-2">Aba 2</TabsTrigger>
      TabsContent value="aba-1"
        [conteudo da aba]
      TabsContent value="aba-2"
        [conteudo da aba]
```

---

## Parte 2: Navegacao

### 2.1 Sidebar: estrutura final

```
Logo WhaTrack
─────────────────────────────────
VISAO GERAL
  ○ Dashboard               /dashboard
  ○ Analytics               /dashboard/analytics
─────────────────────────────────
CAPTACAO
  ○ Meta Ads                /dashboard/meta-ads
  ○ Mensagens               /dashboard/whatsapp/inbox
─────────────────────────────────
CRM
  ○ Projetos                /dashboard/projects
  ○ Leads                   /dashboard/leads
  ○ Tickets                 /dashboard/tickets
  ○ Vendas                  /dashboard/sales
─────────────────────────────────
INTELIGENCIA
  ○ IA Copilot              /dashboard/ia
─────────────────────────────────
[footer]
[Avatar] Nome do usuario
         ↓ Configuracoes → /dashboard/settings
         ─────────────────
         Sair
```

**9 itens operacionais. 4 secoes com logica clara.**

A logica das secoes reflete o fluxo do produto:
- **Visao Geral** → como o negocio esta indo
- **Captacao** → de onde vem o cliente (anuncio → conversa)
- **CRM** → o que acontece com o cliente depois
- **Inteligencia** → o que a IA esta fazendo

**Visibilidade por papel** (detalhado na Parte 0):
- Todos os itens do sidebar operacional sao visiveis para `user`, `admin` e `owner`
- Items sao filtrados pela permissao de `view:*` do usuario
- Secao SISTEMA (Design System, Planos, Webhook) aparece apenas para super admins globais

**O que sai do sidebar:**
- Secao "Conta" (1 item so) → eliminada
- Secao "Configuracoes" no sidebar → eliminada
- "Itens" e "Categorias" → agrupados em Settings > Catalogo
- `/dashboard/ai/usage` → aba dentro de IA Copilot (admin+ only)

### 2.2 Meta Ads: entrada unica com abas

`/dashboard/meta-ads` deixa de ter subrota no sidebar. Passa a ter abas internas:

```
Meta Ads
  TabsList
    [ROI e Atribuicao]    ← conteudo atual de /dashboard/meta-ads
    [Campanhas]           ← conteudo atual de /dashboard/meta-ads/campaigns
    [Auditoria de Conta]  ← conteudo atual de PRD 10 (audit drawer)
```

### 2.3 IA Copilot: entrada unica com abas

`/dashboard/ia` (renomear de `/dashboard/approvals`) com abas:

```
IA Copilot
  TabsList
    [Aprovacoes]          ← conteudo atual de /dashboard/approvals
    [Uso e Custo]         ← conteudo atual de /dashboard/ai/usage
```

### 2.4 Settings: pagina dedicada

`/dashboard/settings` com navegacao lateral (modelo Stripe/Linear).

```
/dashboard/settings
┌──────────────────────┬────────────────────────────────────────┐
│ CONTA PESSOAL        │                                        │
│   Perfil             │   [Conteudo da aba ativa]              │
│   Seguranca          │                                        │
│                      │   PageShell maxWidth="3xl"             │
│ WORKSPACE            │   PageHeader                           │
│   Organizacao        │   PageContent                          │
│   Equipe             │     SettingsSection(s)                 │
│   Integracoes   ●    │                                        │
│   Pipeline           │                                        │
│   IA Studio          │                                        │
│   Catalogo           │                                        │
│   Assinatura         │                                        │
│   Auditoria          │                                        │
└──────────────────────┴────────────────────────────────────────┘
```

O `layout.tsx` de settings renderiza a nav lateral fixa e o slot de conteudo ao lado.

### 2.5 Hub de Integracoes

`/dashboard/settings/integracoes` centraliza todas as conexoes externas.

```
Integracoes
  TabsList
    [WhatsApp]         ← instancias, status, QR onboarding, templates
    [Meta Ads]         ← contas Facebook, ad accounts, pixels, OAuth
    [Google Ads]       ← (futuro) placeholder "Em breve"
```

Adicionar nova integracao no futuro = nova aba. Sem criar nova rota de settings.

### 2.6 Mapa completo de rotas

#### Sidebar (operacional)

| Rota | Label no sidebar | Icone |
|---|---|---|
| `/dashboard` | Dashboard | LayoutDashboard |
| `/dashboard/analytics` | Analytics | BarChart2 |
| `/dashboard/meta-ads` | Meta Ads | TrendingUp |
| `/dashboard/whatsapp/inbox` | Mensagens | MessageSquare |
| `/dashboard/projects` | Projetos | FolderKanban |
| `/dashboard/leads` | Leads | Users |
| `/dashboard/tickets` | Tickets | Ticket |
| `/dashboard/sales` | Vendas | ShoppingCart |
| `/dashboard/ia` | IA Copilot | Sparkles |

#### Settings (configuracao)

| Rota | Label | Contexto |
|---|---|---|
| `/dashboard/settings` | → redireciona para /perfil | — |
| `/dashboard/settings/perfil` | Perfil | Pessoal |
| `/dashboard/settings/seguranca` | Seguranca | Pessoal |
| `/dashboard/settings/organizacao` | Organizacao | Workspace |
| `/dashboard/settings/equipe` | Equipe | Workspace |
| `/dashboard/settings/integracoes` | Integracoes | Workspace |
| `/dashboard/settings/pipeline` | Pipeline | Workspace |
| `/dashboard/settings/ia-studio` | IA Studio | Workspace |
| `/dashboard/settings/catalogo` | Catalogo | Workspace |
| `/dashboard/settings/assinatura` | Assinatura | Workspace |
| `/dashboard/settings/auditoria` | Auditoria | Workspace |

#### Redirects permanentes (308)

| De | Para |
|---|---|
| `/dashboard/billing` | `/dashboard/settings/assinatura` |
| `/dashboard/account` | `/dashboard/settings/perfil` |
| `/dashboard/equipe` | `/dashboard/settings/equipe` |
| `/dashboard/approvals` | `/dashboard/ia` |
| `/dashboard/ai/usage` | `/dashboard/ia?tab=uso` |
| `/dashboard/items` | `/dashboard/settings/catalogo` |
| `/dashboard/item-categories` | `/dashboard/settings/catalogo?tab=categorias` |
| `/dashboard/settings/whatsapp` | `/dashboard/settings/integracoes` |
| `/dashboard/settings/meta-ads` | `/dashboard/settings/integracoes?tab=meta-ads` |
| `/dashboard/meta-ads/campaigns` | `/dashboard/meta-ads?tab=campanhas` |
| `/dashboard/settings/ai` | `/dashboard/settings/ia-studio` |
| `/dashboard/settings/audit-logs` | `/dashboard/settings/auditoria` |

---

## Parte 3: Telas Redesenhadas

### 3.1 Perfil (antiga Account page)

**Rota:** `/dashboard/settings/perfil`

```
PageShell maxWidth="3xl"
  PageHeader
    title="Minha conta"
    description="Seus dados pessoais e preferencias."
    icon={User}

  PageContent
    div.space-y-6

      SettingsSection
        title="Perfil"
        description="Nome e informacoes de contato."
        onSave={handleSavePerfil}

        div.grid.gap-4
          div.grid.gap-2
            Label "Nome"
            Input name
          div.grid.gap-2
            Label "E-mail"
            Input email disabled   ← somente leitura
            p.text-xs.text-muted-foreground "Para alterar o e-mail, entre em contato com o suporte."
          div.grid.gap-2
            Label "Telefone"
            Input phone mask=(xx) xxxxx-xxxx

      SettingsSection
        title="Aparencia"
        description="Preferencia de tema da interface."
        (sem onSave — aplica instantaneamente)

        ThemeSelector inline  ← Light / Dark / Sistema

      SettingsSection
        title="Seguranca"
        description="Altere sua senha de acesso."
        onSave={handleSaveSenha}

        div.grid.gap-4
          div.grid.gap-2
            Label "Senha atual"
            Input type=password
          div.grid.gap-2
            Label "Nova senha"
            Input type=password
          div.grid.gap-2
            Label "Confirmar nova senha"
            Input type=password
```

**O que sai desta tela:**
- Dados fiscais → Settings > Organizacao
- Card de billing → removido (link em Settings > Assinatura)
- Gestao de equipe → Settings > Equipe

### 3.2 Organizacao

**Rota:** `/dashboard/settings/organizacao`

```
PageShell maxWidth="3xl"
  PageHeader
    title="Organizacao"
    description="Dados da agencia e informacoes fiscais."
    icon={Building2}

  PageContent
    div.space-y-6

      SettingsSection
        title="Dados da agencia"
        description="Nome exibido no produto."
        onSave={handleSaveOrg}

        div.grid.gap-2
          Label "Nome da agencia"
          Input orgName

      SettingsSection
        title="Dados fiscais"
        description="CPF ou CNPJ para emissao de nota fiscal."

        [display de campos fiscais: tipo, documento, razao social, municipio]

        Botao "Editar dados fiscais" → abre OnboardingDialog (modo edicao)
```

### 3.3 Equipe

**Rota:** `/dashboard/settings/equipe`

Migra conteudo atual de `/dashboard/equipe` (team-access-content.tsx).

```
PageShell maxWidth="5xl"
  PageHeader
    title="Equipe"
    description="Membros, papeis e permissoes da organizacao."
    icon={Users}
    actions={<Button>Convidar membro</Button>}

  PageContent
    Tabs defaultValue="membros"
      TabsList
        [Membros]
        [Papeis]
        [Permissoes]
      TabsContent: conteudo atual de TeamAccessContent por aba
```

### 3.4 Integracoes (hub)

**Rota:** `/dashboard/settings/integracoes`

```
PageShell maxWidth="5xl"
  PageHeader
    title="Integracoes"
    description="Conexoes com plataformas externas."
    icon={Plug}

  PageContent
    Tabs defaultValue="whatsapp"
      TabsList
        [WhatsApp]
        [Meta Ads]
        [Google Ads]  ← badge "Em breve", tab desabilitada
      TabsContent value="whatsapp"
        [conteudo atual de settings/whatsapp — instancias, QR, templates]
      TabsContent value="meta-ads"
        [conteudo atual de settings/meta-ads — contas, pixels, OAuth]
      TabsContent value="google-ads"
        EmptyState icon={TrendingUp} title="Google Ads em breve" description="..."
```

### 3.5 Catalogo

**Rota:** `/dashboard/settings/catalogo`

```
PageShell maxWidth="5xl"
  PageHeader
    title="Catalogo"
    description="Produtos, servicos e categorias."
    icon={Package}

  PageContent
    Tabs defaultValue="itens"
      TabsList
        [Itens]
        [Categorias]
      TabsContent value="itens"
        [conteudo atual de /dashboard/items]
      TabsContent value="categorias"
        [conteudo atual de /dashboard/item-categories]
```

### 3.6 Assinatura (antiga billing page)

**Rota:** `/dashboard/settings/assinatura`

```
PageShell maxWidth="3xl"
  PageHeader
    title="Assinatura"
    description="Plano, uso por cliente e cobranca."
    icon={CreditCard}

  PageContent
    div.space-y-6

    [ESTADO: trial ativo]
      SettingsSection title="Trial gratuito"
        Banner de countdown: "X dias restantes"
        Descricao do que esta incluido no trial
        Button "Assinar por R$ 497 / mes" → checkout

      SettingsSection title="Plano WhaTrack"
        Lista de features incluidas no plano base

    [ESTADO: assinante ativo]
      SettingsSection title="Plano atual"
        Plano: WhaTrack
        Status: badge [Ativo]
        Proximo vencimento: data
        Total estimado este ciclo: R$ xxx

        Resumo de cobranca:
          Plano base          R$ 497
          X clientes extras   R$ xxx
          X WhatsApps extras  R$ xxx
          ──────────────────────────
          Total               R$ xxx

        Button outline "Gerenciar no Stripe"

      SettingsSection title="Uso por cliente"
        Para cada Project ativo:
          Nome do projeto
          Barra: conversoes usadas / 300
          Barra: creditos de IA usados / 10.000

      SettingsSection title="Cancelar assinatura" danger
        p "Ao cancelar, o acesso permanece ativo ate o fim do ciclo atual."
        Button destructive "Cancelar assinatura" → BillingCancelDialog
```

---

## Parte 4: Nomenclatura

### "Billing" → "Assinatura" em toda a interface

Busca e substituicao nos textos voltados ao usuario:

| Local | Antes | Depois |
|---|---|---|
| Sidebar | "Billing" | "Assinatura" |
| Breadcrumb | "Billing" | "Assinatura" |
| AccountBillingCard botoes | "Abrir billing" / "Ver planos e limites" | "Ver assinatura" |
| Toasts de redirect | "Redirecionando para billing..." | "Redirecionando para assinatura..." |
| Admin plans page | "Billing Plans" | "Planos e Cobranca" |
| BillingCancelDialog titulo | qualquer referencia a "billing" | "assinatura" |

**Nao alterar:**
- Nomes de arquivos e componentes internos (billing-status.tsx, useBillingSubscription) — sao nomes de codigo, nao UI
- Nomes de variaveis, slugs de API, campos do banco de dados

---

## Parte 5: Arquivos Afetados

### Fase 1: Tokens (correcao imediata, sem impacto visual significativo)

```
src/components/dashboard/layout/page-shell.tsx
src/components/dashboard/layout/page-header.tsx
src/components/dashboard/layout/page-toolbar.tsx  ← REMOVER
src/app/dashboard/tickets/page.tsx
src/components/dashboard/billing/billing-status.tsx
```

### Fase 2: Componentes novos

```
src/components/dashboard/settings/settings-section.tsx  ← CRIAR
src/app/dashboard/settings/layout.tsx                   ← CRIAR
```

### Fase 3: Sidebar e navegacao

```
src/components/dashboard/sidebar/sidebar-client.tsx
src/components/dashboard/sidebar/user-dropdown-menu.tsx
src/components/dashboard/layout/header.tsx              ← atualizar ROUTE_LABELS
src/proxy.ts                                            ← adicionar redirects
```

### Fase 4: Rotas novas de settings

```
src/app/dashboard/settings/perfil/page.tsx              ← CRIAR
src/app/dashboard/settings/seguranca/page.tsx           ← CRIAR (ou integrar em perfil)
src/app/dashboard/settings/organizacao/page.tsx         ← CRIAR
src/app/dashboard/settings/equipe/page.tsx              ← CRIAR (migra team-access)
src/app/dashboard/settings/integracoes/page.tsx         ← CRIAR (hub novo)
src/app/dashboard/settings/pipeline/page.tsx            ← MOVER de settings/pipeline
src/app/dashboard/settings/ia-studio/page.tsx           ← MOVER de settings/ai
src/app/dashboard/settings/catalogo/page.tsx            ← CRIAR (unifica items + categories)
src/app/dashboard/settings/assinatura/page.tsx          ← CRIAR (migra billing)
src/app/dashboard/settings/auditoria/page.tsx           ← MOVER de settings/audit-logs
```

### Fase 5: Componentes de integracao (hub)

```
src/components/dashboard/integracoes/integracoes-hub.tsx         ← CRIAR
src/components/dashboard/integracoes/whatsapp-integration-tab.tsx ← CRIAR (migra settings/whatsapp components)
src/components/dashboard/integracoes/meta-ads-integration-tab.tsx ← CRIAR (migra settings/meta-ads components)
```

### Fase 6: Account page redesenhada

```
src/app/dashboard/account/page.tsx                              ← REESCREVER
src/components/dashboard/account/my-account-content.tsx         ← REESCREVER
src/components/dashboard/account/account-billing-card.tsx       ← REMOVER
src/components/dashboard/account/account-organization-card.tsx  ← MOVER para settings/organizacao
```

### Fase 7: Telas com abas

```
src/app/dashboard/meta-ads/page.tsx                   ← adicionar abas (ROI, Campanhas, Auditoria)
src/app/dashboard/ia/page.tsx                         ← CRIAR (substitui /approvals)
```

### Fase 8: Migracao de CRUDs

```
src/app/dashboard/projects/page.tsx                   ← migrar de PageShell para CrudPageShell
```

### Fase 9: Remocao de rotas depreciadas

```
src/app/dashboard/billing/                ← REMOVER (rota vira redirect)
src/app/dashboard/approvals/              ← REMOVER (rota vira redirect)
src/app/dashboard/ai/usage/              ← REMOVER (rota vira redirect)
src/app/dashboard/item-categories/       ← REMOVER (rota vira redirect)
src/app/dashboard/items/                 ← REMOVER (rota vira redirect)
src/app/dashboard/equipe/                ← REMOVER (rota vira redirect)
```

---

## Parte 6: Ordem de Execucao

### Fase 1 — Tokens de cor (30 min, impacto imediato)

Corrigir os 5 arquivos com cores hardcoded. Ganho imediato em toda a aplicacao sem risco.

1. `page-shell.tsx` — 1 linha
2. `page-header.tsx` — 4 substituicoes
3. `billing-status.tsx` — extrair STATUS_STYLES
4. `tickets/page.tsx` — 3 x emerald → primary
5. Remover `page-toolbar.tsx`

Validacao: `npm run build` sem erros, visual em dark mode.

### Fase 2 — Componente SettingsSection e layout de settings

Criar os blocos de construcao antes de migrar qualquer tela.

1. Criar `settings-section.tsx`
2. Criar `src/app/dashboard/settings/layout.tsx` com nav lateral
3. Testar com a tela de Pipeline (mais simples) migrando para `PageShell` + `SettingsSection`

Validacao: Pipeline funciona identico, visual coerente com outras telas de settings.

### Fase 3 — Account page redesenhada

Tela mais visivel para o usuario, maior ganho perceptual.

1. Criar `/dashboard/settings/perfil/page.tsx` com `SettingsSection` para perfil + seguranca + aparencia
2. Criar `/dashboard/settings/organizacao/page.tsx` com dados fiscais
3. Reescrever `/dashboard/account/page.tsx` para redirecionar para `/dashboard/settings/perfil`
4. Remover `AccountBillingCard`
5. Mover `AccountOrganizationCard` para organizacao

Validacao: perfil salva, senha muda, dados fiscais aparecem em organizacao.

### Fase 4 — Sidebar reestruturada

1. Atualizar `sidebar-client.tsx` com as 4 secoes e 9 itens
2. Renomear "Billing" → "Assinatura" no sidebar
3. Atualizar `user-dropdown-menu.tsx` (Configuracoes + Sair, sem Minha Conta separado)
4. Atualizar `ROUTE_LABELS` no header para breadcrumbs

Validacao: todos os links funcionam, breadcrumbs corretos.

### Fase 5 — Hub de Integracoes

1. Criar `integracoes-hub.tsx` com tabs
2. Criar `whatsapp-integration-tab.tsx` migrando componentes existentes de settings/whatsapp
3. Criar `meta-ads-integration-tab.tsx` migrando componentes existentes de settings/meta-ads
4. Criar `/dashboard/settings/integracoes/page.tsx`
5. Migrar `page.tsx` de whatsapp e meta-ads settings para redirects

Validacao: conectar WhatsApp e Meta Ads funciona via hub, sem regressao.

### Fase 6 — Settings restantes

Migrar cada tela de settings para o novo padrao `PageShell` + `SettingsSection`:

1. Equipe → `/dashboard/settings/equipe` (migra team-access-content)
2. AI Studio → `/dashboard/settings/ia-studio`
3. Auditoria → `/dashboard/settings/auditoria`
4. Assinatura → `/dashboard/settings/assinatura` (redesenho do billing)

### Fase 7 — Telas com abas internas

1. Meta Ads: adicionar Tabs (ROI, Campanhas, Auditoria)
2. IA Copilot: criar `/dashboard/ia` com Tabs (Aprovacoes, Uso e Custo)

### Fase 8 — Catalogo e Projetos

1. Criar `/dashboard/settings/catalogo` com abas (Itens, Categorias)
2. Migrar Projects de `PageShell` para `CrudPageShell`

### Fase 9 — Redirects e limpeza

1. Adicionar todos os redirects em `src/proxy.ts`
2. Remover pastas de rotas depreciadas
3. Busca global por "Billing" em textos de UI e substituir por "Assinatura"
4. Verificar breadcrumbs em todas as novas rotas

---

## Parte 7: Criterios de Aceite

### Design System

- [ ] Nenhuma cor hardcoded em `page-shell.tsx` e `page-header.tsx`
- [ ] `page-toolbar.tsx` removido do codebase
- [ ] `billing-status.tsx` com STATUS_STYLES extraido
- [ ] Tickets com `text-primary` no valor monetario
- [ ] `SettingsSection` criado e funcionando

### Navegacao

- [ ] Sidebar com 4 secoes e 9 itens operacionais
- [ ] Nenhum item duplicado no sidebar (Meta Ads aparece uma vez)
- [ ] Settings acessivel via avatar do usuario no footer
- [ ] `/dashboard/settings` com nav lateral funcional

### Telas

- [ ] `/dashboard/settings/perfil` com perfil, aparencia e seguranca em `SettingsSection`
- [ ] `/dashboard/settings/organizacao` com dados da agencia e fiscais
- [ ] `/dashboard/settings/equipe` com membros, papeis e permissoes
- [ ] `/dashboard/settings/integracoes` com abas WhatsApp e Meta Ads funcionais
- [ ] `/dashboard/settings/assinatura` com estado de trial e de assinante
- [ ] `/dashboard/meta-ads` com abas ROI e Campanhas
- [ ] `/dashboard/ia` com abas Aprovacoes e Uso e Custo
- [ ] `/dashboard/settings/catalogo` com abas Itens e Categorias

### Padroes

- [ ] Toda tela de settings usa `PageShell` + `PageHeader` + `SettingsSection`
- [ ] Todo CRUD usa `CrudPageShell`
- [ ] `TemplateMainShell` nao e usado em nenhuma tela de settings
- [ ] Projects usa `CrudPageShell`

### Nomenclatura

- [ ] "Billing" substituido por "Assinatura" em todos os textos de UI
- [ ] Sidebar diz "Assinatura" e linka para `/dashboard/settings/assinatura`

### RBAC (ver Parte 0 para criterios detalhados)

- [ ] Usuario `user`: sidebar sem Assinatura, sem secao Workspace em Settings
- [ ] Usuario `admin`: sidebar completo, Settings sem Assinatura
- [ ] Usuario `owner`: sidebar completo, Settings com Assinatura
- [ ] Acesso direto por URL a rota restrita → redirect para /dashboard com toast
- [ ] Aba "Uso e Custo" do IA Copilot visivel apenas para admin+
- [ ] Super admin ve secao SISTEMA no sidebar
- [ ] Guards de servidor adicionados em todas as novas rotas de settings restritas

### Tecnicos

- [ ] Todos os redirects funcionam (308 permanente)
- [ ] Nenhuma pasta de rota depreciada restante
- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem erros
- [ ] Dark mode sem regressao visual

---

## Fora de Escopo

- Redesign visual (cores de marca, tipografia, espacamentos, logo)
- Versao mobile nativa
- Novos features ou analytics
- Onboarding do novo usuario (PRD 20)
- Implementacao do modelo de billing novo (PRD 21)
- Copy de posicionamento (PRD 22)
- Implementacao de `Project` entity (PRD 19)

---

## Relacao com outros PRDs

| PRD | Relacao |
|---|---|
| PRD 19 (Projects) | Projetos ja aparecem no sidebar neste PRD — implementacao do entity em PRD 19 |
| PRD 20 (Onboarding) | `/dashboard/settings/perfil` e `/dashboard/settings/organizacao` serao usados no onboarding revisado |
| PRD 21 (Pricing) | `/dashboard/settings/assinatura` reflete o modelo de plano unico + add-ons |
| PRD 22 (Copy) | Nomenclatura e textos de UI devem seguir o posicionamento de agencia |
| PRD 23 (Pivot) | Este PRD e a Fase 5 (copy e posicionamento) do plano de execucao do PRD 23 |
| PRD 24 (Nav anterior) | Substitui e consolida |
| PRD 25 (Design System anterior) | Substitui e consolida |

---

## Riscos

| Risco | Mitigacao |
|---|---|
| Migrar WhatsApp/Meta Ads de TemplateMainShell pode quebrar layout interno | Revisar padding e largura dos componentes filhos antes de subir |
| Rota `/dashboard/approvals` pode ter links hardcoded em notificacoes ou emails | Busca global antes de remover; redirect garante compatibilidade |
| `bg-muted/30` no shell pode ter contraste diferente de `bg-gray-50` em alguns temas | Validar em light e dark antes de subir |
| Remover AccountBillingCard sem comunicar onde o usuario encontra a assinatura | Adicionar link explicito em Settings > Assinatura no primeiro acesso |
| `useAuthorization()` e assincrono — sidebar pode piscar ao carregar permissoes | Usar skeleton no sidebar ou inicializar com permissoes minimas ate resolver |
| Settings pages abertas hoje podem ter links compartilhados por usuarios sem permissao | Garantir redirect de servidor em todas as novas rotas restritas antes de publicar |
