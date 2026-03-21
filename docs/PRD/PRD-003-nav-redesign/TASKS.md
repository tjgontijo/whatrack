# TASKS — PRD-012: Nav Redesign

## Visão Geral da Ordem

```
Task 1 → Expor organizationLogo no ProjectContext
Task 2 → Criar DashboardTopbar
Task 3 → Refatorar ProjectScopedSidebar (modo app + modo settings)
Task 4 → Atualizar layout shell
Task 5 → Limpeza (remover arquivos obsoletos)
Task 6 → Validação visual
```

---

### Task 1: Expor `organizationLogo` no `ProjectContext`

**Files:**
- Modify: `src/server/project/resolve-project-context.ts`

**What to do:**

1. Adicionar `organizationLogo?: string | null` à interface `ProjectContext` (e `OrganizationContext`)
2. Incluir `logo: true` no `select` da `organization` nas três funções: `resolveProjectContext`, `resolveOrganizationContext`, `resolveProjectContextById`
3. Retornar o campo no objeto de resultado de cada função

```typescript
// Interface
export interface ProjectContext {
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string | null  // ← adicionar
  projectId: string
  projectSlug: string
  projectName: string
}

// Select
organization: {
  select: {
    id: true,
    slug: true,
    name: true,
    logo: true,  // ← adicionar
  },
},

// Return
organizationLogo: member.organization.logo,  // ← adicionar
```

**Verification:**
- TypeScript compila sem erros
- `ProjectContext` tem o campo `organizationLogo`

---

### Task 2: Criar `DashboardTopbar`

**Files:**
- Create: `src/components/dashboard/layout/topbar.tsx`

**What to do:**

Novo componente `'use client'` que substitui o `DashboardHeader`. Recebe como props todos os dados que o layout já carrega.

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { UserDropdownMenu } from '@/components/dashboard/sidebar/user-dropdown-menu'

type DashboardTopbarProps = {
  session?: any
  organizationName: string
  organizationSlug: string
  projectName: string
  projectSlug: string
  hasOrganization?: boolean
  identityComplete?: boolean
}

