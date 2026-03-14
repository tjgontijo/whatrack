# Visual Identity Restore — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar identidade visual neutral-first do dashboard — verde permanece como cor de acento (primary, ring, success, CTA), mas sai dos fundos, superfícies, borders e estados hover.

**Architecture:** Todas as mudanças são em tokens CSS (`globals.css`) e na estrutura JSX da sidebar. Nenhuma lógica de produto é alterada. A sidebar perde o item "Segurança" (hash-link redundante) e ganha um grupo "Admin" separado para itens técnicos de gestão.

**Tech Stack:** Tailwind CSS v4, OKLCH color space, Next.js, shadcn/ui Sidebar

---

## Chunk 1: Tokens de cor — light theme

### Task 1: Neutralizar superfícies do light theme em globals.css

**Files:**
- Modify: `src/app/globals.css`

O problema: todos os tokens de superfície neutra têm `chroma > 0` no hue 150 (verde), o que colore o fundo, as bordas, os estados hover e o texto com um cast esverdeado. Em OKLCH, quando `chroma = 0` o hue é irrelevante — `oklch(L 0 0)` é sempre cinza puro naquele lightness. O verde deve existir apenas em `--primary`, `--ring`, `--success` e tokens de sidebar-primary.

**Tokens que NÃO mudam (verde permanece):**
- `--primary`, `--primary-foreground`
- `--ring`
- `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`
- `--success`, `--success-foreground`
- `--chart-*` (verde como dado, não como UI chrome)
- `--card: oklch(1 0 0)` — já neutro, sem alteração
- `--popover: oklch(1 0 0)` — já neutro, sem alteração

**Mapa exato de mudanças — bloco `:root` em `src/app/globals.css`:**

Buscar cada token pelo nome (não por número de linha) e substituir:

| Token | De | Para | Motivo |
|-------|-----|------|--------|
| `--background` | `oklch(0.975 0.004 150)` | `oklch(0.975 0 0)` | Fundo principal neutro |
| `--foreground` | `oklch(0.13 0.025 155)` | `oklch(0.13 0 0)` | Texto sem cast verde |
| `--card-foreground` | `oklch(0.13 0.025 155)` | `oklch(0.13 0 0)` | Texto em cards neutro |
| `--popover-foreground` | `oklch(0.13 0.025 155)` | `oklch(0.13 0 0)` | Texto em popover neutro |
| `--secondary` | `oklch(0.94 0.012 150)` | `oklch(0.94 0 0)` | Superfície secundária neutra |
| `--secondary-foreground` | `oklch(0.22 0.025 155)` | `oklch(0.22 0 0)` | Texto neutro |
| `--muted` | `oklch(0.94 0.012 150)` | `oklch(0.94 0 0)` | Superfície muted neutra |
| `--muted-foreground` | `oklch(0.44 0.018 155)` | `oklch(0.44 0 0)` | Texto muted neutro (labels, captions, placeholders) |
| `--accent` | `oklch(0.91 0.025 150)` | `oklch(0.92 0 0)` | Hover state neutro (+0.01 lightness intencional para contrast) |
| `--accent-foreground` | `oklch(0.22 0.025 155)` | `oklch(0.22 0 0)` | Texto no hover neutro |
| `--border` | `oklch(0.86 0.012 150)` | `oklch(0.87 0 0)` | Bordas neutras |
| `--input` | `oklch(0.86 0.012 150)` | `oklch(0.87 0 0)` | Input border neutra |
| `--sidebar` | `oklch(0.965 0.008 150)` | `oklch(1 0 0)` | Sidebar branca pura (como no "antes") |
| `--sidebar-foreground` | `oklch(0.13 0.025 155)` | `oklch(0.13 0 0)` | Texto neutro na sidebar |
| `--sidebar-accent` | `oklch(0.91 0.025 150)` | `oklch(0.94 0 0)` | Hover de item: cinza neutro |
| `--sidebar-accent-foreground` | `oklch(0.60 0.20 150)` | `oklch(0.13 0 0)` | Texto no hover: escuro neutro, não verde |
| `--sidebar-border` | `oklch(0.88 0.012 150)` | `oklch(0.90 0 0)` | Borda lateral neutra |

- [ ] **Step 1: Aplicar mudanças no bloco `:root`**

Editar `src/app/globals.css`. Buscar cada token pelo nome exato (ex: `--background:`) e substituir o valor. Aplicar todas as 17 substituições da tabela acima em uma única passagem de edição.

Resultado esperado: o cast esverdeado some do fundo, bordas, texto secundário e hover states. O verde permanece nos CTAs, item ativo da sidebar e success states.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: zero erros de compilação.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: neutralize light theme surfaces — remove green tint from bg, borders and hover states"
```

---

## Chunk 2: Tokens de cor — dark theme

### Task 2: Limpar cast esverdeado no dark theme

**Files:**
- Modify: `src/app/globals.css`

O dark theme usa navy (hue 255) como base, que é adequado e permanece. O problema são os tokens de texto que têm chroma no hue 150 (verde leve nos foregrounds) e o `sidebar-accent-foreground` que é verde saturado no hover.

**Nota sobre `--muted-foreground` no dark:** `oklch(0.65 0.015 200)` usa hue 200 (teal/azul-esverdeado) com chroma muito baixo (0.015). É praticamente neutro e complementa o fundo navy. Mantido intencionalmente.

**Mapa exato de mudanças — bloco `.dark` em `src/app/globals.css`:**

| Token | De | Para | Motivo |
|-------|-----|------|--------|
| `--foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Texto branco puro |
| `--card-foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Idem |
| `--popover-foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Idem |
| `--secondary-foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Idem |
| `--accent-foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Idem |
| `--sidebar-foreground` | `oklch(0.96 0.005 150)` | `oklch(0.96 0 0)` | Texto neutro na sidebar dark |
| `--sidebar-accent-foreground` | `oklch(0.72 0.22 150)` | `oklch(0.96 0 0)` | Hover: near-white, não verde saturado |

