---
title: Planejamento de Padronização de CRUDs
description: Migração de todas as telas CRUD para o padrão unificado do sistema
status: planned
priority: high
created: 2026-01-31
---

# Planejamento de Padronização de CRUDs

## Objetivo

Migrar todas as telas que implementam operações CRUD (Create, Read, Update, Delete) para utilizar o **padrão unificado** de componentes localizado em `src/components/dashboard/crud/`.

Este padrão oferece:
- ✅ **Interface consistente** em todo o sistema
- ✅ **Responsividade automática** (desktop, tablet, mobile)
- ✅ **Alternância de visualizações** (lista, cards, kanban)
- ✅ **Paginação padronizada**
- ✅ **Busca e filtros integrados**
- ✅ **Drawer lateral** para edição (melhor UX que modals)
- ✅ **FAB (Floating Action Button)** para criação
- ✅ **Menos código** e manutenção simplificada

---

## Componentes do Padrão CRUD

### 📋 Estrutura Disponível

```
src/components/dashboard/crud/
├── crud-page-shell.tsx           # Container principal com header, toolbar, paginação
├── crud-data-view.tsx            # Wrapper que alterna entre views
├── crud-list-view.tsx            # Visualização em lista
├── crud-card-view.tsx            # Visualização em cards
├── crud-edit-drawer.tsx          # Painel lateral para criar/editar
├── delete-confirm-dialog.tsx    # Confirmação de exclusão
├── view-switcher.tsx             # Botões de troca de visualização
├── types.ts                      # Tipos TypeScript
└── index.ts                      # Exportações
```

### 🎨 Recursos Principais

**CrudPageShell**:
- Header com ícone, título e subtítulo
- Busca com debounce automático
- Filtros customizáveis (desktop e mobile)
- Paginação completa com controles de limite
- Adaptação responsiva automática
- FAB button para "criar novo"

**CrudEditDrawer**:
- Drawer full-height deslizante do lado direito
- Header com ícone e título customizável
- ScrollArea para formulários longos
- Footer fixo com botões de ação
- Estados de loading/saving
- Larguras configuráveis (max-w-xl até max-w-7xl)

**CrudDataView**:
- Alterna automaticamente entre list/cards/kanban
- Passa props automaticamente para os filhos
- Suporta estados vazios personalizados

---

## Análise do Sistema Atual

### 🔍 Telas Identificadas com CRUD

#### 1. **Produtos** `/dashboard/products`
**Arquivo**: `src/components/dashboard/products/products-table.tsx`
**Status**: ❌ Usa padrão antigo (`ResponsiveDataTable`)
**Operações**: CREATE, READ, UPDATE (implícita), DELETE (implícita)
**Complexidade**: Média
- Filtros: busca, status, categoria
- Visualização: table + cards mobile
- Relacionamento: Categories (1:N)

#### 2. **Categorias de Produtos** `/dashboard/products` (tab)
**Arquivo**: `src/components/dashboard/products/categories-table.tsx`
**Status**: ❌ Usa padrão antigo
**Operações**: CREATE, READ, UPDATE, DELETE
**Complexidade**: Baixa
- Filtros: busca, status
- Visualização: table simples

#### 3. **Vendas** `/dashboard/sales`
**Arquivo**: `src/components/dashboard/sales/client-sales-table.tsx`
**Status**: ❌ Usa padrão antigo (`ResponsiveDataTable`)
**Operações**: READ principalmente (visualização)
**Complexidade**: Média
- Filtros: busca, data, status
- Estatísticas: total de vendas, quantidade
- Visualização: table + cards mobile

#### 4. **Leads** `/dashboard/leads`
**Arquivo**: `src/app/dashboard/leads/page.tsx`
**Status**: ⚠️ Usa padrão **customizado** mas similar
**Operações**: CREATE, READ, UPDATE, DELETE
**Complexidade**: Alta
- Usa: `TemplateMainShell`, `LeadsCardView`, `LeadsTableView`
- Filtros: busca, data
- Dialogs: `NewLeadDialog`, `EditLeadDialog`, `DeleteLeadDialog`
- **NOTA**: Este já tem uma estrutura modular, mas não usa o CRUD padrão

#### 5. **WhatsApp Templates** `/dashboard/settings/whatsapp/[phoneId]`
**Arquivo**: `src/features/whatsapp/components/views/templates-view.tsx`
**Status**: 🆕 **Recém-criado** (ainda não padronizado)
**Operações**: CREATE, READ, DELETE
**Complexidade**: Alta
- Usa: Dialog customizado → **precisa migrar para Drawer**
- Prévia em tempo real do WhatsApp
- Validação Meta API
- Variáveis dinâmicas

