# PRD 27 — RBAC Frontend: Controle de Acesso na UI

## Status

Proposto. Implementa o controle de acesso na UI com separacao clara entre:

- `Platform` (papel global do SaaS)
- `Workspace` (papel e permissoes da organizacao)
- `Project` (escopo de dados)

Complementa o [24_PRD_FRONTEND_OVERHAUL.md](/Users/thiago/www/whatrack/docs/PRD/24_PRD_FRONTEND_OVERHAUL.md).

**Depende de:** PRD 24 (estrutura de navegacao e settings pages novas)

---

## Contexto

O sistema de RBAC ja existe e funciona no backend. O problema e que o frontend
nao o usa de forma consistente e ainda mistura duas camadas diferentes de acesso:

- papel global do SaaS
- papel do membro dentro da organizacao ativa

Referencia de arquitetura:

- [ARCHITECTURE_ACCESS_MODEL.md](/Users/thiago/www/whatrack/docs/ARCHITECTURE_ACCESS_MODEL.md)

**O que existe hoje:**

| Arquivo | O que faz |
|---|---|
| `src/lib/auth/rbac/roles.ts` | Papel global do SaaS: `isOwner()`, `isAdmin()`, `hasPermission()` |
| `src/lib/auth/guards.ts` | Guards globais da platform: `requireAdmin()`, `requirePermission()` |
| `src/hooks/auth/use-authorization.ts` | Hook cliente do workspace: `useAuthorization()` com role e permissoes da organizacao |
| `src/server/auth/validate-organization-access.ts` | Guards server-side do workspace: `validatePermissionAccess()`, `validateAdminAccess()`, `validateOwnerAccess()` |

**O que falta:**

- O sidebar so protege 3 items hardcoded
- As novas settings pages (PRD 24) nao tem guard nenhum
- A nav lateral de settings nao filtra por papel

---

## Modelo de Acesso

### 1. Platform

Usa:

- `session.user.role`

Aplica a:

- secao `Sistema`
- Design System
- Planos e cobranca internos do SaaS
- telas tecnicas internas

### 2. Workspace

Usa:

- `useAuthorization()`
- `validatePermissionAccess()`
- `validateAdminAccess()`
- `validateOwnerAccess()`

Aplica a:

- sidebar operacional
- settings do workspace
- IA Copilot
- assinatura da agencia
- integracoes, equipe, pipeline, auditoria

### 3. Project

Usa:

- `projectId`

Aplica a:

- escopo de dados

Nao substitui RBAC.

---

## Regras de Acesso Definidas

### Sidebar principal do workspace

| Item | Permissao necessaria |
|---|---|
| Dashboard | `view:dashboard` |
| Analytics | `view:analytics` |
| Meta Ads | `view:meta` |
| Mensagens | `view:whatsapp` |
| Projetos | `view:leads` |
| Leads | `view:leads` |
| Tickets | `view:tickets` |
| Vendas | `view:sales` |
| IA Copilot | `view:ai` |
| — aba Uso e Custo | `isAdmin` do workspace (dado financeiro) |

### Settings — nav lateral do workspace

| Item | Permissao do workspace | Papel minimo no workspace |
|---|---|---|
| Perfil | — | qualquer |
| Seguranca | — | qualquer |
| Organizacao | `manage:organization` | admin+ |
| Equipe | `manage:members` | admin+ |
| Integracoes | `manage:integrations` | admin+ |
| Pipeline | `manage:settings` | admin+ |
| IA Studio | `manage:ai` | admin+ |
| Catalogo | `manage:items` | admin+ |
| Assinatura | `manage:organization` | owner do workspace |
| Auditoria | `view:audit` | admin+ |

### Secao SISTEMA (super admin global)

| Item | Condicao |
|---|---|
| Planos e Cobranca | `isAdmin(session.user.role)` global |
| Design System | `isOwner(session.user.role)` global |
| Webhook Meta | `isOwner(session.user.role)` global |

---

## Implementacao

### 1. Sidebar principal (`sidebar-client.tsx`)

**Problema atual:** os items do sidebar principal sao exibidos para todos sem
verificar permissao. Apenas 3 items tem check hardcoded via `session.user.role`.

**Solucao:** usar `useAuthorization()` para filtrar os items do sidebar operacional.
Manter `session.user.role` apenas para os checks da secao `SISTEMA`,
pois sao papeis globais da platform, nao do workspace.

**Ponto de atencao — loading state:**

`useAuthorization()` busca dados async. Durante o carregamento inicial, nao temos
as permissoes. O comportamento correto e manter os items visiveis durante o loading
(o role default do usuario basico ja tem todas as permissoes `view:*`). O risco e
minimo pois o servidor bloqueia acesso a dados sensiveis independente da UI.

