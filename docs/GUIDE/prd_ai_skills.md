# PRD: AI Agent Skills — Modelo Híbrido Prompt + Skills

**Status:** Pronto para implementação
**Data:** 2026-02-27
**Domínio:** `src/services/ai/`, `src/schemas/ai/`, `src/app/api/v1/ai-skills/`, `src/components/dashboard/ai/`

---

## 1. Contexto e Motivação

### Estado Atual

O `AiAgent` possui hoje um único campo `systemPrompt` (Text) que concentra toda a instrução enviada ao LLM. As três personas seed (Conversation Summarizer, Lead Qualifier, Sale Detector) carregam prompts monolíticos que mesclam:
- Identidade e propósito do agente (específico de cada agente)
- Regras de comportamento transversais (ex.: não inferir, calibrar confiança)

Isso gera:
- **Duplicação silenciosa**: regras comportamentais repetidas nos 3 prompts sem mecanismo de sincronização.
- **Manutenção acoplada**: alterar uma regra global exige editar todos os agentes manualmente.
- **Ausência de governança**: não há distinção entre o que é "identidade do agente" e o que é "comportamento padrão do sistema".

### Problema a Resolver

Separar a instrução de identidade do agente (lean, enxuta) das regras comportamentais reutilizáveis (skills), permitindo composição dinâmica no runtime e gestão independente de cada camada.

---

## 2. Objetivo

Introduzir o modelo híbrido **leanPrompt + Skills** para agentes AI, onde:

- `leanPrompt` = instrução de identidade e foco do agente (substitui `systemPrompt`).
- `AiSkill` = bloco de instrução reutilizável, versionável e governado independentemente.
- `AiAgentSkill` = vínculo N:N com ordenação e ativação por agente.
- O runtime compõe `leanPrompt` + skills ativas ordenadas antes de chamar o LLM.

---

## 3. Personas e Casos de Uso

| Persona | Ação Principal |
|---|---|
| Admin da organização | Edita o `leanPrompt` do agente e escolhe quais skills aplicar |
| Admin da organização | Cria skills custom reutilizáveis para a organização |
| Admin da organização | Reordena skills por agente e ativa/desativa individualmente |
| Sistema | Provê 2 skills core read-only para todas as organizações |
| Runtime AI | Compõe instruções: `leanPrompt` + skills ordenadas antes de cada inferência |

---

## 4. Requisitos Funcionais

### 4.1 Renomeação de Campo

- `AiAgent.systemPrompt` → `AiAgent.leanPrompt` em todas as camadas:
  - Schema Prisma
  - Schemas Zod
  - Service
  - API (request/response)
  - UI
- Nenhum fallback ou alias para `systemPrompt` deve sobreviver em `src/`.

### 4.2 Modelo de Skills

Cada `AiSkill` possui:

| Campo | Tipo | Regra |
|---|---|---|
| `id` | UUID | PK |
| `organizationId` | UUID | FK → Organization |
| `slug` | String | Único por organização |
| `name` | String | Nome legível |
| `description` | String? | Opcional |
| `content` | Text | Instrução literal enviada ao LLM |
| `kind` | Enum | `SHARED` ou `AGENT` |
| `source` | Enum | `SYSTEM` ou `CUSTOM` |
| `isActive` | Boolean | Default true |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Constraint único:** `(organizationId, slug)`

#### Semântica de `kind` e `source`

| Combinação | Significado |
|---|---|
| `kind=SHARED, source=SYSTEM` | Regra transversal provida pelo sistema (read-only) |
| `kind=AGENT, source=SYSTEM` | Instrução de domínio seedada para persona específica (read-only) |
| `kind=SHARED, source=CUSTOM` | Regra reutilizável criada pela organização |
| `kind=AGENT, source=CUSTOM` | Instrução específica criada pela organização para um agente |

**Imutabilidade:** Skills com `source=SYSTEM` não podem ser editadas nem excluídas via API.

### 4.3 Vínculo Agente ↔ Skill

`AiAgentSkill` (junção N:N):

| Campo | Tipo | Regra |
|---|---|---|
| `id` | UUID | PK |
| `agentId` | UUID | FK → AiAgent |
| `skillId` | UUID | FK → AiSkill |
| `sortOrder` | Int | Menor valor executa primeiro |
| `isActive` | Boolean | Default true |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Constraint único:** `(agentId, skillId)`
**Índice:** `(agentId, sortOrder)` para queries de composição
**Cascade:** `onDelete: Cascade` na relação para desvinculo automático ao excluir skill
**Ordenação determinística em runtime:** `ORDER BY sortOrder ASC, createdAt ASC`

