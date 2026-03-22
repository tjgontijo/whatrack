# CONTEXT — PRD-016
# WhatsApp Settings — Spec Completo de Telas

---

## URL e Estrutura

**URL principal:** `https://whatrack.com/[org]/[project]/settings/whatsapp`

Esta é a única página de entrada para toda a gestão de WhatsApp do projeto.
Usa o padrão `HeaderPageShell` + `HeaderTabs` já existente no projeto.

**Sub-páginas mantidas (acesso direto por URL, não linkadas da UI principal):**
- `/settings/whatsapp/[phoneId]` — detalhes avançados da instância (pode ser acessada via link interno)
- `/settings/whatsapp/[phoneId]/templates/[templateId]` — editor full-screen de template

---

## Layout Geral — HeaderPageShell

```
┌─────────────────────────────────────────────────────────────────┐
│  WhatsApp        [Conta] [Templates] [Webhook*]        [ações]  │  ← HeaderPageShell
│  ─────────────────────────────────────────────────────────────  │  ← HeaderTabs abaixo do título
│                                                                  │
│  [conteúdo da tab ativa]                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Padrão de header por tab:**

| Tab | Search | Filtros | Ação Primária | Refresh |
|-----|--------|---------|---------------|---------|
| Conta | — | — | "Conectar WhatsApp" (sem instância) / "Enviar Teste" (conectada) | ✓ |
| Templates | "Buscar template..." | Categoria + Status | "+ Novo Template" | ✓ |
| Webhook | — | Tipo de Evento + Período | — | ✓ |

**Visibilidade das tabs:**
- `Conta` → todos os membros do projeto
- `Templates` → todos os membros do projeto
- `Webhook` → apenas `role === 'admin' || role === 'owner'` (SaaS level)

---

## TAB 1 — Conta

### Estado: Sem instância conectada

```
┌─────────────────────────────────────────────────────────────────┐
│   [ícone WhatsApp grande]                                       │
│   Nenhum número conectado                                       │
│   Conecte um número WhatsApp Business para começar.             │
│                                                                  │
│   [Conectar WhatsApp]  ← botão primário, abre onboarding Meta  │
└─────────────────────────────────────────────────────────────────┘
```

### Estado: Instância conectada

Layout vertical, sem sub-tabs:

```
┌─────────────────────────────────────────────────────────────────┐
│  [🇧🇷] +55 11 4863 5262    Prof Didática                       │
│         [● Conectado]  [⚡ Alta Qualidade]  [SANDBOX?]          │  ← badges
│         Phone ID: 1036641... │ WABA ID: 123...                  │
│                                               [Enviar Teste →]  │
├─────────────────────────────────────────────────────────────────┤
│  [Alert: Ação Requerida — Ativar Número]  (se não CONNECTED)   │
├─────────────────────────────────────────────────────────────────┤
│  PERFIL COMERCIAL                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [foto]   Prof Didática                [badge: Educação]  │  │
│  │          "Aulas de reforço e preparação para..."         │  │
│  │          ✉ contato@profdidatica.com.br                   │  │
│  │          🌐 profdidatica.com.br                          │  │
│  │          📍 São Paulo, SP                                │  │
│  │                          [→ Editar no Business Manager]  │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  CAPACIDADE DE ENVIO                                            │
│  Tier Standard · 1.000 msgs/dia · Cloud API · Live             │
└─────────────────────────────────────────────────────────────────┘
```

**Badges no header da instância:**
- `status`:
  - `CONNECTED` → badge verde "Conectado"
  - `DISCONNECTED` → badge vermelho "Desconectado"
  - `FLAGGED` → badge laranja "Sinalizado"
  - `PENDING` → badge cinza "Pendente"
  - `RESTRICTED` → badge vermelho "Restrito"
- `quality_rating`:
  - `GREEN` → badge verde "Alta Qualidade"
  - `YELLOW` → badge amarelo "Qualidade Média"
  - `RED` → badge vermelho "Qualidade Baixa"
  - `UNKNOWN` → não exibe
- `account_mode`:
  - `SANDBOX` → badge outline "SANDBOX" (só aparece se for sandbox)
  - `LIVE` → não exibe badge

**Ação Primária (header):**
- Sem instância → "Conectar WhatsApp" (abre onboarding Meta Embedded Signup)
- Com instância → "Enviar Teste" → abre `SendTestSheet`

**Perfil Comercial:**
- Dados vêm de `GET /api/v1/whatsapp/phone-numbers/[phone.id]/profile`
- Usa `phone.id` (Meta ID), não `configId`
- Skeleton enquanto carrega
- Se sem perfil → estado vazio com link para Business Manager

**SendTestSheet (Sheet lateral — direita):**
```
┌────────────────────────────────────┐
│  Enviar Mensagem de Teste          │
│  ─────────────────────────────── │
│  Template                          │
│  [Selecionar template ▼]  (busca) │
│                                    │
│  Preview:                          │
│  ┌──────────────────────────────┐  │
│  │ Olá [nome do cliente]!       │  │
│  │ Seu pedido [número] foi...   │  │
│  └──────────────────────────────┘  │
│                                    │
│  Variáveis                         │
│  nome do cliente: [________]       │
│  número do pedido: [________]      │
│                                    │
│  Número destino                    │
│  [+55 11 9 9999-9999]             │
│                                    │
│  [Enviar Mensagem de Teste]        │
└────────────────────────────────────┘
```

---

## TAB 2 — Templates

### Lista de Templates

Tabela estilo ManyChat. Sem cards, sem ViewSwitcher. Escaneável e direta.

```
┌────────────────────────────────────────────────────────────────┐
│  Nome                    Categoria    Idioma      Status    ⋮  │
│  ──────────────────────────────────────────────────────────── │
│  boas_vindas             Marketing    pt_BR       ✓ Aprovado ⋮ │
│  lembrete_aula           Utilidade    pt_BR       ✓ Aprovado ⋮ │
│  oferta_especial         Marketing    en_US       ⚠ Reprovado ⋮│  ← tooltip: motivo
│  confirmacao_pagamento   Autenticação pt_BR       ⏱ Em análise ⋮│
└────────────────────────────────────────────────────────────────┘
```

**Status (ícone + texto colorido, não Badge):**
- `APPROVED` → `<CheckCircle2 />` verde + "Aprovado" verde
- `REJECTED` → `<XCircle />` laranja + "Reprovado" laranja + Tooltip com `rejected_reason`
- `PENDING` → `<Clock />` muted + "Em análise" muted
- `DISABLED` → `<MinusCircle />` muted + "Desativado" muted

**Kebab menu (⋮) por linha:**
- Editar → abre editor full-screen
- Enviar Teste → abre SendTestSheet pré-selecionado com esse template
- Excluir → dialog de confirmação

**Filtros (sheet de filtro no HeaderPageShell):**
- Categoria: Todos / Marketing / Utilidade / Autenticação
- Status: Todos / Aprovados / Em análise / Reprovados

**Ação primária:** "+ Novo Template" → abre dialog de criação (ver abaixo)

---

### Criação de Novo Template — Dialog + Editor

**Fluxo:** "+ Novo Template" → dialog leve → editor full-screen

#### Dialog inicial ("Novo Template")

Modal simples, aparece antes de abrir o editor:

```
┌──────────────────────────────────────────┐
│  Novo Template                           │
│  ────────────────────────────────────── │
│  Categoria                               │
│  ○ Marketing   ○ Utilidade   ○ Autenticação │
│                                          │
│  Sub-tipo  (muda conforme categoria)     │
│  [▼ Selecionar tipo]                    │
│                                          │
│  Idioma                                  │
│  [▼ Português (Brasil)]                 │
│                                          │
│  [Cancelar]          [Continuar →]       │
└──────────────────────────────────────────┘
```

**Sub-tipos por categoria:**

| Categoria | Sub-tipos disponíveis |
|---|---|
| Marketing | Padrão, Catálogo, Flows, Detalhes do pedido, Solicitação de ligação |
| Utilidade | Padrão, Flows, Status do pedido, Detalhes do pedido, Solicitação de ligação |
| Autenticação | Código de acesso único |

> Autenticação → sub-tipo único, campo pré-selecionado (não editável).

---

#### Editor de Template — Full-Screen (estilo ManyChat)

Layout 2 colunas: **editor (esq) + preview celular (dir)**. Sem stepper, sem passos — tudo visível de uma vez.

```
┌─── Header: [← Voltar]  boas_vindas · Marketing · pt_BR  [Salvar rascunho]  [Enviar para Revisão] ───┐
│                                                                                                        │
│  ┌─────────────────────────────────────────┐   ┌──────────────────────────┐                          │
│  │ EDITOR                                  │   │ PREVIEW                  │                          │
│  │                                         │   │                          │                          │
│  │ Cabeçalho  (opcional)                  │   │  ┌────────────────────┐  │                          │
│  │ [Nenhum ▼] [Texto] [Imagem] [Vídeo]   │   │  │  3:54 PM        ✓✓ │  │                          │
│  │                                         │   │  │ ───────────────── │  │                          │
│  │ Corpo  *                               │   │  │                    │  │                          │
│  │ ┌─────────────────────────────────┐   │   │  │  Olá João!         │  │                          │
│  │ │ Olá [nome do cliente]!          │   │   │  │  Seu pedido 12345  │  │                          │
│  │ │ Seu pedido [número do pedido]   │   │   │  │  foi confirmado.   │  │                          │
│  │ │ foi confirmado.                 │   │   │  │                    │  │                          │
│  │ └─────────────────────────────────┘   │   │  │  [Tenho dúvidas]  │  │                          │
│  │   [+ Variável]  Tipo: [Nome ▼]        │   │  └────────────────────┘  │                          │
│  │                                         │   │  Live preview           │                          │
│  │ Exemplos (para aprovação Meta)         │   │  atualiza em tempo real  │                          │
│  │  nome do cliente  →  [João     ]       │   │                          │                          │
│  │  número do pedido →  [12345    ]       │   └──────────────────────────┘                          │
│  │                                         │                                                          │
│  │ Rodapé  (opcional)                     │                                                          │
│  │ [__________________________________]   │                                                          │
│  │                                         │                                                          │
│  │ Botões  (opcional)                     │                                                          │
│  │ [▼ Tipo de botão]                      │                                                          │
│  │                                         │                                                          │
│  │ Período de validade  (só Utilidade)    │                                                          │
│  │ [▼ Selecionar duração]                 │                                                          │
│  └─────────────────────────────────────────┘                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Variáveis — comportamento:**
- O usuário clica em "**+ Variável**" → insere `{{nome da variável}}` no cursor
- Selector "**Tipo**": `Nome` (ex: `{{order_id}}`) ou `Número` (ex: `{{1}}`), **padrão Nome**
- Variáveis aparecem como **chips coloridos** no corpo (azul claro)
- Seção "Exemplos": pares `nome do campo → valor de exemplo` (obrigatório para aprovação Meta)
- Preview: substitui chips pelo valor de exemplo em tempo real
- Ao enviar para Meta: converte `{{nome do cliente}}` → `{{1}}`, `{{2}}` com `example.body_text`