export function DashboardTopbar({
  session,
  organizationName,
  organizationSlug,
  projectName,
  projectSlug,
}: DashboardTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const basePath = `/${organizationSlug}/${projectSlug}`
  const isSettingsMode = pathname.startsWith(`${basePath}/settings`)

  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image

  return (
    {/*
      Sem bg-background aqui — a topbar herda bg-sidebar do container raiz.
      border-b usa border-sidebar-border (token semântico) para manter coerência visual.
    */}
    <header className="border-sidebar-border border-b flex h-12 w-full shrink-0 items-center gap-2 px-4">
      {/* Esquerda: logo da organização + breadcrumb (sem SidebarTrigger — collapse é feito na sidebar) */}
      <Link href={basePath} className="flex items-center gap-2">
        {organizationLogoUrl ? (
          <Image
            src={organizationLogoUrl}
            alt={organizationName}
            width={24}
            height={24}
            className="size-6 rounded object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-semibold">
            {organizationName.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-1 text-sm">
        <span className="text-foreground font-medium">{organizationName}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{projectName}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Direita: nav mode + avatar */}
      <nav className="flex items-center gap-1">
        <Button
          variant={isSettingsMode ? 'ghost' : 'secondary'}
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={() => router.push(basePath)}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>

        <Button
          variant={isSettingsMode ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.push(`${basePath}/settings/profile`)}
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </nav>

      <Separator orientation="vertical" className="h-4" />

      {/* Avatar */}
      <UserDropdownMenu
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        variant="topbar"
      />
    </header>
  )
}
```

**Nota sobre UserDropdownMenu:** O componente atual usa `SidebarMenuButton` como trigger (estilo sidebar). Será necessário adicionar uma prop `variant="topbar"` para renderizar um trigger compacto (só avatar) quando usado na topbar. Ver Task 2.

**Verification:**
- Componente criado sem erros de TypeScript
- Topbar renderiza logo + breadcrumb + dois botões de modo + avatar

---

### Task 3: Adaptar `UserDropdownMenu` + Refatorar `ProjectScopedSidebar`

**Files:**
- Modify: `src/components/dashboard/sidebar/user-dropdown-menu.tsx`
- Modify: `src/components/dashboard/sidebar/project-scoped-sidebar.tsx`

**What to do (UserDropdownMenu):**

Adicionar prop `variant?: 'sidebar' | 'topbar'` (default `'sidebar'`). No modo `topbar`, o trigger é apenas o Avatar (compacto), sem o texto do nome nem o chevron.

```tsx
// Adicionar prop
interface UserDropdownMenuProps {
  userName: string
  userEmail: string
  userImage?: string | null
  variant?: 'sidebar' | 'topbar'
}

// Trigger no modo topbar
if (variant === 'topbar') {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:ring-ring rounded-full focus-visible:outline-none focus-visible:ring-2">
          <Avatar className="h-7 w-7">
            {userImage && !avatarError && (
              <AvatarImage src={userImage} alt={userName} onError={() => setAvatarError(true)} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      {/* mesmo DropdownMenuContent do modo sidebar */}
    </DropdownMenu>
  )
}
```

**What to do (ProjectScopedSidebar):**

Refatorar a sidebar para:

1. **Detectar o modo** via `usePathname`:
   ```typescript
   const isSettingsMode = pathname.startsWith(`${basePath}/settings`)
   ```

2. **Remover:** header com logo/org/projeto (vai para topbar), ProjectSelector, UserDropdownMenu do footer, todos os SidebarGroupLabel uppercase.

3. **Renderizar lista plana no modo app** — apenas os itens de navegação da aplicação, sem grupos, sem labels. Separador visual sutil (uma linha) entre grupos relacionados se necessário.

4. **Renderizar lista plana no modo settings** — apenas os itens de configuração filtrados por permissão.

5. **Manter:** `SidebarRail`, colapsabilidade com `collapsible="icon"`, tooltips.

Estrutura resultante:
```tsx
<Sidebar collapsible="icon">
  <SidebarContent>
    {isSettingsMode ? (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {settingsNavItems.map(renderItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    ) : (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {appNavItems.map(renderItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )}
  </SidebarContent>
  <SidebarRail />
</Sidebar>
```

**Sem SidebarHeader** — logo e org/projeto agora estão na topbar.

**SidebarFooter com botão de collapse** no bottom-left, fiel à referência OpenAI:

```tsx
import { useSidebar } from '@/components/ui/sidebar'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

// Dentro do componente:
const { open, toggleSidebar } = useSidebar()

// No JSX:
<SidebarFooter className="p-2">
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={toggleSidebar}
        tooltip={open ? 'Recolher menu' : 'Expandir menu'}
        className="text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
        <span>Recolher</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

**`SidebarRail` mantido** — o hover na borda direita da sidebar ativa o collapse nativamente.

**Verification:**
- Sidebar no modo app: 10 itens de navegação, sem labels, sem grupos divididos
- Sidebar no modo settings: itens de config filtrados por permissão, sem labels uppercase
- Trocar de modo (via topbar) muda os itens da sidebar instantaneamente
- Sidebar ainda colapsa para ícones

---

### Task 4: Atualizar o layout shell

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx`

**What to do:**

1. Remover imports: `DashboardHeader`, `HeaderActionsProvider`
2. Adicionar import: `DashboardTopbar`
3. Mover a topbar para FORA do `SidebarInset`
4. Reestruturar o flex container aplicando o efeito "canvas escuro + folha branca"

**Efeito visual:** o container raiz tem `bg-sidebar` (fundo escuro do shadcn/ui sidebar), topbar e sidebar herdam esse fundo. O `SidebarInset` (main) tem `bg-background` (branco) com `rounded-tl-xl` — aparece como uma folha branca sobre o canvas escuro.

```tsx
// Depois
<ProjectRouteProvider value={context}>
  <ProjectClientContextSync projectId={projectId} />
  <SidebarProvider>
    {/*
      bg-sidebar no container raiz = canvas escuro (mesma cor que topbar e sidebar).
      O SidebarInset fica com bg-background + rounded-tl-xl,
      criando o efeito "folha branca sobre moldura escura".
    */}
    <div className="bg-sidebar flex min-h-screen w-full flex-col">
      <DashboardTopbar
        session={session}
        organizationName={organizationName}
        organizationSlug={organizationSlug}
        organizationLogo={context.organizationLogo}
        projectName={projectName}
        projectSlug={projectSlug}
      />
      <div className="flex flex-1 min-h-0">
        <ProjectScopedSidebar
          session={session}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          projectId={projectId}
          projectSlug={projectSlug}
          projectName={projectName}
          projects={projects}
          permissions={permissions}
        />
        <SidebarInset className="bg-background rounded-tl-xl min-w-0 overflow-hidden">
          <main className="3xl:px-6 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
            <DashboardContent>
              <div className="max-w-screen-4xl mx-auto w-full min-w-0">{children}</div>
            </DashboardContent>
          </main>
        </SidebarInset>
      </div>
    </div>
    <Toaster richColors position="bottom-center" />
  </SidebarProvider>
</ProjectRouteProvider>
```

**Nota:** `bg-sidebar` é o token semântico do shadcn/ui para o fundo da sidebar — já definido no tema. Usar esse token garante que topbar, sidebar e canvas tenham exatamente a mesma cor sem hardcode.

**Verification:**
- Topbar ocupa 100% da largura da tela
- Sidebar fica abaixo da topbar, à esquerda
- Conteúdo ocupa o espaço restante à direita
- Nenhuma rota existente quebra

---

### Task 5: Limpeza de arquivos obsoletos

**Files:**
- Delete: `src/components/dashboard/layout/header.tsx`
- Delete: `src/components/dashboard/layout/header-actions.tsx`
- Modify: `src/components/dashboard/layout/index.ts` (remover exports desses arquivos)

**What to do:**

Verificar antes de deletar que não há mais nenhum import de `DashboardHeader`, `HeaderActionsProvider`, `HeaderActions`, `useHeaderActions`, `HeaderActionsSlot` em nenhum arquivo do projeto.

```bash
# Verificar antes de deletar
grep -r "DashboardHeader\|HeaderActions\|useHeaderActions" src/
```

Se grep retornar vazio: deletar os arquivos e remover do `index.ts`.

**Verification:**
- `npm run build` sem erros de import
- `npm run lint` sem warnings sobre imports não usados

---

### Task 6: Validação Final

**What to do:**

1. `npm run lint` — 0 erros
2. `npm run build` — build bem-sucedido
3. Checklist visual:
   - [ ] Topbar em 100% da largura em todas as páginas
   - [ ] Logo + "OrgName / ProjectName" visível na topbar
   - [ ] Botão "Dashboard" ativo (highlighted) quando em rota de app
   - [ ] Botão "⚙" ativo (highlighted) quando em `/settings/*`
   - [ ] Clicar "Dashboard" → sidebar mostra itens de app
   - [ ] Clicar "⚙" → sidebar mostra itens de config
   - [ ] Avatar na topbar abre dropdown com logout/tema/configurações
   - [ ] Sidebar sem labels uppercase, visual limpo
   - [ ] Sidebar ainda colapsa para ícones
   - [ ] Sem regressão em rotas: `/leads`, `/tickets`, `/settings/profile`, etc.

**Verification:**
- Build verde
- Lint zero erros
- Checklist 100% marcado