### 4.4 Runtime de Execução

`dispatchAiEvent` deve compor o prompt final assim:

```
[leanPrompt do agente]

[conteúdo da skill 1 (sortOrder menor)]
[conteúdo da skill 2]
...
[conteúdo da skill N]
```

Regras:
1. Se não houver skill ativa vinculada: executa apenas com `leanPrompt`.
2. Skills com `isActive=false` no vínculo são ignoradas.
3. A lógica de neutral skip, debounce de 2h e criação de `AiInsight` **não se altera**.

### 4.5 API de Skills

#### `GET /api/v1/ai-skills`
- Retorna skills da organização (sistema + custom).
- Permissão: `view:ai`.

#### `POST /api/v1/ai-skills`
- Cria skill custom (`source=CUSTOM`).
- Permissão: `manage:ai`.
- Campos obrigatórios: `slug`, `name`, `content`, `kind`.

#### `GET /api/v1/ai-skills/:id`
- Retorna skill pelo ID.
- Permissão: `view:ai`.

#### `PATCH /api/v1/ai-skills/:id`
- Bloqueia se `source=SYSTEM` → 403.
- Atualiza campos permitidos de skill custom.
- Permissão: `manage:ai`.

#### `DELETE /api/v1/ai-skills/:id`
- Bloqueia se `source=SYSTEM` → 403.
- Remove skill e desvincula de todos os agentes (cascade).
- Permissão: `manage:ai`.

#### Ajuste em `/api/v1/ai-agents` e `/api/v1/ai-agents/:id`
- Aceitar e retornar `leanPrompt` em vez de `systemPrompt`.
- Aceitar `skillBindings?: { skillId, sortOrder, isActive }[]` em create/update.
- Retornar `skillBindings` populados na leitura.
- Semântica de `PATCH`:
  - `skillBindings` ausente: preserva vínculos atuais.
  - `skillBindings` presente: substitui todos os vínculos do agente (replace total).

### 4.6 Skills Core — V1

Duas skills seedadas para todas as organizações:

| Slug | Nome | Kind | Source | Conteúdo (referência) |
|---|---|---|---|---|
| `factualidade` | Factualidade | SHARED | SYSTEM | Instrução para não inferir dados não explícitos na conversa |
| `calibracao-confianca` | Calibração de Confiança | SHARED | SYSTEM | Instrução para calibrar o campo `confidence` apenas com evidências diretas |

Conteúdo redigido em português. Definição final dos textos: responsabilidade do time de produto antes do seed.

### 4.7 Seeds e Migração

1. Renomear `systemPrompt` → `leanPrompt` nos 3 seeds de agente existentes.
2. Criar seed das 2 skills shared core por organização (idempotente por slug).
3. Criar vínculo `AiAgentSkill` das 2 shared core com todos os agentes da organização (idempotente).
4. Para cada um dos 3 agentes seed, criar uma skill de domínio própria (`kind=AGENT, source=SYSTEM`) e vinculá-la ao agente correspondente.
5. Migration Prisma:
   - Rename de coluna `systemPrompt` → `leanPrompt` na tabela `AiAgent`.
   - Criação das tabelas `AiSkill` e `AiAgentSkill`.
   - Backfill idempotente: shared core + vínculos para organizações e agentes já existentes.
6. Provisionamento contínuo:
   - No fluxo de criação de organização, chamar `ai-skill-provisioning.service.ts` para garantir que as 2 skills core SYSTEM existam e sejam vinculadas aos agentes padrão.

### 4.8 UI — Settings AI

#### Página do Agente (`/dashboard/settings/ai/[id]`)

- Campo **Prompt Enxuto** (`leanPrompt`): textarea existente, apenas renomeado visualmente.
- Nova seção **Skills Vinculadas**:
  - Lista de skills ativas para a organização.
  - Multi-select com checkbox por skill.
  - Ordenação por **drag-and-drop** com persistência de `sortOrder`.
  - Toggle ativo/inativo por vínculo.
  - Skills `source=SYSTEM` exibem badge "Sistema"; conteúdo é read-only, mas vínculo pode ser ativado/desativado por agente.

