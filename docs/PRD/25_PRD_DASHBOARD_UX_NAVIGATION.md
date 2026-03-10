# PRD 24 — Dashboard UX: Navegacao, Integracoes e Settings

## Status

Proposto. Reposicionamento da arquitetura de navegacao do dashboard antes do launch.

---

## Diagnostico: O que cada rota faz hoje

Mapeamento completo do que cada pagina realmente entrega ao usuario.

### Plataforma e dados

| Rota | O que faz |
|---|---|
| `/dashboard` | KPIs de negocio: receita, gasto em ads, ROAS, ROI, CAC, ticket medio. Graficos de funil e distribuicao de vendas. Filtros por periodo, fonte e categoria. |
| `/dashboard/analytics` | Performance do time no WhatsApp: SLA, funil de conversas, metricas de engajamento da equipe. |
| `/dashboard/whatsapp/inbox` | Inbox de conversas em tempo real (3 paineis: lista, mensagens, ticket). Integrado ao Centrifugo. |
| `/dashboard/meta-ads` | Overview de ROI de Meta Ads: investimento total, receita atribuida, ROAS global, grafico por conta. **Dados de performance.** |
| `/dashboard/meta-ads/campaigns` | Metricas por campanha individual. **Dados de performance detalhado.** |
| `/dashboard/ai/usage` | Custo e consumo de IA: chamadas, tokens, custo estimado, grafico diario, breakdown por feature, logs paginados. |
| `/dashboard/approvals` | Fila de sugestoes de IA aguardando revisao humana. Cada card: cliente, item sugerido, valor, raciocinio da IA. Acoes: Aplicar ou Descartar. |

### CRM operacional

| Rota | O que faz |
|---|---|
| `/dashboard/projects` | Lista de projetos (clientes da agencia). Cada projeto e um workspace operacional separado. |
| `/dashboard/leads` | Banco de leads com busca, filtros e criacao via drawer. |
| `/dashboard/tickets` | Pipeline de negociacoes: list, card, kanban com drag-drop. Filtros por status e data. |
| `/dashboard/sales` | Historico de vendas fechadas. |
| `/dashboard/items` | Catalogo de produtos e servicos com preco e custo. |
| `/dashboard/item-categories` | Categorias do catalogo. |

### Configuracao (settings)

| Rota | O que faz |
|---|---|
| `/dashboard/equipe` | Membros, convites, papeis e permissoes da organizacao. |
| `/dashboard/settings/whatsapp` | **Configuracao de conexao:** instancias de WhatsApp, status, templates, onboarding via Meta SDK. |
| `/dashboard/settings/meta-ads` | **Configuracao de conexao:** contas Facebook conectadas, contas de anuncio com projetos vinculados, pixels. |
| `/dashboard/settings/pipeline` | Configuracao dos estagios do pipeline de vendas. |
| `/dashboard/settings/ai` | AI Studio Beta: criacao e configuracao de agentes de IA customizados. |
| `/dashboard/settings/audit-logs` | Log de auditoria: quem fez o que e quando. |
| `/dashboard/settings/billing` | Admin: catalogo de planos, quotas, status de sync com Stripe. (Super admin only.) |

---

## O caso dos dois Meta Ads

O usuario esta certo em questionar. Existem dois contextos completamente diferentes para Meta Ads:

**1. Meta Ads como dado** (sidebar principal)
- `/dashboard/meta-ads` → ROI overview: quanto gastei, quanto atribui, ROAS
- `/dashboard/meta-ads/campaigns` → detalhe por campanha

O usuario vai aqui para **ver resultado** de campanha. E uma tela de dados, igual ao dashboard principal.

**2. Meta Ads como conexao** (settings hoje)
- `/dashboard/settings/meta-ads` → contas Facebook, contas de anuncio, pixels

O usuario vai aqui para **configurar a integracao**. E uma tela de admin de conexao.

A mesma logica se aplica ao WhatsApp:
- `/dashboard/whatsapp/inbox` → dados operacionais (conversas em tempo real)
- `/dashboard/settings/whatsapp` → configuracao da conexao (instancias, templates)