**Tipo de variável — detalhe:**
- `Nome`: variável string livre (ex: `{{order_id}}`, `{{customer_name}}`) — identificador semântico
- `Número`: posição numérica (ex: `{{1}}`, `{{2}}`) — posição sequencial
- O seletor de tipo fica no rodapé do editor de corpo (aplica-se ao próximo campo a inserir)
- Ambos os tipos são suportados pela Meta; priorizamos Nome por ser mais legível

**Cabeçalho:**
- `Nenhum` (padrão), `Texto`, `Imagem`, `Vídeo`, `Arquivo`
- Se Texto: input de texto simples (suporta `{{1}}` para variável de header)
- Se Imagem/Vídeo/Arquivo: upload de exemplo (obrigatório para aprovação Meta) + URL opcional

**Botões:**
- `Nenhum` (padrão)
- `URL Button`: Button Text + URL + Variável de URL (opcional)
- `Reply Button`: até 3 botões, cada um com texto. "+ Adicionar botão"
- Tipos não misturáveis (URL ou Reply, não ambos)

**Período de validade** (aparece **apenas se categoria = Utilidade**):
- Select: 1 hora, 3 horas, 6 horas, 12 horas, 24 horas, Nenhum
- Controla `expiration_time_ms` no payload da Meta

**Ações no header do editor:**
- `← Voltar` → retorna para lista (confirma se há alterações não salvas)
- `Salvar rascunho` → salva localmente (localStorage) sem enviar para Meta
- `Enviar para Revisão` → chama `whatsappApi.createTemplate()` → toast sucesso/erro

