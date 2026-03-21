# TASKS — PRD-004: Settings Redesign

## Ordem de Execução

```
Fase A: Estrutural (sidebar + rotas)
  Task 1 → Corrigir sidebar de settings (grupos, permissões, Projetos)
  Task 2 → Mover Webhooks para tab de WhatsApp
  Task 3 → Redirecionar rota legada de webhooks

Fase B: Pipeline para drawer
  Task 4 → Extrair PipelineStagesManager para componente reutilizável
  Task 5 → Criar PipelineConfigSheet (shadcn Sheet com stages manager)
  Task 6 → Integrar sheet no header da página de Pipeline (tickets)
  Task 7 → Remover página settings/pipeline + redirecionar rota

Fase C: Catálogo para o app
  Task 8 → Criar rota /catalog no app
  Task 9 → Mover CatalogPage para components/dashboard/catalog/
  Task 10 → Adicionar Catálogo na sidebar de app
  Task 11 → Remover página settings/catalog + redirecionar rota

Fase D: Padrão visual (SettingsRow)
  Task 12 → Criar componente SettingsRow + SettingsGroup
  Task 13 → Aplicar SettingsRow em Profile
  Task 14 → Aplicar SettingsRow em Organization
  Task 15 → Converter WhatsApp settings para SectionPageShell
  Task 16 → Converter Meta Ads settings para SectionPageShell

Fase E: Limpeza e validação
  Task 17 → Remover imports e arquivos órfãos
  Task 18 → Validação final (lint + build + checklist)
```

---

## FASE A — Estrutural

### Task 1: Corrigir sidebar de settings

**Files:**
- Modify: `src/components/dashboard/sidebar/app-sidebar.tsx`

**O que fazer:**

Reorganizar `settingsGroups` para refletir a nova estrutura:

```typescript
const settingsGroups: NavGroup[] = [
  {
    label: 'Conta',
    items: [
      { title: 'Perfil', href: `${basePath}/settings/profile`, icon: 'UserCircle',
        activePatterns: [`${basePath}/settings`, `${basePath}/settings/profile`] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { title: 'Organização', href: `${basePath}/settings/organization`, icon: 'Building2',
        permission: 'manage:organization' },
      { title: 'Equipe', href: `${basePath}/settings/team`, icon: 'Users',
        permission: 'manage:members' },
    ],
  },
  {
    label: 'Canais',
    items: [
      { title: 'WhatsApp', href: `${basePath}/settings/whatsapp`, icon: 'WhatsApp',
        permission: 'manage:integrations',
        activePatterns: [`${basePath}/settings/whatsapp`, `${basePath}/settings/webhooks`] },
      { title: 'Meta Ads', href: `${basePath}/settings/meta-ads`, icon: 'Meta',
        permission: 'manage:integrations' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { title: 'IA Studio', href: `${basePath}/settings/ai-studio`, icon: 'Bot',
        permission: 'manage:ai',
        activePatterns: [`${basePath}/settings/ai-studio`, `${basePath}/settings/ai`] },
    ],
  },
  {
    label: 'Governança',
    items: [
      { title: 'Auditoria', href: `${basePath}/settings/audit`, icon: 'ScrollText',
        permission: 'view:audit' },
      // Assinatura aparece aqui, apenas para owners
      ...(isOwnerUser
        ? [{ title: 'Assinatura', href: `${basePath}/settings/subscription`,
             icon: 'ShoppingBag' } satisfies NavItem]
        : []),
    ],
  },
  // Grupo Admin: visível apenas para admin/owner
  ...(isAdminUser
    ? [{
        label: 'Admin',
        items: [
          { title: 'Planos e Cobrança', href: `${basePath}/settings/billing`,
            icon: 'CreditCard' } satisfies NavItem,
          ...(isOwnerUser
            ? [{ title: 'Design System', href: `${basePath}/design-system`,
                 icon: 'Paintbrush' } satisfies NavItem]
            : []),
        ],
      }]
    : []),
]
```

**Remover:**
- Item "Projetos" de settingsGroups (vai para discussão separada — por ora remover de ambos os lados para evitar confusão)
- Item "Webhooks" de settingsGroups (vai para tab de WhatsApp)
- Items "Pipeline" e "Catálogo" de settingsGroups (serão removidos nas tarefas seguintes)

**Atenção:** `isOwnerUser` e `isAdminUser` já estão definidos no componente. Verificar que `ShoppingBag` está no ICON_MAP.