**Conclusao:** o que esta em settings hoje nao e "configuracao de sistema" — e **gestao de integracoes**. Deve ter identidade propria.

---

## Decisao: Hub de Integracoes

### Conceito

Criar `/dashboard/integracoes` como hub central de todas as conexoes externas do produto:

```
/dashboard/integracoes
┌──────────────────────────────────────────────────┐
│ Integracoes                                       │
│                                                   │
│ [WhatsApp]  [Meta Ads]  [Google Ads*]  [+ Novo]  │
│                                                   │
│ ─── WhatsApp ─────────────────────────────────── │
│ Gerencie os numeros conectados ao WhaTrack        │
│                                                   │
│ [instancias, status, templates, onboarding]       │
└──────────────────────────────────────────────────┘
```

Cada integracao e uma aba. Adicionar uma nova integracao no futuro (Google Ads, TikTok, Shopify) e apenas adicionar uma nova aba — sem criar nova rota de settings.

### Por que hub de integracoes faz sentido para o ICP

A agencia gerencia multiplos clientes, cada um com seu WhatsApp e Meta Ads. Ela precisa de um lugar so para ver **todas as conexoes** e saber o status de cada uma. Hoje esse lugar nao existe — as conexoes ficam em rotas separadas de settings sem conexao visual entre si.

Referencia do mercado: HubSpot, Pipedrive, Zapier, Notion — todos tem um "Integrations" ou "Connected Apps" como hub central.

---

## Estrutura de Navegacao Proposta

### Sidebar: 4 secoes com logica clara

```
──────────────────────────────
  VISAO GERAL
  Dashboard
  Analytics
──────────────────────────────
  CAPTACAO
  Meta Ads           ← dados (ROI + Campanhas unificados)
  Mensagens          ← inbox WhatsApp
──────────────────────────────
  CRM
  Projetos
  Leads
  Tickets
  Vendas
──────────────────────────────
  INTELIGENCIA
  IA Copilot         ← aprovacoes + uso de IA em abas
──────────────────────────────
  [footer avatar]    ← acesso a Settings
──────────────────────────────
```

**O que sai do sidebar:**
- Itens e Categorias → unificam em `/dashboard/catalog`, acessivel via Configuracoes ou link direto no sidebar de Settings
- "Conta" (1 item) → eliminada
- "Configuracoes" → eliminada do sidebar principal, vira pagina dedicada

**Logica das secoes:**
- **Visao Geral**: como o negocio esta indo (metricas e analytics)
- **Captacao**: de onde vem o cliente (Meta Ads → WhatsApp)
- **CRM**: o que acontece com o cliente depois
- **Inteligencia**: o que a IA esta fazendo e custando

### Meta Ads unificado

`/dashboard/meta-ads` passa a ter abas internas:

```
Meta Ads
  [ROI e Atribuicao]  [Campanhas]  [Auditoria de Conta*]
```

Remove `/dashboard/meta-ads/campaigns` como rota direta no sidebar. Acesso via aba.

### IA Copilot unificado

`/dashboard/approvals` (renomear rota para `/dashboard/ia`) passa a ter abas:

```
IA Copilot
  [Aprovacoes]  [Uso e Custo]
```

Remove `/dashboard/ai/usage` como entrada separada. Acesso via aba.

---

## Settings: Pagina Dedicada

`/dashboard/settings` com navegacao lateral vertical.

```
/dashboard/settings
┌────────────────┬─────────────────────────────────────────┐
│ CONTA PESSOAL  │                                         │
│  Perfil        │   [conteudo da aba]                     │
│  Seguranca     │                                         │
│                │                                         │
│ WORKSPACE      │                                         │
│  Organizacao   │                                         │
│  Equipe        │                                         │
│  Integracoes   │  ← hub: WhatsApp + Meta Ads + futuros   │
│  Pipeline      │                                         │
│  IA Studio     │                                         │
│  Catalogo      │  ← Itens + Categorias em abas           │
│  Assinatura    │                                         │
│  Auditoria     │                                         │
└────────────────┴─────────────────────────────────────────┘
```

