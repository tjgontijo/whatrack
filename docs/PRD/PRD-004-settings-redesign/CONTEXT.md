# CONTEXT — PRD-004: Settings Redesign

## Estado Atual do Código

### Estrutura de arquivos relevantes

```
src/
├── app/(dashboard)/[organizationSlug]/[projectSlug]/
│   ├── settings/
│   │   ├── layout.tsx                    # passthrough simples
│   │   ├── page.tsx                      # re-export de profile/page
│   │   ├── profile/page.tsx              # → ProfileSettingsContent
│   │   ├── organization/page.tsx         # → OrganizationSettingsContent (? ver component)
│   │   ├── team/page.tsx                 # → TeamSettingsContent
│   │   ├── pipeline/page.tsx             # → PipelineSettingsContent
│   │   ├── catalog/page.tsx              # → CatalogPage (itens + categorias)
│   │   ├── ai-studio/page.tsx            # → AiStudioContent
│   │   ├── audit/page.tsx                # → AuditLogsContent
│   │   ├── subscription/page.tsx         # → SubscriptionContent (owner only)
│   │   ├── billing/page.tsx              # admin only
│   │   ├── whatsapp/page.tsx             # → WhatsAppSettingsPage
│   │   ├── whatsapp/[phoneId]/...        # sub-rotas por instância
│   │   ├── meta-ads/page.tsx             # → MetaAdsSettingsContent
│   │   └── webhooks/whatsapp/page.tsx    # → WebhooksContent
│   └── tickets/
│       └── page.tsx                      # → TicketsPage (kanban + list + cards)
│
├── components/dashboard/
│   ├── layout/
│   │   ├── topbar.tsx                    # DashboardTopbar (já implementado, PRD-012)
│   │   ├── dashboard-shell.tsx           # AppSidebar + main
│   │   ├── section-page-shell.tsx        # Header h-12 + tabs + actions (criado nessa sessão)
│   │   ├── page-shell.tsx                # PageShell (usado em settings)
│   │   └── index.ts
│   ├── sidebar/
│   │   └── app-sidebar.tsx              # Sidebar com settingsGroups (já refatorada)
│   └── settings/
│       └── profile-settings-content.tsx  # (e outros)
```

### Sidebar de Settings — estado atual

A `app-sidebar.tsx` já foi refatorada (PRD-012 + sessão atual) e possui:

```typescript
const settingsGroups: NavGroup[] = [
  { label: 'Conta',      items: [Perfil] },
  { label: 'Workspace',  items: [Organização, Equipe, Projetos, Assinatura] },
  { label: 'Canais',     items: [WhatsApp, Meta Ads, Webhooks (admin)] },
  { label: 'Operação',   items: [Pipeline, Catálogo, IA Studio] },
  { label: 'Governança', items: [Auditoria] },
  { label: 'Admin',      items: [Planos e Cobrança (admin), Design System (owner)] },
]
```

### Padrões visuais existentes

**PageShell + PageHeader + PageContent** — usado pela maioria das settings pages atuais:
```tsx
<PageShell maxWidth="3xl">
  <PageHeader title="Perfil" description="..." icon={User} />
  <PageContent>
    {/* conteúdo */}
  </PageContent>
</PageShell>
```

**SectionPageShell** — novo padrão (criado nessa sessão) para telas de app com header fixo:
```tsx
<SectionPageShell title="WhatsApp" tabs={[...]} activeTab={...} onTabChange={...} actions={...}>
  {/* conteúdo */}
</SectionPageShell>
```

**SettingsSection** — componente de seção de settings (usado no Profile):
```tsx
<SettingsSection title="..." description="...">
  <form>
    <input />
    <Button>Salvar</Button>
  </form>
</SettingsSection>
```

### Pipeline — estado atual

`settings/pipeline/page.tsx` → renderiza `PipelineSettingsContent` (ou similar):
- Lista drag-and-drop de estágios
- Cada estágio tem: nome, cor (7 opções), is_default, is_closed
- Ações: criar, editar (dialog), deletar, reordenar
- Mutation via TanStack Query

`tickets/page.tsx` — já usa `CrudPageShell` com view kanban como padrão. Tem botão "Pipeline" no header que poderia abrir um sheet de configuração.

### Catálogo — estado atual

`settings/catalog/page.tsx` → renderiza `CatalogPage`:
- 2 tabs: Itens | Categorias
- Cada tab é uma `CrudDataView` com list/card view, search, filters
- Mutations via drawer (create/edit)
- Usa o mesmo padrão CRUD do resto do app

### Webhooks — estado atual

`settings/webhooks/whatsapp/page.tsx` → configuração técnica de webhook URL
- Exibe URL de webhook atual
- Botão de regenerar token
- É completamente relacionado ao canal WhatsApp

## Permissões Relevantes

```typescript
// requireWorkspacePageAccess options usadas hoje:
profile:       {} (sem permissão = qualquer membro)
organization:  { permissions: 'manage:organization' }
team:          { permissions: 'manage:members' }
pipeline:      { permissions: 'manage:settings' }
catalog:       { permissions: 'manage:items' }
ai-studio:     { permissions: 'manage:ai' }
audit:         { permissions: 'view:audit' }
subscription:  { requireOwner: true }
billing:       { requireAdmin: true }  (presumido)
whatsapp:      { permissions: 'manage:integrations' }
meta-ads:      { permissions: 'manage:integrations' }
webhooks:      { permissions: 'manage:integrations' }
```

## Dependências Críticas

1. **Pipeline drawer** depende de:
   - O componente de configuração de estágios ser extraível
   - O `tickets/page.tsx` já ter `SectionPageShell` (tem — usa `CrudPageShell`)
   - Uma API sheet/drawer disponível (shadcn Sheet — já existe no projeto)

2. **Catálogo como seção do app** depende de:
   - Criar nova rota `/catalog` no app
   - Mover `CatalogPage` para `components/dashboard/catalog/`
   - Adicionar item "Catálogo" na sidebar de app

3. **Webhooks como tab de WhatsApp** depende de:
   - `WhatsAppSettingsPage` suportar tabs (ou usar `SectionPageShell`)
   - A rota `/settings/webhooks/whatsapp` ser redirecionada para `/settings/whatsapp?tab=webhooks` (ou similar)