**Verification:**
- Sidebar de settings mostra apenas: Perfil | Org, Equipe | WhatsApp, Meta Ads | IA Studio | Auditoria, Assinatura(owner) | Admin section(admin+)
- Pipeline e Catálogo não aparecem mais em settings
- Assinatura visível apenas para owner
- Admin section visível apenas para admin/owner

---

### Task 2: Mover Webhooks para tab de WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/page.tsx`
- Modify: `src/components/dashboard/whatsapp/settings/whatsapp-settings-page.tsx`

**O que fazer:**

A página de WhatsApp settings (`/settings/whatsapp`) atualmente renderiza `WhatsAppSettingsPage` diretamente via `SectionPageShell`.

Adicionar uma segunda tab "Webhook" que renderiza o conteúdo da página de webhooks:

```tsx
// settings/whatsapp/page.tsx
// Importar também o conteúdo de webhooks
import { WebhooksWhatsAppContent } from '@/components/dashboard/webhooks/webhooks-whatsapp-content'

export default async function SettingsWhatsAppPage() {
  const access = await requireWorkspacePageAccess({ permissions: 'manage:integrations' })
  return <WhatsAppSettingsHub organizationId={access.organizationId} />
}
```

Criar `WhatsAppSettingsHub` como client component com `SectionPageShell`:
```tsx
'use client'
// Tabs: 'instancias' | 'webhook'
// Tab ativa via useState (sem URL param)
// Ação no header: botão "+ Conectar" apenas na tab instâncias
```

**Atenção:** Extrair o conteúdo de `settings/webhooks/whatsapp/page.tsx` para um componente reutilizável `WebhooksWhatsAppContent` antes de referenciar aqui.

**Verification:**
- `/settings/whatsapp` mostra duas tabs: "Instâncias" e "Webhook"
- Tab "Webhook" exibe o mesmo conteúdo de antes
- Permissão `manage:integrations` continua protegendo a rota

---

### Task 3: Redirecionar rota legada de webhooks

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/webhooks/whatsapp/page.tsx`

**O que fazer:**

```tsx
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ organizationSlug: string; projectSlug: string }> }

export default async function WebhooksRedirectPage({ params }: Props) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/settings/whatsapp`)
}
```

**Atenção:** Não precisa de `requireWorkspacePageAccess` aqui — o redirect é imediato e a página destino tem a própria proteção.

**Verification:**
- Navegar para `/settings/webhooks/whatsapp` redireciona para `/settings/whatsapp`
- Nenhum 404

---

## FASE B — Pipeline para Drawer

### Task 4: Extrair PipelineStagesManager

**Files:**
- Read: componente atual de settings de pipeline (provavelmente em `src/components/dashboard/pipeline/` ou `src/components/dashboard/settings/`)
- Create ou Modify: `src/components/dashboard/pipeline/pipeline-stages-manager.tsx`

**O que fazer:**

Identificar o componente atual que renderiza a lista de etapas (drag-and-drop, CRUD de estágios). Extrair para um componente autônomo `PipelineStagesManager` que:
- Aceita `organizationId` como prop
- Gerencia o próprio estado (TanStack Query para fetch, mutations para CRUD)
- Não depende de nenhum shell/layout pai
- Pode ser renderizado dentro de um Sheet ou numa página

```tsx
// Assinatura do componente resultante
export function PipelineStagesManager({ organizationId }: { organizationId: string }) {
  // Mesma lógica do componente atual, mas sem PageShell wrapper
}
```

**Atenção:** NÃO alterar a lógica de negócio ou as queries/mutations. Apenas extrair o "interior" do componente atual para um que seja portável.

**Verification:**
- Componente renderiza a lista de estágios de forma autônoma
- TypeScript sem erros
- Mutations funcionam (invalidam `['ticket-stages']`)

---

### Task 5: Criar PipelineConfigSheet

**Files:**
- Create: `src/components/dashboard/pipeline/pipeline-config-sheet.tsx`

**O que fazer:**

```tsx
'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PipelineStagesManager } from './pipeline-stages-manager'

interface PipelineConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

export function PipelineConfigSheet({ open, onOpenChange, organizationId }: PipelineConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurar Pipeline</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <PipelineStagesManager organizationId={organizationId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Verification:**
- Sheet abre e fecha corretamente
- `PipelineStagesManager` renderiza dentro do Sheet sem overflow
- Botão fechar (X) do Sheet funciona

---

### Task 6: Integrar PipelineConfigSheet na página de tickets

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/tickets/page.tsx`