#### 6. **Configurações de Organização** `/dashboard/settings/organization`
**Arquivo**: `src/app/dashboard/settings/organization/page.tsx`
**Status**: ℹ️ Form simples, não é CRUD
**Operações**: UPDATE apenas (edição de perfil)
**Complexidade**: Baixa
- **Não precisa migrar** (é um form único, não listagem)

#### 7. **Equipe/Time** `/dashboard/settings/team`
**Arquivo**: `src/app/dashboard/settings/team/page.tsx`
**Status**: ⚠️ Desconhecido (precisa verificar)
**Operações**: CREATE, READ, DELETE (convidar/remover membros)

---

## Plano de Migração

### 📊 Priorização

| Tela | Prioridade | Dificuldade | Tempo Estimado |
|------|------------|-------------|----------------|
| **Categorias de Produtos** | 🔴 Alta | Baixa | 2h |
| **Produtos** | 🔴 Alta | Média | 4h |
| **Vendas** | 🟡 Média | Média | 3h |
| **WhatsApp Templates** | 🟡 Média | Alta | 6h |
| **Leads** | 🟢 Baixa | Alta | 8h |
| **Equipe** | 🟢 Baixa | Média | 3h |

**Total Estimado**: ~26 horas

---

### 🚀 Fases de Implementação

#### **Fase 1: Validação do Padrão** (✅ Concluído)
- [x] Componente padrão criado e testado
- [x] Documentação de tipos
- [x] Exemplos de uso em produção

#### **Fase 2: Quick Wins** (Prioridade Alta)
**Objetivo**: Migrar telas simples para validar o padrão

1. **Categorias de Produtos** (2h)
   - Criar `src/features/products/categories/categories-crud.tsx`
   - Migrar filtros e busca
   - Implementar `CrudEditDrawer` para criar/editar
   - Usar `CrudCardView` para mobile

2. **Produtos** (4h)
   - Criar `src/features/products/products-crud.tsx`
   - Migrar lógica de filtros complexos (status + categoria)
   - Implementar drawer com relacionamento de categorias
   - Manter estatísticas do header

#### **Fase 3: Refatoração Complexa** (Prioridade Média)

3. **Vendas** (3h)
   - Migrar para `src/features/sales/sales-crud.tsx`
   - Implementar filtros de data avançados
   - Manter estatísticas (total vendas + quantidade)
   - Adaptar `SaleCard` para o padrão

4. **WhatsApp Templates** (6h)
   - **Substituir Dialog por Drawer lateral** (`CrudEditDrawer`)
   - Manter layout split-screen (form + preview)
   - Adaptar `TemplatePreview` para dentro do drawer
   - Melhorar cards de template na listagem
   - Adicionar ações de edição/exclusão no card

#### **Fase 4: Alinhamento Avançado** (Prioridade Baixa)

5. **Leads** (8h)
   - Avaliar se vale migrar (já tem padrão próprio funcional)
   - Se migrar: criar `src/features/leads/leads-crud.tsx`
   - Preservar funcionalidades de kanban
   - Migrar dialogs para drawers

6. **Equipe/Time** (3h)
   - Investigar implementação atual
   - Criar padrão para gerenciamento de usuários
   - Implementar convites e permissões

---

## Especificação Técnica

### 🔧 Template de Migração

Cada migração deve seguir este padrão:

```tsx
'use client'

import React, { useState } from 'react'
import { Package } from 'lucide-react' // Ícone apropriado
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    CrudPageShell,
    CrudDataView,
    CrudListView,
    CrudCardView,
    CrudEditDrawer,
    DeleteConfirmDialog,
    type ViewType,
    type ColumnDef,
    type CardConfig,
} from '@/components/dashboard/crud'

export function MyCrudPage() {
    const queryClient = useQueryClient()
    
    // Estado de visualização
    const [view, setView] = useState<ViewType>('cards')
    
    // Estado de busca e filtros
    const [searchInput, setSearchInput] = useState('')
    
    // Paginação
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    
    // Drawer de edição
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<MyType | null>(null)
    
    // Dialog de exclusão
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<MyType | null>(null)

    // Queries
    const { data, isLoading } = useQuery({
        queryKey: ['my-items', searchInput, page, limit],
        queryFn: () => fetchMyItems({ search: searchInput, page, limit }),
    })

    // Mutations
    const createMutation = useMutation({
        mutationFn: createItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-items'] })
            setEditDrawerOpen(false)
        }
    })

    // Definição de colunas para lista
    const columns: ColumnDef<MyType>[] = [
        {
            key: 'name',
            label: 'Nome',
            render: (item) => item.name,
        },
        // ... outras colunas
    ]

    // Configuração de cards
    const cardConfig: CardConfig<MyType> = {
        title: (item) => item.name,
        subtitle: (item) => item.description,
        badge: (item) => <Badge>{item.status}</Badge>,
        // ... outras configs
    }

    return (
        <>
            <CrudPageShell
                title="Meus Itens"
                subtitle="Gerencie seus itens aqui"
                icon={Package}
                view={view}
                setView={setView}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                page={page}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                totalItems={data?.total || 0}
                totalPages={Math.ceil((data?.total || 0) / limit)}
                hasMore={(data?.total || 0) > page * limit}
                onAdd={() => {
                    setItemToEdit(null)
                    setEditDrawerOpen(true)
                }}
                filters={
                    // Filtros customizados aqui
                }
                isLoading={isLoading}
            >
                <CrudDataView
                    data={data?.items || []}
                    columns={columns}
                    cardConfig={cardConfig}
                    onEdit={(item) => {
                        setItemToEdit(item)
                        setEditDrawerOpen(true)
                    }}
                    onDelete={(item) => {
                        setItemToDelete(item)
                        setDeleteDialogOpen(true)
                    }}
                />
            </CrudPageShell>

            <CrudEditDrawer
                open={editDrawerOpen}
                onOpenChange={setEditDrawerOpen}
                title={itemToEdit ? 'Editar Item' : 'Novo Item'}
                subtitle="Preencha os campos abaixo"
                icon={Package}
                onSave={() => {
                    // Submit form
                }}
                isSaving={createMutation.isPending}
            >
                {/* Formulário aqui */}
            </CrudEditDrawer>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Excluir Item?"
                description={`Tem certeza que deseja excluir ${itemToDelete?.name}?`}
                onConfirm={() => {
                    // Deletar
                }}
            />
        </>
    )
}
```