---

## TAB 3 — Webhook (admin/owner SaaS)

Conteúdo idêntico ao atual `WebhooksView`. Mantém:
- Seção: URL de Callback + token de verificação (com show/hide)
- Tabela de logs de eventos recebidos
- Filtros no HeaderPageShell: Tipo de Evento (text input) + Período (preset buttons)
- Botão de refresh no HeaderPageShell

```
┌─────────────────────────────────────────────────────────────────┐
│  Webhook URL                                                    │
│  https://whatrack.com/api/v1/whatsapp/webhook    [copiar ícone]│
│                                                                  │
│  Verify Token                                                   │
│  ●●●●●●●●●●●●●●    [👁 mostrar]                                │
├─────────────────────────────────────────────────────────────────┤
│  Eventos Recebidos                                              │
│  ─────────────────────────────────────────────────────────────  │
│  Timestamp          Tipo          De             Status        │
│  22/03 14:32:01     messages      +5511...        200 OK       │
│  22/03 14:30:55     statuses      +5511...        200 OK       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Navegação Completo

```
/settings/whatsapp
├── [Tab: Conta]
│   ├── (sem instância) → empty state + botão "Conectar WhatsApp"
│   └── (com instância) → perfil + botão "Enviar Teste" → SendTestSheet
│
├── [Tab: Templates]
│   ├── Lista em tabela (Nome | Categoria | Idioma | Status)
│   ├── Filtros (categoria + status)
│   ├── "+ Novo Template" → Dialog inicial → Editor full-screen
│   └── ⋮ por linha → Editar (editor full-screen) / Enviar Teste / Excluir
│
└── [Tab: Webhook]  (admin/owner only)
    └── URL + token + logs com filtros
