# ✅ Checklist de Teste - Rebranding Dashboard

## 🎯 O que testar

Para cada página, verifique:
- [ ] **Visual**: Bordas menos arredondadas (6-12px)
- [ ] **Espaçamento**: Padding consistente entre seções
- [ ] **Dark Mode**: Funciona corretamente (toggle no header)
- [ ] **Loading States**: Spinners/skeletons aparecem corretamente
- [ ] **Empty States**: Mensagens vazias bem formatadas
- [ ] **Responsividade**: Mobile/tablet/desktop

---

## 📄 Páginas Migradas (20 páginas)

### 1. Dashboard & Analytics

#### `/dashboard` (Home)
- [ ] Header com título "Visão Geral" e botão refresh
- [ ] Filtros desktop (5 selects em grid)
- [ ] Filtros mobile (Sheet lateral)
- [ ] Cards de métricas com border-radius menor
- [ ] Gráfico de pizza sem bordas exageradas
- [ ] Espaçamento entre filtros e cards (space-y-6)

#### `/dashboard/analytics`
- [ ] Header "Analytics" com ícone
- [ ] Loading state ao carregar
- [ ] 6 componentes de analytics renderizando

---

### 2. CRUD Pages (CrudPageShell)

#### `/dashboard/items`
- [ ] Layout CrudPageShell (já padronizado)
- [ ] Search + filtros funcionando
- [ ] View switcher (list/cards)

#### `/dashboard/item-categories`
- [ ] Layout CrudPageShell
- [ ] CRUD completo funcionando

#### `/dashboard/leads`
- [ ] Layout CrudPageShell
- [ ] Search funcionando
- [ ] Avatar + nome do lead

#### `/dashboard/sales`
- [ ] Layout CrudPageShell
- [ ] Tabela de vendas

#### `/dashboard/tickets`
- [ ] Layout CrudPageShell
- [ ] 3 views: list, cards, **kanban**
- [ ] Drag & drop no kanban funcionando
- [ ] Filtros de status e data

#### `/dashboard/approvals`
- [ ] Header "Aprovações do Copilot IA"
- [ ] Empty state se sem dados
- [ ] Grid de cards com aprovações

---

### 3. Settings

#### `/dashboard/settings/profile`
- [ ] Header "Meu Perfil"
- [ ] Layout centrado (max-w-3xl)
- [ ] 2 seções: Informações + Senha
- [ ] Cards com sombra sutil

#### `/dashboard/settings/organization`
- [ ] Header "Organização"
- [ ] Layout centrado
- [ ] CompanyDataSection com busca CNPJ

#### `/dashboard/settings/pipeline`
- [ ] Header "Pipeline"
- [ ] Layout centrado
- [ ] Drag & drop de fases funcionando
- [ ] Botão "Adicionar Fase"

#### `/dashboard/settings/audit-logs`
- [ ] Header "Logs de Auditoria"
- [ ] Tabela virtualizada
- [ ] Filtros de período

#### `/dashboard/settings/ai`
- [ ] Header "IA Copilot Studio"
- [ ] Empty state com botão "Criar Primeiro Agente"
- [ ] Grid de cards de agentes (se houver)
- [ ] Loading cards (3 skeletons)

---

### 4. WhatsApp Settings (4 subpáginas)

#### `/dashboard/settings/whatsapp/[phoneId]`
- [ ] InstanceDetail renderizando
- [ ] Loading page ao carregar
- [ ] Header com bandeira do país + número

#### `/dashboard/settings/whatsapp/[phoneId]/settings`
- [ ] Botão "Voltar para Visão Geral"
- [ ] ProfileView renderizando
- [ ] Error state se instância não existe

#### `/dashboard/settings/whatsapp/[phoneId]/templates`
- [ ] TemplatesView renderizando
- [ ] Error state funcionando

#### `/dashboard/settings/whatsapp/[phoneId]/send-test`
- [ ] Botão voltar
- [ ] SendTestView renderizando
- [ ] Formulário de teste

---

### 5. WhatsApp Inbox

#### `/dashboard/whatsapp/inbox`
- [ ] Layout 3 painéis (ResizablePanel)
- [ ] Left: Lista de conversas
- [ ] Middle: Janela de chat
- [ ] Right: Painel de ticket
- [ ] Resize funcionando
- [ ] Empty state no middle quando nada selecionado

---

### 6. Meta Ads

#### `/dashboard/meta-ads`
- [ ] Header "Dashboard ROI Meta Ads"
- [ ] Botão refresh no header
- [ ] 3 cards KPI (Investimento, Receita, ROAS)
- [ ] Gráfico de barras por conta
- [ ] Tabela detalhamento financeiro
- [ ] Alert de dica (se sem dados)

#### `/dashboard/meta-ads/campaigns`
- [ ] Header "Campanhas do Meta"
- [ ] MetaAdsCampaignsClient renderizando

---

### 7. Auth Pages

#### `/sign-in`
- [ ] Layout 2 colunas (branding + form)
- [ ] Dark mode: lado direito muda de cor
- [ ] Logo mobile com brightness correto
- [ ] Campos email + senha
- [ ] Link "Esqueceu?"
- [ ] Link "Criar conta"

#### `/sign-up`
- [ ] Mesmo layout de sign-in
- [ ] Dark mode funcionando

---

## 🎨 Verificações de Design

### Border Radius
- [ ] Cards: `rounded-lg` (12px) - não mais `rounded-2xl`
- [ ] Inputs: `rounded-md` (6px)
- [ ] Buttons: `rounded-md` (6px)
- [ ] Dialogs: `rounded-lg` (12px)

### Espaçamentos
- [ ] PageContent com padding consistente
- [ ] `space-y-6` entre seções principais
- [ ] `gap-4` ou `gap-6` em grids

### Dark Mode
- [ ] Backgrounds: `bg-background` (não hardcoded)
- [ ] Text: `text-foreground` / `text-muted-foreground`
- [ ] Borders: `border-border`
- [ ] Cards: `bg-card` com `text-card-foreground`
- [ ] Auth: lado direito dark

### Typography
- [ ] Headers: títulos claros e hierarquia
- [ ] Descrições: `text-muted-foreground text-sm`
- [ ] Icons: sempre com `className="h-4 w-4"` ou similar

---

## 🐛 Bugs Conhecidos a Verificar

- [ ] Dashboard: espaçamento entre filtros e cards OK?
- [ ] Bordas muito arredondadas removidas?
- [ ] Dark mode funciona em TODAS as páginas?
- [ ] Loading states não quebram layout?
- [ ] Empty states centralizados?

---

## 🚀 Como Testar

```bash
# 1. Rodar dev
npm run dev

# 2. Abrir no navegador
open http://localhost:3000

# 3. Login e testar cada página
# 4. Toggle dark mode (header)
# 5. Testar mobile (DevTools > Responsive)
```

---

## ✅ Quando marcar como Concluído

- [ ] Todas as páginas visitadas e funcionando
- [ ] Dark mode testado em 100% das páginas
- [ ] Mobile testado em páginas principais
- [ ] Sem erros no console
- [ ] Visual aprovado (bordas, espaçamentos, cores)