---

## Checklist de Migração

Para cada tela, garantir:

### ✅ Funcionalidades Obrigatórias
- [ ] Busca com debounce funcionando
- [ ] Filtros preservados (se existiam)
- [ ] Paginação completa
- [ ] Alternância de views (lista/cards)
- [ ] Criação via drawer lateral
- [ ] Edição via drawer lateral
- [ ] Exclusão com confirmação
- [ ] Estados de loading
- [ ] Estados vazios (empty state)
- [ ] Responsividade mobile

### ✅ Testes de Qualidade
- [ ] Navegação entre páginas
- [ ] Persistência de filtros na URL
- [ ] Sem regressões visuais
- [ ] Performance de listagem
- [ ] Invalidação de cache correta

### ✅ Documentação
- [ ] Comentários em código complexo
- [ ] Tipos TypeScript completos
- [ ] Atualizar storybook (se houver)

---

## Benefícios Esperados

### 📈 Métricas de Sucesso

1. **Redução de Código**
   - Estimativa: -30% de linhas de código por tela
   - Menos duplicação de lógica

2. **Consistência**
   - 100% das telas CRUD com mesma UX
   - Facilita onboarding de novos devs

3. **Manutenibilidade**
   - Correções centralizadas
   - Evolução do padrão beneficia todas as telas

4. **Performance**
   - Otimizações aplicadas globalmente
   - Lazy loading padronizado

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebra de funcionalidades existentes | Média | Alto | Testes minuciosos + rollback plan |
| Resistência da equipe | Baixa | Médio | Documentação clara + exemplos |
| Overhead de refatoração | Alta | Médio | Priorização por valor |
| Dívida técnica em padrão antigo | Alta | Baixo | Depreciar gradualmente |

---

## Próximos Passos

### 🎯 Ação Imediata
1. **WhatsApp Templates** - Já está em desenvolvimento, precisa:
   - Substituir Sheet por `CrudEditDrawer`
   - Adaptar preview para caber no drawer
   - Integrar com `CrudPageShell`

2. **Categorias de Produtos** - Quick win para validar:
   - Implementação completa em 2h
   - Primeira tela no padrão novo

### 📅 Cronograma Sugerido

**Semana 1**: WhatsApp Templates + Categorias  
**Semana 2**: Produtos + Vendas  
**Semana 3**: Leads (avaliar necessidade)  
**Semana 4**: Equipe + refinamentos  

---

## Notas Técnicas

### Diferenças entre Padrões

**Antigo** (`ResponsiveDataTable`):
- Foco em tabelas responsivas
- Menos configurável
- Paginação limitada
- Sem alternância de views

**Novo** (`CrudPageShell`):
- Container completo (header + toolbar + paginação)
- Altamente configurável
- Múltiplas visualizações
- FAB automático
- Mobile-first

### Compatibilidade

- ✅ React 19
- ✅ Next.js 15 App Router
- ✅ TanStack Query v5
- ✅ Shadcn/ui components
- ✅ TypeScript strict mode

---

## Referências

- **Padrão CRUD**: `src/components/dashboard/crud/`
- **Exemplo em Produção**: (aguardando primeira migração)
- **Design System**: Shadcn/ui
- **Inspiração**: Stripe Dashboard, Notion, Linear

---

**Última Atualização**: 2026-01-31  
**Responsável**: Time de Desenvolvimento  
**Status**: 🟡 Planejamento Aprovado
