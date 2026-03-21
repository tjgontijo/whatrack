# DIAGNOSTIC — PRD-012: Nav Redesign

## Problema Raiz

O `DashboardHeader` está montado **dentro** do `SidebarInset`, então ele só ocupa a largura da área de conteúdo — nunca 100% da tela. Para ter uma topbar full-width, ela precisa sair do `SidebarInset` e ficar no nível do flex container pai.

## Inventário de Uso — HeaderActions

Grep em `src/` por `HeaderActions` e `useHeaderActions`:

```
Arquivos encontrados:
- src/components/dashboard/layout/header.tsx        (define e usa HeaderActionsSlot)
- src/components/dashboard/layout/header-actions.tsx (define o contexto)
- src/app/(dashboard)/.../layout.tsx                (importa HeaderActionsProvider)
```

**Conclusão:** Nenhuma página usa `HeaderActions` para injetar conteúdo. O sistema existe mas não é consumido. Pode ser **removido** junto com a refatoração.

## Mapeamento de Items por Modo

### Modo App (sidebar principal)

| Item | Href | Permissão |
|---|---|---|
| Dashboard | `basePath` | `view:dashboard` |
| Analytics | `basePath/analytics` | `view:analytics` |
| Meta Ads | `basePath/meta-ads` | `view:meta` |
| Mensagens | `basePath/whatsapp/inbox` | `view:whatsapp` |
| Campanhas | `basePath/whatsapp/campaigns` | `view:whatsapp` |
| Projetos | `basePath/projects` | `view:leads` |
| Leads | `basePath/leads` | `view:leads` |
| Tickets | `basePath/tickets` | `view:tickets` |
| Vendas | `basePath/sales` | `view:sales` |
| IA | `basePath/ia` | `view:ai` |

### Modo Settings (sidebar de config)

| Item | Href | Permissão |
|---|---|---|
| Perfil | `basePath/settings/profile` | — (sempre visível) |
| Organização | `basePath/settings/organization` | `manage:organization` |
| Equipe | `basePath/settings/team` | `manage:members` |
| Integrações | `basePath/settings/integrations` | `manage:integrations` |
| Pipeline | `basePath/settings/pipeline` | `manage:settings` |
| IA Studio | `basePath/settings/ai-studio` | `manage:ai` |
| Catálogo | `basePath/settings/catalog` | `manage:items` |
| Assinatura | `basePath/settings/subscription` | — (sempre visível) |
| Auditoria | `basePath/settings/audit` | `view:audit` |

### Modo Admin (sub-seção do modo Settings, visível para admin/owner)

| Item | Href | Condição |
|---|---|---|
| Webhooks | `basePath/settings/webhooks/whatsapp` | `role === 'admin' || 'owner'` |
| Planos e Cobrança | `basePath/settings/billing` | `role === 'admin' || 'owner'` |
| Design System | `basePath/design-system` | `role === 'owner'` |

## Detecção do Modo Ativo

O modo é derivado **somente do pathname** — sem estado externo:

```typescript
const isSettingsMode = pathname.includes('/settings/') || pathname.includes('/settings')
const mode: 'app' | 'settings' = isSettingsMode ? 'settings' : 'app'
```

Os botões na topbar funcionam como links/navegação:
- Botão "Dashboard" → navega para `basePath` (dashboard raiz)
- Botão "⚙" → navega para `basePath/settings/profile`

O estilo ativo do botão é derivado do `mode`.

## Impacto no Layout Shell

Mudança no `ProjectScopedLayout`:

**Antes:**
```tsx
<SidebarProvider>
  <div className="bg-background flex min-h-screen w-full">
    <ProjectScopedSidebar ... />
    <SidebarInset className="min-w-0">
      <DashboardHeader ... />           {/* ← dentro do inset */}
      <main>...</main>
    </SidebarInset>
  </div>
</SidebarProvider>
```

**Depois:**
```tsx
<SidebarProvider>
  <div className="bg-background flex min-h-screen w-full flex-col">
    <DashboardTopbar ... />             {/* ← fora, 100% width */}
    <div className="flex flex-1 min-h-0">
      <ProjectScopedSidebar ... />
      <SidebarInset className="min-w-0">
        <main>...</main>
      </SidebarInset>
    </div>
  </div>
</SidebarProvider>
```

## Compatibilidade com shadcn/ui Sidebar — Collapse

Confirmado na referência OpenAI: o controle de colapso **não fica na topbar**. Ele tem dois pontos de interação:

### 1. Ícone no bottom-left da sidebar

Um botão fixo no canto inferior esquerdo da sidebar (dentro do `SidebarFooter`), com ícone de chevron/seta que indica a direção do colapso.

```
┌──────────────┐
│  nav items   │
│              │
│              │
│ [◀]          │  ← bottom-left, dentro da sidebar
└──────────────┘
```

Implementação: `SidebarMenuButton` com `onClick={() => toggleSidebar()}` usando o hook `useSidebar()` do shadcn/ui. O ícone muda de `PanelLeftClose` para `PanelLeftOpen` conforme o estado.

### 2. Hover na borda direita da sidebar (SidebarRail)

O `<SidebarRail />` do shadcn/ui já implementa isso nativamente: ao passar o mouse na borda direita da sidebar, ela vira um cursor de resize/collapse clicável. **Manter o `SidebarRail` no componente** para ter esse comportamento gratuitamente.

### Remoção do SidebarTrigger da topbar

O `SidebarTrigger` (hambúrguer) **é removido** da topbar. O colapso passa a ser controlado exclusivamente por:
- Botão bottom-left da sidebar
- Hover na borda direita (`SidebarRail`)

## Remoções Seguras

- `src/components/dashboard/layout/header.tsx` — substituído pela nova Topbar
- `src/components/dashboard/layout/header-actions.tsx` — não utilizado por páginas
- `HeaderActionsProvider` do layout — removido junto
- `import { HeaderActionsProvider }` e `<HeaderActionsProvider>` no layout shell