```tsx
// src/components/dashboard/sidebar/sidebar-client.tsx

// Adicionar ao inicio do componente:
const { isOwner, isAdmin, can } = useAuthorization()

// Manter para secao SISTEMA (papel global da platform):
const isSuperAdmin = isOwner(session?.user?.role)
const canManageBillingCatalog = isAdmin(session?.user?.role)

// Definir grupos de items com visibilidade condicional:
const mainNavItems = [
  // VISAO GERAL
  { label: 'Dashboard',  href: '/dashboard',               icon: LayoutDashboard, show: can('view:dashboard') },
  { label: 'Analytics',  href: '/dashboard/analytics',     icon: BarChart2,       show: can('view:analytics') },
  // CAPTACAO
  { label: 'Meta Ads',   href: '/dashboard/meta-ads',      icon: TrendingUp,      show: can('view:meta') },
  { label: 'Mensagens',  href: '/dashboard/whatsapp/inbox',icon: MessageSquare,   show: can('view:whatsapp') },
  // CRM
  { label: 'Projetos',   href: '/dashboard/projects',      icon: FolderKanban,    show: can('view:leads') },
  { label: 'Leads',      href: '/dashboard/leads',         icon: Users,           show: can('view:leads') },
  { label: 'Tickets',    href: '/dashboard/tickets',       icon: Ticket,          show: can('view:tickets') },
  { label: 'Vendas',     href: '/dashboard/sales',         icon: ShoppingCart,    show: can('view:sales') },
  // INTELIGENCIA
  { label: 'IA Copilot', href: '/dashboard/ia',            icon: Sparkles,        show: can('view:ai') },
]
```

**Nav de Settings (dentro do footer/dropdown ou settings layout):**

```tsx
const settingsPersonalItems = [
  { label: 'Perfil',    href: '/dashboard/settings/perfil',   show: true },
  { label: 'Seguranca', href: '/dashboard/settings/seguranca',show: true },
]

const settingsWorkspaceItems = [
  { label: 'Organizacao', href: '/dashboard/settings/organizacao', show: isAdmin },
  { label: 'Equipe',      href: '/dashboard/settings/equipe',      show: can('manage:members') },
  { label: 'Integracoes', href: '/dashboard/settings/integracoes', show: can('manage:integrations') },
  { label: 'Pipeline',    href: '/dashboard/settings/pipeline',    show: can('manage:settings') },
  { label: 'IA Studio',   href: '/dashboard/settings/ia-studio',  show: can('manage:ai') },
  { label: 'Catalogo',    href: '/dashboard/settings/catalogo',    show: can('manage:items') },
  { label: 'Assinatura',  href: '/dashboard/settings/assinatura',  show: isOwner },
  { label: 'Auditoria',   href: '/dashboard/settings/auditoria',   show: can('view:audit') },
].filter(item => item.show)

// Mostrar secao WORKSPACE apenas se houver ao menos 1 item visivel
const showWorkspaceSection = settingsWorkspaceItems.length > 0
```

**Renderizacao da nav de Settings:**

```tsx
<nav>
  <p className="text-xs font-medium text-muted-foreground uppercase px-2 mb-1">
    Conta pessoal
  </p>
  {settingsPersonalItems.map(item => (
    <SidebarMenuButton key={item.href} asChild>
      <Link href={item.href}>{item.label}</Link>
    </SidebarMenuButton>
  ))}

  {showWorkspaceSection && (
    <>
      <p className="text-xs font-medium text-muted-foreground uppercase px-2 mt-4 mb-1">
        Workspace
      </p>
      {settingsWorkspaceItems.map(item => (
        <SidebarMenuButton key={item.href} asChild>
          <Link href={item.href}>{item.label}</Link>
        </SidebarMenuButton>
      ))}
    </>
  )}
</nav>
```

### 2. IA Copilot — aba Uso e Custo

A aba "Uso e Custo" dentro de `/dashboard/ia` deve ser visivel apenas para admin+.

```tsx
// src/app/dashboard/ia/page.tsx

const { isAdmin } = useAuthorization()

<Tabs defaultValue="aprovacoes">
  <TabsList>
    <TabsTrigger value="aprovacoes">Aprovacoes</TabsTrigger>
    {isAdmin && (
      <TabsTrigger value="uso">Uso e Custo</TabsTrigger>
    )}
  </TabsList>
  <TabsContent value="aprovacoes">
    <ApprovalsContent />
  </TabsContent>
  {isAdmin && (
    <TabsContent value="uso">
      <AiUsageContent />
    </TabsContent>
  )}
</Tabs>
```