- [ ] **Step 1: Aplicar mudanças no bloco `.dark`**

Editar `src/app/globals.css`. Buscar cada token pelo nome exato dentro do bloco `.dark` e substituir. As 7 ocorrências de `oklch(0.96 0.005 150)` dentro de `.dark` devem virar `oklch(0.96 0 0)`. A ocorrência de `oklch(0.72 0.22 150)` em `--sidebar-accent-foreground` deve virar `oklch(0.96 0 0)`.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: neutralize dark theme text tokens — remove green cast from foreground colors"
```

---

## Chunk 3: Sidebar — estrutura e hierarquia

### Task 3: Remover "Segurança", reposicionar itens admin

**Files:**
- Modify: `src/components/dashboard/sidebar/sidebar-client.tsx`

**Problemas a resolver:**

1. **"Segurança" como item separado**: aponta para `/dashboard/settings/profile#seguranca` — hash-anchor da mesma página de Perfil, não uma rota independente. Remove comprimento visual sem remover funcionalidade (o link ainda existe na página de perfil).

2. **Grupo "Configurações" com 10+ itens flat**: mistura itens operacionais com itens técnicos admin-only. Os itens puramente técnicos (Webhooks, Planos e Cobrança, Design System) devem ir para um grupo "Admin" separado, que fica visível apenas para roles `admin` e `owner`.

   **Auditoria permanece em "Configurações"** — é controlada por `canViewWorkspaceItem('view:audit')`, não por role. Movê-la para dentro de um guard de role mudaria o comportamento de acesso. Fica onde está.

**Estrutura final dos grupos na sidebar:**

```
Visão Geral         → Dashboard, Analytics
Captação            → Meta Ads, Mensagens
CRM                 → Projetos, Leads, Tickets, Vendas
Inteligência        → IA Copilot
Configurações       → Perfil, Organização, Equipe, Integrações,
                       Pipeline, IA Studio, Catálogo, Assinatura, Auditoria
Admin               → Webhooks, Planos e Cobrança, Design System
                       (visível apenas para admin/owner)
```

- [ ] **Step 1: Remover item "Segurança"**

Em `src/components/dashboard/sidebar/sidebar-client.tsx`, localizar e remover o bloco `SidebarMenuItem` que contém o link para `/dashboard/settings/profile#seguranca`. É o item com `tooltip="Segurança"` e ícone `Shield`. O bloco inteiro (do `<SidebarMenuItem>` de abertura até o `</SidebarMenuItem>` de fechamento, incluindo o `<SidebarMenuButton>` interno) deve ser removido.

- [ ] **Step 2: Adicionar grupo "Admin" e remover itens movidos do grupo "Configurações" — edição atômica**

Esta etapa é uma única edição no arquivo. Fazer as duas alterações juntas para evitar estado intermediário com itens duplicados.

**2a — Remover do grupo "Configurações" os três blocos a seguir** (localizar pelos tooltips/hrefs):

- Bloco com `tooltip="Webhooks"` e href `/dashboard/settings/webhooks/whatsapp`
- Bloco com `tooltip="Planos e Cobrança"` e href `/dashboard/settings/billing`
- Bloco com `tooltip="Design System"` e href `/dashboard/design-system`

**2b — Adicionar após o fechamento do grupo "Configurações"** (após o `</SidebarGroup>` do grupo Configurações, antes de `</SidebarContent>`):

```tsx
{(session?.user?.role === 'admin' || session?.user?.role === 'owner') ? (
  <SidebarGroup>
    <SidebarGroupLabel>Admin</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith('/dashboard/settings/webhooks')}
            tooltip="Webhooks"
          >
            <Link href="/dashboard/settings/webhooks/whatsapp" onClick={handleNavClick}>
              <Webhook className="h-4 w-4" />
              <span>Webhooks</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith('/dashboard/settings/billing')}
            tooltip="Planos e Cobrança"
          >
            <Link href="/dashboard/settings/billing" onClick={handleNavClick}>
              <CreditCard className="h-4 w-4" />
              <span>Planos e Cobrança</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {session?.user?.role === 'owner' ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith('/dashboard/design-system')}
              tooltip="Design System"
            >
              <Link href="/dashboard/design-system" onClick={handleNavClick}>
                <Paintbrush className="h-4 w-4" />
                <span>Design System</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
) : null}
```

Todos os imports (`Webhook`, `CreditCard`, `Paintbrush`) já existem no arquivo — não adicionar duplicatas.

- [ ] **Step 3: Verificar build e lint**

```bash
npm run lint && npm run build
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/sidebar/sidebar-client.tsx
git commit -m "style(sidebar): remove redundant Segurança item and extract Admin group"
```

---

## Critérios de aceite

- [ ] Dashboard sem cast verde no fundo, nas bordas e nos hovers
- [ ] Sidebar branca (light) / navy (dark) sem tint verde
- [ ] Item ativo da sidebar: verde (via `sidebar-primary`) — mantido ✓
- [ ] Hover de item: cinza neutro (não verde)
- [ ] Texto muted (`--muted-foreground`) neutro no light mode
- [ ] Dark mode: foregrounds brancos puros, hover da sidebar near-white
- [ ] Sidebar sem item "Segurança"
- [ ] Grupo "Admin" separado visível apenas para admin/owner
- [ ] Auditoria permanece em "Configurações" com guard `canViewWorkspaceItem('view:audit')` inalterado
- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → success