**O que fazer:**

1. Importar `PipelineConfigSheet` e `useRequiredProjectRouteContext`
2. Adicionar state `const [configOpen, setConfigOpen] = useState(false)`
3. Adicionar botão "Configurar" no `CrudPageShell` (via prop `actions` ou similar — verificar como `CrudPageShell` aceita ações customizadas)
4. Renderizar `<PipelineConfigSheet>` no final do JSX

```tsx
// No header do CrudPageShell, adicionar um botão ghost/outline:
<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setConfigOpen(true)}>
  <Settings className="h-3.5 w-3.5" />
  Configurar
</Button>

// No final, antes do fechamento do fragment:
<PipelineConfigSheet
  open={configOpen}
  onOpenChange={setConfigOpen}
  organizationId={organizationId}
/>
```

**Atenção:** Verificar como o `CrudPageShell` da página de tickets suporta ações customizadas no header. Pode ser necessário usar um prop `headerActions` ou similar.

**Verification:**
- Botão "Configurar" visível no header da tela de Pipeline
- Clicar abre o Sheet lateral
- Alterar um estágio e fechar → kanban reflte a mudança (re-fetch de `ticket-stages`)

---

### Task 7: Remover settings/pipeline

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/pipeline/page.tsx`

**O que fazer:**

Substituir conteúdo por redirect:

```tsx
import { redirect } from 'next/navigation'
type Props = { params: Promise<{ organizationSlug: string; projectSlug: string }> }

export default async function PipelineSettingsRedirect({ params }: Props) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/tickets`)
}
```

**Atenção:** Redirecionar para a página de Pipeline no app, não para um 404.

**Verification:**
- `/settings/pipeline` redireciona para `/tickets`
- Item "Pipeline" não aparece mais na sidebar de settings

---

## FASE C — Catálogo para o App

### Task 8: Criar rota /catalog no app

**Files:**
- Create: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/catalog/page.tsx`

**O que fazer:**

```tsx
import { CatalogPageContent } from '@/components/dashboard/catalog/catalog-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function CatalogPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:items' })
  return <CatalogPageContent />
}
```

**Atenção:** `CatalogPageContent` será criado na Task 9.

---

### Task 9: Mover CatalogPage para components/dashboard/catalog/

**Files:**
- Read: conteúdo atual de `settings/catalog/page.tsx` e o componente que ele renderiza
- Create: `src/components/dashboard/catalog/catalog-page-content.tsx`
- Modify (ou manter): arquivos de subcomponentes do catálogo

**O que fazer:**

1. Identificar onde está o componente atual de catálogo (provavelmente `src/components/dashboard/settings/catalog/` ou similar)
2. Mover ou criar wrapper `CatalogPageContent` em `src/components/dashboard/catalog/`
3. O componente deve usar `SectionPageShell` com tabs (Itens | Categorias) e ações no header
4. A lógica interna (CrudDataView, drawers, queries) não deve mudar

```tsx
'use client'
// SectionPageShell com:
// - title: "Catálogo"
// - tabs: [{ key: 'items', label: 'Itens' }, { key: 'categories', label: 'Categorias' }]
// - actions: botão "Novo item" ou "Nova categoria" dependendo da tab ativa
```

**Atenção:** Verificar se `ItemsTable` e `CategoriesTable` precisam de `organizationId` — se sim, buscar do contexto via `useRequiredProjectRouteContext`.

**Verification:**
- Componente renderiza as duas tabs com conteúdo correto
- CRUD (criar, editar, deletar) funciona normalmente

---

### Task 10: Adicionar Catálogo na sidebar de app

**Files:**
- Modify: `src/components/dashboard/sidebar/app-sidebar.tsx`

**O que fazer:**

Adicionar item no grupo "CRM" (ou criar grupo "Operação" se fizer mais sentido):

```typescript
{ title: 'Catálogo', href: `${basePath}/catalog`, icon: 'Package', permission: 'manage:items' }
```

Posição sugerida: entre Vendas e o fim do grupo CRM.

**Verification:**
- "Catálogo" aparece na sidebar de app para usuários com `manage:items`
- Link leva para `/catalog`
- Item ativo quando na rota `/catalog`

---

### Task 11: Remover settings/catalog

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/catalog/page.tsx`

**O que fazer:**