#### Página de Skills (`/dashboard/settings/ai/skills`)

- Listagem de todas as skills (sistema + custom).
- Criação de skill custom via form: `slug`, `name`, `description`, `content`, `kind`.
- Edição de skills custom.
- Badge "Sistema" + campo desabilitado para skills `source=SYSTEM`.
- Exclusão apenas para skills `source=CUSTOM`.

---

## 5. Requisitos Não-Funcionais

| Requisito | Critério |
|---|---|
| Sem legacy | Nenhuma referência a `systemPrompt` em `src/` após entrega |
| Idempotência | Seeds executáveis múltiplas vezes sem duplicar dados |
| Performance | Query de composição usa índice `(agentId, sortOrder)` e ordenação determinística |
| Segurança | Skills SYSTEM imutáveis via API (403 em update/delete) |
| Consistência | Exclusão de skill remove vínculos automaticamente (cascade) |
| Tipagem | `strict: true` — sem `any` em services e schemas |
| React | Sem `useEffect`/`useLayoutEffect` em `src/` — usar Server Components, Server Actions e React Query |

---

## 6. Arquitetura e Mapeamento de Arquivos

### 6.1 Camada de Dados

```
prisma/schema.prisma
  AiAgent:        systemPrompt → leanPrompt
  AiSkill:        nova tabela
  AiAgentSkill:   nova tabela (junção N:N)

prisma/migrations/
  [timestamp]_ai_skills_lean_prompt/
    migration.sql

prisma/seeds/
  seed_skills_shared_core.ts        (novo)
  seed_agent_*.ts                   (update: leanPrompt + skill de domínio)
```

### 6.2 Schemas Zod

```
src/schemas/ai/ai-schemas.ts
  createAiAgentSchema:      systemPrompt → leanPrompt, + skillBindings?
  updateAiAgentSchema:      idem
  createAiSkillSchema:      novo (slug, name, description?, content, kind)
  updateAiSkillSchema:      novo (todos opcionais)
  agentSkillBindingSchema:  novo (skillId, sortOrder, isActive)
```

### 6.3 Services

```
src/services/ai/
  ai-agent.service.ts               (update: leanPrompt, skillBindings CRUD)
  ai-skill.service.ts               (novo: CRUD de skills)
  ai-skill-provisioning.service.ts  (novo: garantir core skills em criação de org)
  ai-execution.service.ts           (update: composição leanPrompt + skills)
```

### 6.4 API Routes

```
src/app/api/v1/
  ai-agents/route.ts          (update: leanPrompt, skillBindings)
  ai-agents/[id]/route.ts     (update: leanPrompt, skillBindings)
  ai-skills/route.ts          (novo: GET, POST)
  ai-skills/[id]/route.ts     (novo: GET, PATCH, DELETE)
```

### 6.5 UI

```
src/components/dashboard/ai/
  agent-form.tsx              (update: leanPrompt label, nova seção skills)
  skill-library.tsx           (novo: listagem de skills)
  skill-form.tsx              (novo: form de criação/edição)
  agent-skill-bindings.tsx    (novo: seleção e ordenação DnD de skills por agente)

src/app/dashboard/settings/ai/
  page.tsx                    (update: labels)
  [id]/page.tsx               (update: integra AgentSkillBindings)
  skills/page.tsx             (novo: biblioteca de skills)
```

### 6.6 Hooks

```
src/hooks/ai/
  use-ai-skills.ts            (novo: lista e mutations de skills)
  use-agent-skill-bindings.ts (novo: bindings por agente)
```

### 6.7 Types

```
src/types/ai/
  ai-skill.ts         (novo: AiSkillKind, AiSkillSource, AiSkill)
  ai-agent-skill.ts   (novo: AiAgentSkill, AgentSkillBinding)
```

---

## 7. Cenários de Teste

### 7.1 `ai-skill.service.ts` (unitários)

| # | Cenário | Resultado Esperado |
|---|---|---|
| 1 | Criar skill custom | Persiste com `source=CUSTOM` |
| 2 | Update em skill `source=SYSTEM` | Lança erro (403 no handler) |
| 3 | Delete em skill `source=SYSTEM` | Lança erro (403 no handler) |
| 4 | Listar skills por organização | Retorna sistema + custom |
| 5 | Slug duplicado na mesma organização | Erro de constraint |

