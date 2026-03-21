# CONTEXT — PRD-012: Nav Redesign

## Arquivos Relevantes

### Layout raiz
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx` — Server Component que monta toda a shell. Passa dados para sidebar e header.

### Componentes atuais (serão substituídos/refatorados)
- `src/components/dashboard/sidebar/project-scoped-sidebar.tsx` — Sidebar atual com todos os grupos misturados
- `src/components/dashboard/sidebar/user-dropdown-menu.tsx` — Dropdown do usuário no footer da sidebar
- `src/components/dashboard/layout/header.tsx` — Header atual com SidebarTrigger + breadcrumb + HeaderActionsSlot
- `src/components/dashboard/layout/header-actions.tsx` — Context pattern para injetar ações no header a partir de páginas filhas

### Componentes de UI base
- `src/components/ui/sidebar.tsx` — shadcn/ui Sidebar primitives (Sidebar, SidebarContent, SidebarMenu, etc.)

## Estado Atual Detalhado

### Header (`header.tsx`)
- 65px de altura
- Contém: SidebarTrigger | Separator | Breadcrumb | [Status Badge] | [HeaderActionsSlot]
- Gera breadcrumbs dinamicamente a partir do pathname
- É montado dentro de `SidebarInset` (não ocupa toda a largura)

### Sidebar (`project-scoped-sidebar.tsx`)
- `collapsible="icon"` — colapsa para só ícones
- Header: logo + nome da org + nome do projeto
- Body: ProjectSelector + 5 grupos (Visão Geral, Captação, CRM, Inteligência, Configurações) + grupo Admin condicional
- Footer: UserDropdownMenu
- Filtra itens por permissão RBAC

### Layout shell
```
<SidebarProvider>
  <div className="bg-background flex min-h-screen w-full">
    <ProjectScopedSidebar ... />        ← sidebar à esquerda
    <SidebarInset className="min-w-0">  ← conteúdo à direita
      <DashboardHeader ... />            ← header DENTRO do SidebarInset
      <main>...</main>
    </SidebarInset>
  </div>
</SidebarProvider>
```

**Problema chave:** O `DashboardHeader` está dentro do `SidebarInset`, portanto não ocupa 100% da largura da tela — fica apenas na área do conteúdo, ao lado da sidebar.

## O Que Precisa Mudar

### 1. Mover a Topbar para FORA do SidebarInset

Para que a topbar ocupe 100% da largura, o layout precisa ser:

```
<SidebarProvider>
  <div className="flex flex-col min-h-screen w-full">
    <Topbar />                          ← topbar fora, 100% width
    <div className="flex flex-1">
      <ProjectScopedSidebar ... />      ← sidebar
      <SidebarInset>                    ← conteúdo
        <main>...</main>
      </SidebarInset>
    </div>
  </div>
</SidebarProvider>
```

### 2. Novo componente `Topbar`

Substitui o `DashboardHeader`. Contém:
- Logo + Org/Project breadcrumb (esquerda)
- Nav mode toggle: "Dashboard" button + Settings icon button (direita)
- Avatar dropdown (extremo direito)

### 3. Sidebar passa a aceitar `mode: 'app' | 'settings'`

O modo é controlado pelo pathname (derivado no componente com `usePathname`):
- Se pathname inclui `/settings/` → mode = `'settings'`
- Caso contrário → mode = `'app'`

A sidebar renderiza o conjunto de itens correspondente ao modo ativo.

### 4. Remover grupos e labels uppercase da sidebar

Sidebar no modo `app`:
- Lista plana de items de navegação (sem grupos/labels)
- Separador visual sutil entre seções, se necessário

Sidebar no modo `settings`:
- Lista plana de itens de configuração
- Sem ProjectSelector (não faz sentido em config)

## Dados Disponíveis no Layout

O `ProjectScopedLayout` já carrega:
- `session` — nome, email, imagem do usuário
- `organizationId`, `organizationSlug`, `organizationName`
- `projectId`, `projectSlug`, `projectName`
- `projects[]` — lista de projetos para o seletor
- `permissions[]` — permissões efetivas do usuário

**Campo `organizationLogo` ainda não está disponível.** O schema `Organization` tem `logo String?`, mas `resolveProjectContext` não o seleciona. Será necessário:
1. Adicionar `logo` ao `select` em `resolveProjectContext` (e nas variantes `resolveOrganizationContext`, `resolveProjectContextById`)
2. Adicionar `organizationLogo?: string | null` à interface `ProjectContext`
3. Passar `organizationLogo` para a `DashboardTopbar`

**Lógica do logo na topbar:**
- Se `organizationLogo` existe → `<Image src={organizationLogo} />`
- Se não existe → `<div>` com a primeira letra de `organizationName` em maiúsculo

## Dependências

- shadcn/ui `Sidebar` primitives — mantidos
- `usePathname` do Next.js — para derivar o modo ativo
- `useRouter` — para navegação ao trocar modo
- `HeaderActionsProvider` — pode ser removido se a topbar não precisar mais de ações injetadas por páginas. **Verificar se alguma página usa `HeaderActions` hoje antes de remover.**