```

---

## Estado Atual do Código (para referência)

### Hub atual (`whatsapp-settings-hub.tsx`)
- Tabs: `Instâncias` + `Webhook` (admin)
- `WhatsAppSettingsPage` → lista TODAS instâncias da org (não filtra por projeto) ← **remover**
- `WebhooksView` → mantém

### O que muda
| Componente | Ação |
|---|---|
| `WhatsAppSettingsHub` | Trocar tabs: `instâncias` → `conta` + adicionar `templates` |
| `WhatsAppSettingsPage` | Substituir por `AccountTab` (instância única do projeto) |
| `TemplatesView` | Refatorar para tabela + sem HeaderPageShell próprio (usa o do hub) |
| `WebhooksView` | Mantém — já funciona |
| `OverviewView` | Absorver lógica no novo `AccountTab`, deletar arquivo |
| `instance-detail.tsx` | Manter para acesso avançado via URL direta |

### Dados de instância (projeto-scoped)
- A instância do projeto vem de `GET /api/v1/whatsapp/instances?projectId=[projectId]`
- Já existe e filtra por projeto ✓
- Retorna `items[0]` — a instância do projeto (se existir)

### Bug de perfil a corrigir
- Criar `GET /api/v1/whatsapp/phone-numbers/[phoneId]/profile`
- Recebe Meta Phone ID como param de rota, valida que pertence à org