### 7.2 `ai-agent.service.ts` (unitários)

| # | Cenário | Resultado Esperado |
|---|---|---|
| 1 | Create/update com `leanPrompt` | Persiste corretamente |
| 2 | Create com `skillBindings` | Cria vínculos com `sortOrder` correto |
| 3 | Update com `skillBindings` alterados | Remove antigos, insere novos |
| 4 | PATCH sem `skillBindings` | Vínculos existentes preservados |
| 5 | Agente de outra organização | 404 |

### 7.3 `ai-execution.service.ts` (unitários)

| # | Cenário | Resultado Esperado |
|---|---|---|
| 1 | `leanPrompt` sem skills | Prompt = apenas `leanPrompt` |
| 2 | `leanPrompt` + 2 skills ativas | Prompt concatena respeitando `sortOrder` |
| 3 | Binding com `isActive=false` | Skill ignorada na composição |
| 4 | Dois bindings com mesmo `sortOrder` | Desempate por `createdAt ASC` (determinístico) |
| 5 | Neutral skip (NEUTRAL, COLD, SUPPORT) | Insight não criado |
| 6 | Debounce 2h | Segundo disparo ignorado |

### 7.4 Testes de Rota (integração)

| # | Rota | Cenário | Esperado |
|---|---|---|---|
| 1 | `POST /ai-skills` | Happy path | 201 + skill criada |
| 2 | `POST /ai-skills` | Sem permissão | 403 |
| 3 | `PATCH /ai-skills/:id` | Skill SYSTEM | 403 |
| 4 | `DELETE /ai-skills/:id` | Skill SYSTEM | 403 |
| 5 | `GET /jobs/ai-classifier` | Regressão | Comportamento idêntico ao atual |

### 7.5 Testes de Seed

| # | Cenário | Esperado |
|---|---|---|
| 1 | Seed executado 2x | Sem duplicatas em `AiSkill` e `AiAgentSkill` |
| 2 | Shared core após seed | Vinculadas a todos os agentes da organização |
| 3 | Agentes seed | Possuem `leanPrompt` + skill de domínio própria |
| 4 | Nova org criada pós-seed | `ai-skill-provisioning` garante core skills e vínculos |

---

## 8. Critérios de Aceite

1. `leanPrompt` substitui `systemPrompt` em 100% das referências em `src/` e no banco.
2. Mesma skill pode ser vinculada a múltiplos agentes simultaneamente.
3. Agente executa normalmente sem skills vinculadas (apenas `leanPrompt`).
4. Agente executa com `leanPrompt` + skills, respeitando `sortOrder` com desempate por `createdAt`.
5. Ordenação por drag-and-drop persistida corretamente em `AiAgentSkill.sortOrder`.
6. Skills `source=SYSTEM` aparecem como read-only na UI e retornam 403 em update/delete via API.
7. Os 3 agentes seed nascem com configuração híbrida: `leanPrompt` + shared core + skill de domínio.
8. Seeds são idempotentes.
9. Provisionamento core em criação de organização funciona de forma idempotente.
10. `npm run lint`, `npm run test`, `npm run test:prisma` e `npm run build` passam sem erro.
11. Nenhum arquivo vazio ou diretório vazio em `src/` após entrega.
12. Sem referência a `systemPrompt` em qualquer arquivo em `src/`.

---

## 9. Sequência de Implementação

```
1.  prisma/schema.prisma                          → rename + novos models
2.  migration SQL                                 → rename coluna + criação tabelas + backfill
3.  src/types/ai/                                 → AiSkillKind, AiSkillSource, tipos TS
4.  src/schemas/ai/ai-schemas.ts                  → leanPrompt + skill schemas + bindings
5.  src/services/ai/ai-skill.service.ts           → CRUD skills (novo)
6.  src/services/ai/ai-skill-provisioning.service.ts → provisionamento core skills (novo)
7.  src/services/ai/ai-agent.service.ts           → leanPrompt + bindings
8.  src/services/ai/ai-execution.service.ts       → composição prompt + skills
9.  src/app/api/v1/ai-skills/                     → rotas de skills (novo)
10. src/app/api/v1/ai-agents/                     → ajuste contrato
11. src/hooks/ai/                                 → hooks de skills e bindings
12. src/components/dashboard/ai/                  → componentes UI
13. src/app/dashboard/settings/ai/               → páginas
14. prisma/seeds/                                 → seeds atualizados + novos
```