### Perfil (pessoal)
- Nome, email, telefone
- Preferencia de tema (Light/Dark/System)

### Seguranca (pessoal)
- Alterar senha

### Organizacao (workspace)
- Nome da agencia
- Dados fiscais (atual `AccountOrganizationCard`)

### Equipe (workspace)
- Membros, convites, papeis, permissoes
- Migrar conteudo atual de `/dashboard/equipe`

### Integracoes (workspace) — hub central

```
/dashboard/settings/integracoes
Abas: [WhatsApp] [Meta Ads] [Google Ads*] ...

Aba WhatsApp:
- instancias conectadas com status
- adicionar instancia (QR onboarding)
- templates de mensagem
- configuracao por instancia

Aba Meta Ads:
- contas Facebook conectadas
- contas de anuncio com projeto vinculado
- pixels configurados
- OAuth / reconectar

Aba Google Ads (futuro):
- placeholder com "Em breve"
```

### Pipeline (workspace)
- Estagios do pipeline de vendas (conteudo atual de `/dashboard/settings/pipeline`)

### IA Studio (workspace)
- Agentes customizados, skills, configuracoes avancadas (conteudo atual de `/dashboard/settings/ai`)

### Catalogo (workspace)
- Aba Itens: produtos e servicos com preco e custo
- Aba Categorias: grupos do catalogo

### Assinatura (workspace)
- Plano atual, proxima cobranca, total estimado
- Uso por projeto (conversoes, creditos de IA)
- Botao de upgrade / gerenciar

### Auditoria (workspace)
- Log de auditoria: quem fez o que e quando

---

## Acesso ao Settings

**Via footer do sidebar:**

```
[Avatar] Nome do usuario
         ↓ dropdown:
           Configuracoes → /dashboard/settings
           ─────────────
           Sair
```

Sem "Minha Conta" separado — tudo em Configuracoes.

**Via breadcrumb:**

Qualquer pagina de settings mostra:
`Configuracoes > [Secao]`

---

## Mapa de Rotas: Antes e Depois

### Rotas que somem do sidebar

| Rota atual | Destino |
|---|---|
| `/dashboard/meta-ads/campaigns` (sidebar) | Aba dentro de `/dashboard/meta-ads` |
| `/dashboard/ai/usage` (sidebar) | Aba dentro de `/dashboard/ia` |
| `/dashboard/items` (sidebar) | `/dashboard/settings/catalogo` aba Itens |
| `/dashboard/item-categories` (sidebar) | `/dashboard/settings/catalogo` aba Categorias |

### Rotas que mudam de lugar

| Rota atual | Nova rota |
|---|---|
| `/dashboard/equipe` | `/dashboard/settings/equipe` |
| `/dashboard/account` | `/dashboard/settings/perfil` |
| `/dashboard/billing` | `/dashboard/settings/assinatura` |
| `/dashboard/settings/whatsapp` | `/dashboard/settings/integracoes` (aba WhatsApp) |
| `/dashboard/settings/meta-ads` | `/dashboard/settings/integracoes` (aba Meta Ads) |
| `/dashboard/settings/pipeline` | `/dashboard/settings/pipeline` (mantida, so sai do sidebar principal) |
| `/dashboard/settings/ai` | `/dashboard/settings/ia-studio` |
| `/dashboard/settings/audit-logs` | `/dashboard/settings/auditoria` |
| `/dashboard/approvals` | `/dashboard/ia` (com abas Aprovacoes + Uso) |

### Redirects necessarios

Manter redirects permanentes (308) de todas as rotas antigas para as novas para nao quebrar bookmarks e links internos:

```
/dashboard/billing              → /dashboard/settings/assinatura
/dashboard/account              → /dashboard/settings/perfil
/dashboard/equipe               → /dashboard/settings/equipe
/dashboard/settings/whatsapp    → /dashboard/settings/integracoes
/dashboard/settings/meta-ads    → /dashboard/settings/integracoes
/dashboard/approvals            → /dashboard/ia
/dashboard/ai/usage             → /dashboard/ia?tab=uso
/dashboard/items                → /dashboard/settings/catalogo
/dashboard/item-categories      → /dashboard/settings/catalogo?tab=categorias
```

---

## Sidebar Final: Visao Completa

```
Logo WhaTrack
────────────────────────
VISAO GERAL
  ○ Dashboard
  ○ Analytics
────────────────────────
CAPTACAO
  ○ Meta Ads
  ○ Mensagens
────────────────────────
CRM
  ○ Projetos
  ○ Leads
  ○ Tickets
  ○ Vendas
────────────────────────
INTELIGENCIA
  ○ IA Copilot
────────────────────────
[Avatar] Nome
         ↓ Configuracoes / Sair
```

**Total: 9 itens operacionais + footer.** Hoje sao 16+ itens espalhados em 4-5 secoes.

---

## Billing: Redesign para Plano Unico

Dentro de `/dashboard/settings/assinatura`:

### Estado: trial ativo

```
╔══════════════════════════════════════════╗
║  Trial gratuito — 8 dias restantes       ║
║  [Assinar por R$ 497 / mes]              ║
╚══════════════════════════════════════════╝

Plano WhaTrack — o que esta incluido:
  ✓ Ate 3 clientes ativos
  ✓ 1 WhatsApp por cliente
  ✓ 1 Meta Ads por cliente
  ✓ 300 conversoes rastreadas / cliente / mes
  ✓ 10.000 creditos de IA / cliente / mes

Extras disponiveis apos assinatura:
  + R$ 97 por cliente adicional
  + R$ 49 por WhatsApp adicional no cliente
  + R$ 49 por Meta Ads adicional no cliente
```

### Estado: assinante ativo

```
╔══════════════════════════════════════════╗
║  Plano WhaTrack          [Ativo]         ║
║  Proximo vencimento: 15/04/2026          ║
║  Total estimado este ciclo: R$ 643       ║
╚══════════════════════════════════════════╝

Resumo da assinatura:
  Plano base             R$ 497
  2 clientes extras      R$ 194
  ─────────────────────────────
  Total                  R$ 691

Uso por cliente (ciclo atual):
  [Cliente A]  ████████░░  241/300 conversoes | 8.230/10.000 creditos
  [Cliente B]  ████░░░░░░   89/300 conversoes | 3.100/10.000 creditos
  [Cliente C]  █░░░░░░░░░   12/300 conversoes |   430/10.000 creditos

[Gerenciar assinatura no Stripe]   [Cancelar]
```

**O que muda no billing atual:**
- Remove `PlanSelector` — nao ha escolha de plano
- Remove `BillingPlanList` da view do usuario — existe so um plano
- Remove `AccountBillingCard` da pagina de account
- `BillingStatus` simplifica para: plano + vencimento + total estimado
- `UsageProgress` evolui para: consumo por projeto (conversoes + creditos)

---

## Arquivos Afetados

### Sidebar e layout

- `src/components/dashboard/sidebar/sidebar-client.tsx` — nova estrutura de 4 secoes
- `src/components/dashboard/sidebar/user-dropdown-menu.tsx` — simplificar para Settings + Sair
- `src/components/dashboard/layout/header.tsx` — atualizar ROUTE_LABELS

### Settings (novos)

- `src/app/dashboard/settings/layout.tsx` — nav lateral vertical
- `src/app/dashboard/settings/perfil/page.tsx`
- `src/app/dashboard/settings/seguranca/page.tsx`
- `src/app/dashboard/settings/organizacao/page.tsx`
- `src/app/dashboard/settings/equipe/page.tsx` ← migra `team-access-content.tsx`
- `src/app/dashboard/settings/integracoes/page.tsx` ← **hub novo**
- `src/app/dashboard/settings/pipeline/page.tsx`
- `src/app/dashboard/settings/ia-studio/page.tsx`
- `src/app/dashboard/settings/catalogo/page.tsx`
- `src/app/dashboard/settings/assinatura/page.tsx`
- `src/app/dashboard/settings/auditoria/page.tsx`

