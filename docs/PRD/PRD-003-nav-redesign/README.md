# PRD-012: Nav Redesign — Topbar + Sidebar por Modo

## Sumário

Redesign completo da navegação do dashboard inspirado no layout da OpenAI Platform. A topbar ocupa 100% da largura e controla o **modo ativo** da sidebar (Dashboard vs Configurações). A sidebar exibe menus diferentes conforme o modo selecionado.

## Problema

A sidebar atual mistura navegação da aplicação com configurações em uma única coluna longa, com grupos de labels uppercase pesados. Não há hierarquia visual clara entre "onde estou na aplicação" e "configurações do sistema".

## Solução

```
┌─────────────────────────────────────────────────────────────┐
│  Org Name  /  Project Name        [Dashboard] [⚙] [Avatar]  │  ← Topbar 100% width
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │                                              │
│              │                                              │
│ Modo A:      │     Conteúdo da página                       │
│ • Dashboard  │                                              │
│ • Analytics  │                                              │
│ • Meta Ads   │                                              │
│ • Mensagens  │                                              │
│ • Campanhas  │                                              │
│ • Leads      │                                              │
│ • Tickets    │                                              │
│ • Vendas     │                                              │
│ • IA         │                                              │
│              │                                              │
│ Modo B:      │                                              │
│ • Perfil     │                                              │
│ • Organização│                                              │
│ • Equipe     │                                              │
│ • Integrações│                                              │
│ • Pipeline   │                                              │
│ • IA Studio  │                                              │
│ • Catálogo   │                                              │
│ • Assinatura │                                              │
│ • Auditoria  │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## Topbar — Anatomia

```
[Logo]  Org Name  /  Project Name     [Spacer]     [Dashboard]  [⚙ Settings]  [Avatar]
```

- **Logo + Breadcrumb** (esquerda): clicável, leva ao dashboard raiz
- **Nav Mode Buttons** (direita, antes do avatar): "Dashboard" e ícone de engrenagem — ambos são toggle. O ativo fica highlighted.
- **Avatar** (extremo direito): dropdown com logout, tema, link para perfil

## Comportamento do Modo

| Ação | Resultado |
|---|---|
| Clica "Dashboard" na topbar | Sidebar mostra nav da aplicação. Usuário é redirecionado para a última rota de app visitada (ou `/`) |
| Clica "⚙" na topbar | Sidebar mostra nav de configurações. Usuário é redirecionado para `/settings/profile` |
| Navega para rota `/settings/*` | Modo "⚙" fica ativo automaticamente |
| Navega para rota de app | Modo "Dashboard" fica ativo automaticamente |

## Efeito Visual "Canvas + Folha"

Na referência OpenAI, topbar e sidebar compartilham o **mesmo fundo escuro** (quase preto). O conteúdo principal é uma "folha" branca com `border-radius` no canto superior esquerdo, colocada sobre esse fundo escuro. Um gap entre a sidebar e o main deixa o fundo escuro aparecer como moldura.

```
┌──────────────────────────────────────────────┐  ← fundo escuro (#0a0a0a)
│ TOPBAR (fundo escuro)                        │
├──────────┬───────────────────────────────────┤
│          │  ╭────────────────────────────────┤
│ SIDEBAR  │  │                                │  ← main: fundo branco,
│ (fundo   │  │   conteúdo da página           │    border-radius top-left,
│ escuro)  │  │                                │    gap entre sidebar e main
│          │  │                                │
└──────────┴──┴────────────────────────────────┘
           ↑
        gap ~8px onde o fundo escuro aparece como moldura
```

Implementação:
- `body` / container raiz: `bg-[--color-escuro]` (token semântico, não hardcoded)
- `SidebarInset` (main): `bg-background rounded-tl-xl` com `ml` negativo ou gap gerenciado pelo shadcn/ui
- Topbar e sidebar: fundo herdado do container escuro (sem `bg-background`)

## Métricas de Sucesso

- Sidebar com visual limpo: sem grupos uppercase, sem mistura de app + config
- Topbar em 100% da largura em todas as páginas do dashboard
- Efeito "canvas escuro + folha branca" no main
- Troca de modo sem reload de página
- Zero regressões nas rotas existentes

## Fora do Escopo

- Mudança nas rotas/URLs existentes
- Alteração no sistema de permissões (RBAC)
- Sidebar colapsável (mantém comportamento atual)
- Responsividade mobile (mantém comportamento atual)