---

## 10. Riscos e Mitigações

| Item | Risco / Decisão |
|---|---|
| Conteúdo das skills core | Textos das 2 skills SYSTEM precisam ser aprovados antes do seed |
| Migração de dados em produção | Rename de coluna via Prisma — verificar compatibilidade com a versão PostgreSQL em uso |
| Prompt final no LLM | Validar se `leanPrompt + skills` respeita limites de contexto dos modelos (Groq llama, openai/gpt-4o-mini) |
| Drag-and-drop | Usar biblioteca compatível com React 19 (ex.: `@dnd-kit/core`). Persistir `sortOrder` no servidor a cada reordenação — não apenas localmente |

---

## 11. Especificação UI/UX

### 11.0 Princípios e Convenções

- **Componentes**: shadcn/ui (Card, Button, Badge, Input, Textarea, Select, Switch, Dialog, Separator)
- **Ícones**: lucide-react
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable` — mesmo padrão de `pipeline-settings.tsx`
- **Toasts**: `sonner` — seguir padrão existente (`toast.loading` → `toast.success/error` com id)
- **Feedback de loading**: botão com `disabled` + texto alternativo; nunca tela bloqueada
- **Navegação**: Link Next.js para páginas, Dialog para forms inline
- **Copy**: português, tom direto, sem jargão técnico para labels visíveis ao usuário
- **Ícones sugeridos**: `Puzzle` (skill), `Layers` (biblioteca), `GripVertical` (drag handle), `Lock` (SYSTEM), `Zap` (SHARED), `Bot` (AGENT)

---

### 11.1 Agent Builder — Seção "Skills Vinculadas"

**Localização na página:** quarta Card, abaixo de "Variáveis de Extração", spanning `md:col-span-3`.

#### Layout geral

```
┌─ Card (col-span-3) ────────────────────────────────────────────────────────┐
│ CardHeader                                                                  │
│  🧩 Skills Vinculadas                                                       │
│  Combine blocos de instrução para compor o comportamento completo do agente.│
├──────────────────────────────────────┬─────────────────────────────────────┤
│  BIBLIOTECA DE SKILLS                │  EXECUÇÃO NESTE AGENTE              │
│  (painel esquerdo, ~40%)             │  (painel direito, ~60%)             │
│                                      │  Ordem de composição ↓              │
│  ── Do Sistema ──────────────────    │                                     │
│  [🔒 Factualidade          SHARED]  │  ⠿ 1. Factualidade   [SISTEMA] ●○  │
│  [🔒 Calibração Confiança  SHARED]  │  ⠿ 2. Calibração     [SISTEMA] ●○  │
│                                      │  ⠿ 3. Minha Skill    [CUSTOM]  ●○  │
│  ── Personalizadas ──────────────    │                                     │
│  [✦ Minha Skill            SHARED]  │                                     │
│                                      │  (empty: "Nenhuma skill ativa")     │
│  [+ Criar nova skill →]              │                                     │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

#### Painel esquerdo — Biblioteca

- **Container**: `border-r h-full overflow-y-auto max-h-72 p-4 space-y-1`
- **Separador de grupo**: `text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4 first:mt-0`
- **Item de skill** (botão clicável para adicionar ao painel direito):
  ```
  [ícone] Nome da skill                          [Badge kind] [+ Adicionar]
  ```
  - Container: `flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors group`
  - Ícone: `Lock` (SYSTEM, `text-muted-foreground h-3.5 w-3.5`) ou `Puzzle` (CUSTOM, `text-primary h-3.5 w-3.5`)
  - Nome: `text-sm flex-1 truncate`
  - Badge kind: `text-[10px] uppercase` — `variant="outline"` para SHARED, `variant="secondary"` para AGENT
  - Botão `+`: `opacity-0 group-hover:opacity-100 transition-opacity` — `Button variant="ghost" size="icon" h-6 w-6`; se skill já vinculada: botão escondido, item com `text-muted-foreground opacity-60 pointer-events-none`
  - Skills SYSTEM: ícone `Lock`, sem botão `+` (sempre vinculadas por padrão; toggle apenas no painel direito)