### Integracoes (novo componente hub)

- `src/components/dashboard/integracoes/integracoes-hub.tsx`
- `src/components/dashboard/integracoes/whatsapp-integration-tab.tsx` ← migra conteudo de `settings/whatsapp`
- `src/components/dashboard/integracoes/meta-ads-integration-tab.tsx` ← migra conteudo de `settings/meta-ads`

### Meta Ads unificado

- `src/app/dashboard/meta-ads/page.tsx` — adicionar abas internas (ROI + Campanhas)

### IA Copilot unificado

- `src/app/dashboard/ia/page.tsx` — novo, substitui `/dashboard/approvals`
- Abas: Aprovacoes (conteudo atual) + Uso e Custo (conteudo atual de `/dashboard/ai/usage`)

### Billing

- `src/components/dashboard/billing/billing-status.tsx` — simplificar
- `src/components/dashboard/billing/usage-progress.tsx` — uso por projeto
- `src/components/dashboard/billing/plan-selector.tsx` — remover
- `src/components/dashboard/billing/billing-plan-list.tsx` — remover da view usuario
- `src/components/dashboard/account/account-billing-card.tsx` — remover

### Catalogo

- `src/app/dashboard/catalog/page.tsx` — novo, agrupa Itens + Categorias em abas
- Mantém `src/app/dashboard/items/` e `src/app/dashboard/item-categories/` com redirect

### Proxy (redirects)

- `src/proxy.ts` — adicionar todos os redirects 308 listados acima

---

## Ordem de Execucao Recomendada

1. Criar `src/app/dashboard/settings/layout.tsx` com nav lateral
2. Migrar rotas de settings existentes para nova estrutura (move conteudo, adiciona redirects)
3. Criar hub de Integracoes (`integracoes-hub.tsx` + abas WhatsApp e Meta Ads)
4. Reestruturar sidebar (4 secoes, remover duplicatas, unificar Meta Ads e IA)
5. Criar `/dashboard/catalog` e `/dashboard/ia` com abas
6. Simplificar billing (plano unico, uso por projeto)
7. Remover componentes descontinuados (`AccountBillingCard`, `PlanSelector`)
8. Adicionar todos os redirects no proxy
9. Atualizar `ROUTE_LABELS` do breadcrumb

---

## Fora de Escopo

- Redesign visual (cores, tipografia, espacamentos, dark mode)
- Versao mobile nativa
- Novos dashboards ou features de analytics
- Onboarding do novo usuario (PRD 20 e PRD 23)
- Internacionalizacao

---

## Criterios de Aceite

- sidebar tem 4 secoes com no maximo 9 itens operacionais
- Meta Ads aparece uma vez com abas internas
- IA Copilot aparece uma vez com abas internas
- `/dashboard/settings` existe como pagina com nav lateral em duas camadas (pessoal / workspace)
- `/dashboard/settings/integracoes` centraliza WhatsApp + Meta Ads em abas
- Billing acessivel em unico lugar: `/dashboard/settings/assinatura`
- Todas as rotas antigas redirecionam corretamente
- Nenhum item de admin tecnico visivel para usuarios comuns
- Itens e Categorias acessiveis via `/dashboard/settings/catalogo`

---

## Riscos e Trade-offs

- Mover rotas exige atualizar links internos, breadcrumbs e qualquer referencia hardcoded
- Settings com nav lateral e mais complexo de implementar que pagina flat — necessario para o modelo crescer
- Hub de Integracoes requer validar que componentes de WhatsApp e Meta Ads funcionam dentro de abas sem conflito de estado
- Renomear `/dashboard/approvals` para `/dashboard/ia` exige atualizar qualquer link ou notificacao que aponta para a rota antiga
- Usuarios existentes podem estranhar mudanca de localizacao — mitigar com tooltips no primeiro acesso e redirects permanentes
