# QUICK START — PRD-004: Settings Redesign

## Visão rápida

Reestruturação do módulo de configurações em 5 fases. Nenhuma feature nova — apenas reorganização e padronização visual.

---

## Setup

```bash
git checkout main && git pull
git checkout -b feature/2026-03-21-settings-redesign
```

Sem nova dependência. Sem migração de banco.

---

## Ordem de execução

```
Phase A → Phase B → Phase C → Phase D → Phase E
  (sidebar)   (pipeline)  (catalog)  (design)  (limpeza)
```

Cada fase é independente e pode ser commitada separadamente.

---

## Checklist de início rápido

### Phase A — Sidebar (Tasks 1-3)
- [ ] Reorganizar `settingsGroups` em `app-sidebar.tsx` (Task 1)
- [ ] Mover Webhooks para aba dentro de WhatsApp settings (Task 2)
- [ ] Redirecionar `/settings` → `/settings/profile` (Task 3)

### Phase B — Pipeline drawer (Tasks 4-7)
- [ ] Criar `PipelineSettingsDrawer` com `Sheet` (Task 4)
- [ ] Adicionar botão "Configurar pipeline" em `/tickets` (Task 5)
- [ ] Remover rota `/settings/pipeline` (Task 6)
- [ ] Remover item "Pipeline" do sidebar de settings (Task 7)

### Phase C — Catalog para app (Tasks 8-11)
- [ ] Criar rota `/catalog` com layout próprio (Task 8)
- [ ] Mover `CatalogPage` para nova rota (Task 9)
- [ ] Adicionar item "Catálogo" em `appGroups` no sidebar (Task 10)
- [ ] Remover rota `/settings/catalog` (Task 11)

### Phase D — SettingsRow pattern (Tasks 12-16)
- [ ] Criar `SettingsRow` e `SettingsGroup` em `src/components/dashboard/settings/` (Task 12)
- [ ] Refatorar Profile (Task 13)
- [ ] Refatorar Organization (Task 14)
- [ ] Refatorar WhatsApp settings (Task 15)
- [ ] Refatorar Meta Ads settings (Task 16)

### Phase E — Limpeza (Tasks 17-18)
- [ ] Remover arquivos/rotas obsoletos (Task 17)
- [ ] Validar navegação e permissões (Task 18)

---

## Componentes chave

| Componente | Arquivo | Usado em |
|---|---|---|
| `AppSidebar` | `components/dashboard/sidebar/app-sidebar.tsx` | Todas as páginas |
| `SectionPageShell` | `components/dashboard/layout/section-page-shell.tsx` | Páginas de settings |
| `Sheet` (shadcn) | já instalado | Pipeline drawer |
| `SettingsRow` (novo) | `components/dashboard/settings/settings-row.tsx` | Todas as páginas de settings |

---

## Estrutura final esperada do sidebar (settings mode)

```
Conta
  Perfil

Workspace
  Organização
  Equipe
  Assinatura      ← apenas owner

Canais
  WhatsApp        ← aba "Webhooks" embutida
  Meta Ads

IA
  IA Studio

Governança
  Auditoria       ← apenas admin

Admin             ← apenas admin/owner
  Planos e Cobrança
  Design System   ← apenas owner
```

---

## Estrutura final esperada do sidebar (app mode)

```
Visão Geral
  Dashboard
  Inbox

Captação
  Meta Ads
  Campanhas

CRM
  Leads
  Pipeline
  Vendas

Operação           ← novo grupo
  Catálogo
```

---

## Padrão SettingsRow (referência rápida)

```tsx
<SettingsGroup label="Dados da conta" onSave={handleSave} isDirty={isDirty}>
  <SettingsRow
    label="Nome completo"
    description="Seu nome exibido no sistema"
  >
    <Input value={name} onChange={(e) => setName(e.target.value)} className="w-72" />
  </SettingsRow>
  <SettingsRow label="E-mail" description="Para login e notificações">
    <Input value={email} disabled className="w-72" />
  </SettingsRow>
</SettingsGroup>
```

---

## Teste de smoke pós-implementação

1. `/settings/profile` — campos editáveis, 1 botão Save por grupo
2. `/settings/organization` — logo upload + dados da org, 1 Save por seção
3. `/settings/whatsapp` — aba "Webhooks" visível apenas para admin
4. `/settings/meta-ads` — sem abas, layout limpo
5. `/tickets` — botão "Configurar pipeline" abre Sheet lateral
6. `/catalog` — página funcionando na nova rota
7. Sidebar app mode — item "Catálogo" presente em "Operação"
8. Sidebar settings mode — sem Pipeline, sem Catálogo
9. `/settings` → redireciona para `/settings/profile`
10. Permissões: acessar `/settings/organization` sem permissão → 403/redirect