- **CTA criar skill**: `Button variant="ghost" size="sm" className="w-full border border-dashed mt-3 text-muted-foreground"` com ícone `Plus` — abre Dialog de criação (seção 11.3)

- **Estado vazio de personalizadas**: texto `"Nenhuma skill criada ainda."` em `text-xs text-muted-foreground text-center py-4`

#### Painel direito — Execução neste agente

- **Container**: `p-4 space-y-2 min-h-[120px]`
- **Título auxiliar**: `text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1` com ícone `ArrowDown` e texto `"Ordem de composição — a skill 1 executa primeiro"`

- **Item DnD** (componente `agent-skill-bindings.tsx`):
  ```
  ⠿  [ícone]  Nome da skill    [Badge]    [Toggle isActive]  [×]
  ```
  - Container: `flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 shadow-sm`
  - Drag handle: `GripVertical h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing`
  - Ícone da skill: igual ao painel esquerdo
  - Nome: `text-sm font-medium flex-1 truncate`
  - Badge source: `"Sistema"` com `variant="secondary" text-[10px]` para SYSTEM; nada para CUSTOM
  - Toggle `isActive`: `Switch size="sm"` — quando `false`, item fica `opacity-50`
  - Botão remover (`×`): `Button variant="ghost" size="icon" h-6 w-6 text-muted-foreground hover:text-destructive` — **oculto para skills SYSTEM** (toggle-only)

- **Estado de drag**: item sendo arrastado fica `opacity-40 scale-95 shadow-lg border-primary/30`
- **Estado drop zone**: lista exibe `border-2 border-dashed border-primary/30 bg-primary/5 rounded-md`
- **Persistência**: `sortOrder` atualizado no servidor via `PATCH /ai-agents/:id` após soltar o item (debounce 300ms ou on-drop imediato)

- **Estado vazio** (nenhuma skill ativa):
  ```
  ┌────────────────────────────────────────────┐
  │  (ícone Layers vazio, muted)               │
  │  Nenhuma skill ativa.                       │
  │  O agente vai rodar apenas com o           │
  │  Prompt Enxuto.                            │
  └────────────────────────────────────────────┘
  ```
  Estilo: `border border-dashed rounded-md py-8 text-center text-sm text-muted-foreground`

#### Implementação DnD (`agent-skill-bindings.tsx`)

Seguir o padrão de `pipeline-settings.tsx`:

```tsx
// Estrutura de referência
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={bindings.map(b => b.id)} strategy={verticalListSortingStrategy}>
    {bindings.map(binding => (
      <SortableSkillItem key={binding.id} binding={binding} ... />
    ))}
  </SortableContext>
</DndContext>
```

- `handleDragEnd`: reordena array local com `arrayMove`, recalcula `sortOrder` como índice + 1, chama mutação PATCH
- Skills SYSTEM: `disabled` no `useSortable` — aparecem fixas no topo, não são arrastáveis
- `sensors`: `useSensor(PointerSensor, { activationConstraint: { distance: 8 } })` para evitar drag acidental

---

### 11.2 Página: Biblioteca de Skills

**URL:** `/dashboard/settings/ai/skills`
**Acesso:** link no menu de Settings AI ou botão "Gerenciar Skills" na listagem de agentes

#### Layout