### 3. Guards de servidor nas novas settings pages

Cada `page.tsx` das novas rotas de settings deve ter guard antes de renderizar.
Usar o padrao ja existente no projeto.

**Padrao para pages de workspace com permissao especifica:**

```tsx
// Aplicar em: organizacao, equipe, integracoes, pipeline, ia-studio, catalogo, auditoria

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { redirect } from 'next/navigation'

export default async function OrganizacaoPage() {
  const access = await validatePermissionAccess(request, 'manage:organization')
  if (!access.hasAccess) {
    redirect('/dashboard')
  }
  // ...
}
```

**Padrao para pages de workspace que exigem owner do workspace:**

```tsx
// Aplicar em: assinatura

import { validateOwnerAccess } from '@/server/auth/validate-organization-access'
import { redirect } from 'next/navigation'

export default async function AssinaturaPage() {
  const access = await validateOwnerAccess(request)
  if (!access.hasAccess) {
    redirect('/dashboard')
  }
  // ...
}
```

**Nota importante:**

Settings da agencia pertencem ao `Workspace`, nao a `Platform`.
Portanto, devem usar guard do workspace, nao papel global do SaaS.

Papel global fica reservado para a secao `SISTEMA`.

**Guards por rota:**

| Rota | Guard | Funcao |
|---|---|---|
| `/dashboard/settings/perfil` | Qualquer autenticado | `requireAuth()` |
| `/dashboard/settings/seguranca` | Qualquer autenticado | `requireAuth()` |
| `/dashboard/settings/organizacao` | Workspace admin+ | `validatePermissionAccess(..., 'manage:organization')` |
| `/dashboard/settings/equipe` | Workspace admin+ | `validatePermissionAccess(..., 'manage:members')` |
| `/dashboard/settings/integracoes` | Workspace admin+ | `validatePermissionAccess(..., 'manage:integrations')` |
| `/dashboard/settings/pipeline` | Workspace admin+ | `validatePermissionAccess(..., 'manage:settings')` |
| `/dashboard/settings/ia-studio` | Admin+ | `isAdmin(session.user.role)` |
| `/dashboard/settings/catalogo` | Admin+ | `isAdmin(session.user.role)` |
| `/dashboard/settings/assinatura` | Owner | `isOwner(session.user.role)` |
| `/dashboard/settings/auditoria` | Admin+ | `isAdmin(session.user.role)` |

### 4. Settings layout — nav lateral condicional

O `layout.tsx` de `/dashboard/settings` renderiza a nav lateral. Ele e um
Server Component e pode checar o papel direto da sessao:

```tsx
// src/app/dashboard/settings/layout.tsx

import { getServerSession } from '@/lib/auth/server'
import { isOwner, isAdmin } from '@/lib/auth/rbac/roles'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  const owner = isOwner(session.user.role)
  const admin = isAdmin(session.user.role)  // true para owner ou admin

  const personalItems = [
    { label: 'Perfil',    href: '/dashboard/settings/perfil' },
    { label: 'Seguranca', href: '/dashboard/settings/seguranca' },
  ]

  const workspaceItems = [
    { label: 'Organizacao', href: '/dashboard/settings/organizacao', show: admin },
    { label: 'Equipe',      href: '/dashboard/settings/equipe',      show: admin },
    { label: 'Integracoes', href: '/dashboard/settings/integracoes', show: admin },
    { label: 'Pipeline',    href: '/dashboard/settings/pipeline',    show: admin },
    { label: 'IA Studio',   href: '/dashboard/settings/ia-studio',  show: admin },
    { label: 'Catalogo',    href: '/dashboard/settings/catalogo',    show: admin },
    { label: 'Assinatura',  href: '/dashboard/settings/assinatura',  show: owner },
    { label: 'Auditoria',   href: '/dashboard/settings/auditoria',   show: admin },
  ].filter(i => i.show)

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-border px-4 py-6 space-y-6">
        <SettingsNavSection title="Conta pessoal" items={personalItems} />
        {workspaceItems.length > 0 && (
          <SettingsNavSection title="Workspace" items={workspaceItems} />
        )}
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

Vantagem de usar Server Component no layout: sem loading state, sem flash de
permissoes, a nav ja vem renderizada com os items corretos desde o servidor.

### 5. Feedback ao usuario sem permissao

Quando o usuario acessa uma rota sem permissao (via URL direta), o redirect
deve incluir um toast de feedback.

**Padrao com searchParam:**

```tsx
// Na page restrita:
if (!isAdmin(session.user.role)) {
  redirect('/dashboard?error=permission_denied')
}

