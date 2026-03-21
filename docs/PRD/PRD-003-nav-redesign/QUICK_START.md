# QUICK START — PRD-012: Nav Redesign

## Branch

```bash
git checkout main && git pull origin main
git checkout -b feature/2026-03-21-nav-redesign
git add docs/PRD/PRD-012-nav-redesign/
git commit -m "docs: add PRD-012 nav redesign"
```

## Ordem de Execução

```
Task 1 — Criar DashboardTopbar           (~30min)
Task 2 — Adaptar UserDropdownMenu        (~15min)
       — Refatorar ProjectScopedSidebar  (~30min)
Task 3 — Atualizar layout shell          (~15min)
Task 4 — Limpeza                         (~10min)
Task 5 — Validação                       (~10min)
```

## Arquivos que Mudam

| Ação | Arquivo |
|---|---|
| Criar | `src/components/dashboard/layout/topbar.tsx` |
| Modificar | `src/components/dashboard/sidebar/user-dropdown-menu.tsx` |
| Modificar | `src/components/dashboard/sidebar/project-scoped-sidebar.tsx` |
| Modificar | `src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx` |
| Modificar | `src/components/dashboard/layout/index.ts` |
| Deletar | `src/components/dashboard/layout/header.tsx` |
| Deletar | `src/components/dashboard/layout/header-actions.tsx` |

## Resultado Visual Esperado

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Org Name / Project Name        [Dashboard] [⚙] [Avatar]│  ← 100% width
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Dashboard   │                                                  │
│  Analytics   │     Conteúdo da página                           │
│  Meta Ads    │                                                  │
│  Mensagens   │                                                  │
│  Campanhas   │                                                  │
│  Leads       │                                                  │
│  Tickets     │                                                  │
│  Vendas      │                                                  │
│  IA          │                                                  │
│              │                                                  │
│ [◀ Recolher] │  ← bottom-left da sidebar                        │
└──────────────┴──────────────────────────────────────────────────┘
              ↑
         borda direita com hover = collapse (SidebarRail)

Modo Settings (⚙ ativo):
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Perfil      │                                                  │
│  Organização │     Conteúdo da página                           │
│  Equipe      │                                                  │
│  Integrações │                                                  │
│  Pipeline    │                                                  │
│  IA Studio   │                                                  │
│  Catálogo    │                                                  │
│  Assinatura  │                                                  │
│  Auditoria   │                                                  │
│              │                                                  │
│ [◀ Recolher] │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

## Validação Rápida

```bash
npm run lint && npm run build
```