```
┌─ PageShell ────────────────────────────────────────────────────────────────┐
│ PageHeader                                                                  │
│   🧩  Biblioteca de Skills                     [+ Nova Skill]              │
│   Blocos de instrução reutilizáveis para seus agentes de IA.               │
├─────────────────────────────────────────────────────────────────────────────┤
│ PageContent                                                                 │
│                                                                             │
│  ── Do Sistema ─────────────────────────────────────── (2 skills) ─────    │
│  ┌──────────────────┐  ┌──────────────────┐                                │
│  │ 🔒 Factualidade  │  │ 🔒 Calibração... │                                │
│  │ SHARED  SISTEMA  │  │ SHARED  SISTEMA  │                                │
│  │ preview do cont. │  │ preview do cont. │                                │
│  └──────────────────┘  └──────────────────┘                                │
│                                                                             │
│  ── Personalizadas ─────────────────────────────────── (1 skill) ──────    │
│  ┌──────────────────┐  ┌────────────────────────────┐                      │
│  │ ✦ Minha Skill    │  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │                      │
│  │ SHARED  CUSTOM   │  │    + Nova Skill             │                      │
│  │ preview do cont. │  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │                      │
│  │ [Editar] [Apagar]│  └────────────────────────────┘                      │
│  └──────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Seção "Do Sistema"

- **Header de seção**: `flex items-center justify-between mb-4`
  - Label: `text-sm font-medium text-muted-foreground flex items-center gap-2` com ícone `Lock h-3.5 w-3.5`
  - Contagem: `Badge variant="secondary" text-xs`
- **Grid**: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Skill Card SYSTEM**:
  ```
  ┌─ Card ──────────────────────────────────────────────┐
  │ CardHeader pb-2                                      │
  │  [🔒 Lock]  Factualidade         [SHARED] [SISTEMA] │
  │  slug: factualidade                                  │
  ├──────────────────────────────────────────────────────┤
  │ CardContent                                          │
  │  "Não infira dados que não estejam explicitamente..." │
  │  (line-clamp-3 text-sm text-muted-foreground)       │
  └──────────────────────────────────────────────────────┘
  ```
  - Card: `border-dashed` (indica read-only visual)
  - Badges: `[SHARED]` = `variant="outline" text-[10px] uppercase`, `[SISTEMA]` = `variant="secondary" text-[10px]`
  - Sem ações (nenhum botão de editar/apagar)

#### Seção "Personalizadas"

- **Header de seção**: igual ao do Sistema, mas com `Lock` substituído por `Puzzle` e cor `text-primary`
  - Inclui botão `+ Nova Skill` secundário (além do do PageHeader): `Button variant="outline" size="sm"`
- **Grid**: mesmo padrão
- **Skill Card CUSTOM**:
  ```
  ┌─ Card ──────────────────────────────────────────────┐
  │ CardHeader pb-2                                      │
  │  [🧩 Puzzle] Minha Skill              [SHARED]      │
  │  slug: minha-skill                                   │
  ├──────────────────────────────────────────────────────┤
  │ CardContent                                          │
  │  "Instrução customizada da organização..."           │
  │  (line-clamp-3 text-sm text-muted-foreground)       │
  ├──────────────────────────────────────────────────────┤
  │ CardFooter border-t pt-3                            │
  │  [Editar]                           [Apagar]        │
  └──────────────────────────────────────────────────────┘
  ```
  - Botão Editar: `Button variant="ghost" size="sm" flex-1` — abre Dialog de edição (seção 11.3)
  - Botão Apagar: `Button variant="ghost" size="sm" flex-1 text-destructive hover:text-destructive hover:bg-destructive/10`
  - Apagar: dispara `confirm()` ou AlertDialog antes de chamar `DELETE /ai-skills/:id`

- **Card "Nova Skill"** (placeholder no grid):
  ```
  ┌─ Card border-dashed cursor-pointer hover:border-primary/50 ──┐
  │                                                               │
  │              [+ Plus icon, muted]                             │
  │              Nova Skill                                        │
  │              text-sm text-muted-foreground                    │
  │                                                               │
  └───────────────────────────────────────────────────────────────┘
  ```
  - `onClick`: abre Dialog de criação

- **Estado vazio de personalizadas** (sem cards, apenas o placeholder):
  - Mostrar 1 card placeholder + texto motivacional abaixo da seção

#### Estados da página

| Estado | UI |
|---|---|
| Loading | `LoadingCard` (3 placeholders) em cada seção |
| Erro de fetch | `toast.error` + botão retry |
| Sem skills custom | Mostra apenas seção "Do Sistema" + card placeholder "Nova Skill" |

---

### 11.3 Dialog: Criar / Editar Skill

Usado em dois contextos: botão na página de Skills e CTA no painel esquerdo do Agent Builder.

#### Layout

```
┌─ Dialog (max-w-lg) ────────────────────────────────────────────┐
│ DialogHeader                                                     │
│   Nova Skill  /  Editar Skill                                    │
│   Crie um bloco de instrução reutilizável para seus agentes.    │
├──────────────────────────────────────────────────────────────────┤
│ DialogContent space-y-4                                          │
│                                                                  │
│  Nome *                                                          │
│  [_________________________________]                             │
│  placeholder: "Ex: Calibração de Tom de Voz"                    │
│                                                                  │
│  Slug *    (auto-gerado do nome, editável)                       │
│  [_________________________________]                             │
│  helper: "Identificador único. Só letras, números e hífens."    │
│                                                                  │
│  Tipo                                                            │
│  [SHARED ▾]                                                      │
│  SHARED = usável em qualquer agente                             │
│  AGENT  = instrução específica de um agente                     │
│                                                                  │
│  Descrição (opcional)                                            │
│  [_________________________________]                             │
│                                                                  │
│  Instrução *                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ (monospace, min-h-[140px], resize-none)                    │ │
│  │ placeholder: "Escreva a instrução exatamente como será     │ │
│  │ enviada ao LLM. Seja objetivo e imperativo."               │ │
│  └────────────────────────────────────────────────────────────┘ │
│  helper: "[N] caracteres"  (contador em tempo real)             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ DialogFooter                                                     │
│                          [Cancelar]  [Criar Skill / Salvar]     │
└──────────────────────────────────────────────────────────────────┘
```

#### Comportamento do campo Slug

- Gerado automaticamente a partir do `name` com `slugify` (lowercase, espaços → hífens, remove acentos)
- Campo editável: usuário pode sobrescrever
- Validação inline: regex `^[a-z0-9-]+$`; erro abaixo do campo se inválido
- Em edição: slug pode ser alterado (o backend aceita via PATCH)

#### Estados do Dialog

| Estado | Comportamento |
|---|---|
| Novo | Campos vazios, botão "Criar Skill" |
| Editando | Campos pré-preenchidos, botão "Salvar Alterações", slug editável |
| Salvando | Botão disabled com spinner `"Salvando..."` |
| Erro de slug duplicado | `toast.error("Já existe uma skill com esse slug nesta organização.")` |
| Sucesso | Dialog fecha, `toast.success`, lista recarrega via `queryClient.invalidateQueries` |

---

### 11.4 Navegação e Fluxo entre Superfícies

```
/dashboard/settings/ai           (lista de agentes)
  │
  ├─ [Editar Agente] ──────────→ /dashboard/settings/ai/[id]
  │                                  │
  │                                  ├─ Seção Skills Vinculadas
  │                                  │   └─ [+ Criar nova skill] → Dialog Criar Skill (inline)
  │                                  │
  │                                  └─ [Gerenciar Skills →] ────→ /dashboard/settings/ai/skills
  │
  └─ [Skills] (nav lateral) ───→ /dashboard/settings/ai/skills
                                     │
                                     └─ [+ Nova Skill] → Dialog Criar Skill
                                     └─ [Editar] → Dialog Editar Skill
                                     └─ [Apagar] → AlertDialog confirmação → DELETE