// No dashboard/layout.tsx ou dashboard/page.tsx:
const searchParams = useSearchParams()
const error = searchParams.get('error')

useEffect(() => {
  if (error === 'permission_denied') {
    toast.error('Voce nao tem permissao para acessar esta pagina.')
  }
}, [error])
```

**Alternativa com cookie flash (sem useEffect):**

Usar `cookies()` do Next.js para passar a mensagem de erro e consumir no
primeiro render do componente de destino. Mais limpo para Server Components.

Para este PRD, o searchParam e aceitavel como primeira implementacao.

---

## Arquivos a Modificar

```
MODIFICAR:
  src/components/dashboard/sidebar/sidebar-client.tsx
    - adicionar useAuthorization()
    - adicionar items do sidebar com .show por permissao
    - exportar settingsWorkspaceItems para reusar no settings layout

CRIAR:
  src/app/dashboard/settings/layout.tsx
    - nav lateral Server Component com items filtrados por papel

CRIAR/MODIFICAR (guard em cada page):
  src/app/dashboard/settings/perfil/page.tsx          → requireAuth
  src/app/dashboard/settings/seguranca/page.tsx       → requireAuth
  src/app/dashboard/settings/organizacao/page.tsx     → isAdmin
  src/app/dashboard/settings/equipe/page.tsx          → isAdmin
  src/app/dashboard/settings/integracoes/page.tsx     → isAdmin
  src/app/dashboard/settings/pipeline/page.tsx        → isAdmin (ja tem, manter)
  src/app/dashboard/settings/ia-studio/page.tsx       → isAdmin
  src/app/dashboard/settings/catalogo/page.tsx        → isAdmin
  src/app/dashboard/settings/assinatura/page.tsx      → isOwner
  src/app/dashboard/settings/auditoria/page.tsx       → isAdmin

MODIFICAR:
  src/app/dashboard/ia/page.tsx
    - condicionar aba Uso e Custo a isAdmin
```

---

## Ordem de Execucao

1. Criar `settings/layout.tsx` com nav lateral e filtro por papel (Server Component)
2. Adicionar `useAuthorization()` no `sidebar-client.tsx` e montar `mainNavItems` com `.show`
3. Adicionar guards em cada `page.tsx` de settings (ordem: mais restritivo primeiro — assinatura, depois admin+)
4. Condicionar aba Uso e Custo no `/dashboard/ia`
5. Adicionar feedback de permissao negada (searchParam + toast no dashboard)

---

## Testes

Para cada papel, validar manualmente (ou via teste e2e):

**Como usuario com papel `user`:**
- [ ] Sidebar mostra apenas items com permissao `view:*` (todos para user basico)
- [ ] Settings lateral mostra apenas Perfil e Seguranca
- [ ] Acesso a `/dashboard/settings/equipe` → redirect para /dashboard com toast
- [ ] Acesso a `/dashboard/settings/assinatura` → redirect para /dashboard com toast
- [ ] Aba "Uso e Custo" nao aparece em IA Copilot

**Como usuario com papel `admin`:**
- [ ] Settings lateral mostra Workspace completo menos Assinatura
- [ ] Acesso a `/dashboard/settings/assinatura` → redirect com toast
- [ ] Aba "Uso e Custo" aparece em IA Copilot

**Como usuario com papel `owner`:**
- [ ] Settings lateral mostra tudo incluindo Assinatura
- [ ] Todas as rotas de settings acessiveis sem redirect

**Como super admin global:**
- [ ] Secao SISTEMA aparece no sidebar (Planos, Design System, Webhook Meta)

---

## Criterios de Aceite

- [ ] `sidebar-client.tsx` usa `useAuthorization()` para filtrar items do sidebar
- [ ] Nav lateral de settings e um Server Component com filtro por `session.user.role`
- [ ] Toda settings page com restricao tem guard de servidor (`isAdmin` ou `isOwner`)
- [ ] Aba Uso e Custo no IA Copilot condicional a `isAdmin`
- [ ] Acesso por URL direta a rota restrita redireciona para /dashboard
- [ ] Usuario `user` nao ve Assinatura nem secao Workspace em nenhum caminho da UI
- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem erros

---

## Fora de Escopo

- Permissoes granulares por recurso (ex: ver apenas leads do proprio projeto)
- Override de permissoes por membro (ja existe no backend, UI fica em PRD futuro)
- Autenticacao do cliente final da agencia (fora do produto por ora)
- Roles customizados refletidos na nav (a nav usa os 3 papeis do sistema)