Substituir por redirect para nova rota:

```tsx
import { redirect } from 'next/navigation'
type Props = { params: Promise<{ organizationSlug: string; projectSlug: string }> }

export default async function CatalogSettingsRedirect({ params }: Props) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/catalog`)
}
```

**Verification:**
- `/settings/catalog` redireciona para `/catalog`
- Item não aparece mais na sidebar de settings

---

## FASE D — Padrão Visual

### Task 12: Criar SettingsRow + SettingsGroup

**Files:**
- Create: `src/components/dashboard/settings/settings-row.tsx`
- Modify: `src/components/dashboard/layout/index.ts` (ou arquivo de index de settings components)

**O que fazer:**

```tsx
// settings-row.tsx

interface SettingsRowProps {
  title: string
  description?: string
  children: React.ReactNode
  /** Renderiza uma linha divisória abaixo */
  separator?: boolean
}

export function SettingsRow({ title, description, children, separator = true }: SettingsRowProps) {
  return (
    <>
      <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-8">
        {/* Esquerda: label + descrição */}
        <div className="w-full sm:w-72 shrink-0">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
          )}
        </div>
        {/* Direita: controle (input, toggle, select, etc.) */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
      {separator && <div className="border-border border-b" />}
    </>
  )
}

interface SettingsGroupProps {
  title?: string
  description?: string
  /** Ação opcional no header do grupo (ex: botão salvar) */
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsGroup({ title, description, action, children }: SettingsGroupProps) {
  return (
    <div className="py-6">
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
```

**Padrão de uso esperado:**

```tsx
<SettingsGroup
  title="Informações pessoais"
  action={<Button size="sm" onClick={handleSave} disabled={!isDirty}>Salvar</Button>}
>
  <SettingsRow title="Nome" description="Seu nome completo">
    <Input value={name} onChange={e => setName(e.target.value)} />
  </SettingsRow>
  <SettingsRow title="E-mail" description="Endereço de e-mail da conta">
    <Input value={email} onChange={e => setEmail(e.target.value)} />
  </SettingsRow>
  <SettingsRow title="Telefone" separator={false}>
    <Input value={phone} onChange={e => setPhone(e.target.value)} />
  </SettingsRow>
</SettingsGroup>
```

**Regra chave:** Um único botão "Salvar" por `SettingsGroup`, não por `SettingsRow`. Campos relacionados compartilham o mesmo save.

**Verification:**
- Componente renderiza com layout responsivo correto (coluna em mobile, linha em desktop)
- Separadores aparecem entre rows
- Sem botão de save duplicado

---

### Task 13: Aplicar SettingsRow em Profile

**Files:**
- Read + Modify: `src/components/dashboard/settings/profile-settings-content.tsx`

**O que fazer:**

1. Ler o componente atual para entender quais campos e seções existem
2. Agrupar campos relacionados em `SettingsGroup`:
   - Grupo 1: "Informações pessoais" → Nome, E-mail, Telefone, Avatar — 1 botão salvar
   - Grupo 2: "Segurança" → Senha atual, Nova senha, Confirmar — 1 botão salvar separado
3. Substituir `SettingsSection` customizado por `SettingsGroup + SettingsRow`
4. Manter toda a lógica de mutation (sem alterar como os dados são salvos)

**Atenção:**
- Validação (Zod, react-hook-form, ou useState + manual) deve continuar funcionando
- Estado dirty (`isDirty`) para habilitar/desabilitar o botão salvar
- Avatar upload (se existir) pode precisar de tratamento especial dentro de SettingsRow

**Verification:**
- Profile page com visual consistente com SettingsRow
- Apenas 2 botões "Salvar" (um por grupo)
- Funcionalidade de atualizar perfil e senha mantida

---

### Task 14: Aplicar SettingsRow em Organization

**Files:**
- Read + Modify: componente de organization settings

**O que fazer:**

1. Ler o componente atual (CNPJ lookup + dados da empresa)
2. Estruturar como `SettingsGroup + SettingsRow`:
   - Grupo "Dados da empresa": CNPJ (com lookup), Razão Social, Nome Fantasia
   - O lookup de CNPJ fica no `children` do `SettingsRow` para CNPJ — pode ter seu estado interno de loading/preview sem afetar o padrão
3. Um botão "Salvar" por grupo

**Atenção:** O fluxo de lookup de CNPJ pode continuar com seu estado interno de preview/confirm, mas deve ser encapsulado dentro do `children` do `SettingsRow`, sem mudar o padrão externo do form.

**Verification:**
- Organization page com SettingsRow
- Lookup de CNPJ continua funcionando
- Salvar dados continua funcionando

---

### Task 15: Converter WhatsApp settings para SectionPageShell

**Files:**
- Modify: componente `WhatsAppSettingsHub` (criado na Task 2)

**O que fazer:**

Garantir que a página de WhatsApp settings usa `SectionPageShell`:
- Title: "WhatsApp"
- Tabs: `[{ key: 'instances', label: 'Instâncias' }, { key: 'webhook', label: 'Webhook' }]`
- Actions: botão "+ Conectar instância" apenas na tab instâncias

O conteúdo interno de cada tab não precisa mudar.

**Verification:**
- Header h-12 com título "WhatsApp" e pills de tab
- Tab "Instâncias" mostra lista de instâncias
- Tab "Webhook" mostra configuração de webhook

---

### Task 16: Converter Meta Ads settings para SectionPageShell

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/meta-ads/page.tsx`
- Modify: `src/components/dashboard/meta-ads/settings/meta-ads-settings-content.tsx`

**O que fazer:**

Extrair o conteúdo de `MetaAdsSettingsContent` para que seja compatível com `SectionPageShell`.

A página de Meta Ads não tem tabs — então use `SectionPageShell` sem tabs (já suportado após mudança de tabs opcional):

```tsx
<SectionPageShell title="Meta Ads">
  <MetaAdsSettingsContent organizationId={access.organizationId} />
</SectionPageShell>
```

Remover o wrapper raw div com min-height customizado do `MetaAdsSettingsContent`.

**Verification:**
- Meta Ads page com header h-12 e título "Meta Ads"
- Conteúdo interno sem min-height hardcoded
- Funcionalidade de conectar conta mantida

---

## FASE E — Limpeza e Validação

### Task 17: Remover imports e arquivos órfãos

**Files:**
- Verify + potentially delete: arquivos de componentes não mais referenciados
- Modify: quaisquer index.ts que exportem componentes removidos

**O que fazer:**

1. Verificar se algum componente de settings (Pipeline, Catalog) ficou órfão após as moves
2. Verificar se `SettingsSection` antigo ainda é usado em algum lugar além de Profile/Org (se não, pode ser removido)
3. Verificar se há imports de `settings/pipeline` ou `settings/catalog` em outros arquivos

```bash
# Comandos de verificação antes de deletar
grep -r "PipelineSettings\|settings/pipeline" src/ --include="*.tsx" --include="*.ts"
grep -r "CatalogPage\|settings/catalog" src/ --include="*.tsx" --include="*.ts"
grep -r "SettingsSection" src/ --include="*.tsx" --include="*.ts"
```

**Verification:**
- `npm run build` sem erros
- Nenhum import quebrado

---

### Task 18: Validação Final

**O que fazer:**

1. `npm run lint` — 0 erros
2. `npm run build` — build bem-sucedido
3. Checklist visual e funcional:

**Sidebar de Settings:**
- [ ] Conta: Perfil
- [ ] Workspace: Organização, Equipe
- [ ] Canais: WhatsApp, Meta Ads
- [ ] Inteligência: IA Studio
- [ ] Governança: Auditoria + Assinatura (owner only)
- [ ] Admin section visível apenas para admin/owner
- [ ] Pipeline e Catálogo NÃO aparecem em settings
- [ ] Webhooks NÃO aparece como item separado

**Sidebar de App:**
- [ ] Catálogo aparece no app (com permissão manage:items)

**Funcionalidades:**
- [ ] Pipeline configurável via sheet na tela de kanban
- [ ] Webhook de WhatsApp acessível na tab de WhatsApp
- [ ] Rota /settings/webhooks/whatsapp → redireciona para /settings/whatsapp
- [ ] Rota /settings/pipeline → redireciona para /tickets
- [ ] Rota /settings/catalog → redireciona para /catalog
- [ ] Profile com SettingsRow: 2 grupos, 2 botões salvar
- [ ] Organization com SettingsRow: CNPJ lookup funciona
- [ ] WhatsApp settings com SectionPageShell e 2 tabs
- [ ] Meta Ads settings com SectionPageShell

**Permissões:**
- [ ] Assinatura invisível para não-owners
- [ ] Admin section invisível para membros normais
- [ ] Catálogo no app: apenas para manage:items