```

**Link "Gerenciar Skills"**: botão `variant="link" size="sm"` no rodapé da seção Skills Vinculadas do Agent Builder, com texto `"Gerenciar biblioteca de skills →"` e ícone `ExternalLink h-3 w-3`.

---

### 11.5 Feedback e Estados Globais

| Ação | Toast |
|---|---|
| Skill criada | `toast.success("Skill criada com sucesso.")` |
| Skill atualizada | `toast.success("Skill atualizada.")` |
| Skill excluída | `toast.success('Skill "nome" removida e desvinculada dos agentes.')` |
| Tentar editar SYSTEM via UI (caso bypass) | `toast.error("Skills do sistema não podem ser editadas.")` |
| Reordenação salva | Sem toast — feedback visual apenas (handle muda para `check` por 1s) |
| Erro genérico | `toast.error("Algo deu errado. Tente novamente.")` |

**Loading states:**
- Listagem: `LoadingCard` × 3 (padrão existente)
- Seção de skills no agent builder: skeleton de 2 itens no painel direito + 3 no painel esquerdo (`animate-pulse rounded-md bg-muted h-10 w-full`)
- Botão salvar skill: `disabled + spinner` no texto (sem overlay de tela)

**Confirmação de exclusão:**
- Usar `AlertDialog` do shadcn/ui (não `confirm()` nativo) para exclusão de skill
- Título: `"Apagar skill?"`
- Descrição: `"Esta skill será removida de todos os agentes vinculados. Essa ação não pode ser desfeita."`
- Botões: `[Cancelar]` + `[Apagar]` (variant destructive)

---

## Feature Futura

O catálogo de templates de skills (marketplace público/privado, stars, installs) foi especificado separadamente em [`prd_ai_skill_templates.md`](./prd_ai_skill_templates.md) e não faz parte desta entrega.
