# PRD: AI Skill Templates — Catálogo e Marketplace

**Status:** Especificação pendente — feature futura
**Depende de:** [`prd_ai_skills.md`](./prd_ai_skills.md) (deve estar em produção)
**Domínio:** `src/services/ai/`, `src/schemas/ai/`, `src/app/api/v1/ai-skill-templates/`, `src/components/dashboard/ai/`

---

## 1. Contexto

Com o modelo de Skills em produção (ver PRD base), organizações acumulam skills custom valiosas. O catálogo de templates permite compartilhar essas skills entre organizações, reduzindo o esforço de criação e promovendo boas práticas de instrução ao LLM.

---

## 2. Objetivo

Criar um marketplace de templates de skills onde:
- Organizações publicam skills como templates públicos ou privados.
- Qualquer organização pode instalar um template público como skill local.
- Templates instalados são sempre cópias independentes (isolamento multi-tenant).
- Stars e installs medem popularidade do catálogo.

---

## 3. Decisões em Aberto (bloqueiam implementação)

Estas decisões precisam ser fechadas antes de qualquer linha de código:

| # | Decisão | Opções | Impacto |
|---|---|---|---|
| 1 | **Ownership do template** | Pertence a uma organização (`organizationId`) ou a um usuário (`userId`)? | Define FK no schema, quem pode editar/excluir |
| 2 | **Visibilidade `PUBLIC`** | Qualquer organização autenticada vê? Ou requer aprovação/curadoria do sistema? | Define se API é cross-tenant e se existe moderação |
| 3 | **Stars por usuário ou por organização** | User star (voto individual) ou org star (bookmark da empresa)? | Se por usuário: ciclo de vida ao sair da org. Se por org: simplicidade |
| 4 | **`starsCount` e `installsCount`** | Campos denormalizados (update explícito a cada evento) ou computed on-the-fly? | Impacta performance em escala e complexidade de manutenção |
| 5 | **Mutabilidade após publicação** | Pode tornar template `PUBLIC` → `PRIVATE` depois? O que acontece com installs existentes? | Define estados possíveis e política de desativação |
| 6 | **Slug de templates** | Único globalmente ou único por owner? | Define constraint Prisma e detecção de conflito |

---

## 4. Requisitos Funcionais (rascunho)

### 4.1 Modelo `AiSkillTemplate`

Campos mínimos identificados (sujeitos às decisões acima):

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK |
| `ownerOrgId` / `ownerUserId` | UUID | Depende da decisão 1 |
| `slug` | String | Unicidade: decisão 6 |
| `name` | String | Nome legível |
| `description` | String? | Opcional |
| `content` | Text | Instrução do template |
| `kind` | Enum | `SHARED` ou `AGENT` (herda de AiSkill) |
| `visibility` | Enum | `PUBLIC` ou `PRIVATE` |
| `starsCount` | Int | Decisão 4: campo ou computed |
| `installsCount` | Int | Decisão 4: campo ou computed |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

### 4.2 Modelos de suporte

- `AiSkillTemplateStar`: registro de star por usuário ou org (decisão 3).
- `AiSkillTemplateInstall`: rastreia qual org instalou qual template (para `installsCount` e histórico).

### 4.3 Ações principais

- **Publicar**: converte uma `AiSkill` local em template (cópia do conteúdo no momento da publicação).
- **Instalar**: cria uma `AiSkill` nova na organização com o conteúdo do template — nunca executa o template diretamente.
- **Star / Unstar**: registra interesse. Unicidade por usuário/org + template.
- **Despublicar**: muda visibilidade para `PRIVATE` (decisão 5: impacto em installs existentes).

### 4.4 API (rascunho de rotas)

```
GET    /api/v1/ai-skill-templates          → catálogo público + templates da org
POST   /api/v1/ai-skill-templates          → publicar template (com visibility)
GET    /api/v1/ai-skill-templates/:id      → detalhe do template
PATCH  /api/v1/ai-skill-templates/:id      → editar template próprio
DELETE /api/v1/ai-skill-templates/:id      → remover template próprio
POST   /api/v1/ai-skill-templates/:id/install → instalar (cria AiSkill local)
PUT    /api/v1/ai-skill-templates/:id/star    → dar star
DELETE /api/v1/ai-skill-templates/:id/star    → remover star
```

> Nota: a rota `/publish` separada foi descartada. Publicação ocorre no `POST /ai-skill-templates` com `visibility` no body, seguindo o padrão REST do projeto.

### 4.5 UI (rascunho)

- Página `/dashboard/settings/ai/templates`: catálogo com filtro público/meus templates.
- Ação "Publicar skill" na biblioteca de skills (`/dashboard/settings/ai/skills`).
- Card de template com: nome, descrição, `starsCount`, `installsCount`, badge de visibilidade, botão instalar/star.

---

## 5. Requisitos Não-Funcionais

| Requisito | Critério |
|---|---|
| Isolamento multi-tenant | Instalação sempre por cópia local — template nunca é executado diretamente |
| Stars únicos | `(userId ou orgId, templateId)` com constraint único |
| Sem `useEffect` | UI segue regras do projeto: RSC, Server Actions, React Query |

---

## 6. Riscos Identificados

| Risco | Descrição |
|---|---|
| API cross-tenant | Templates `PUBLIC` exigem queries fora do escopo de uma organização — padrão inédito no projeto |
| Moderação de conteúdo | Templates públicos podem conter instruções inadequadas — necessário definir política |
| Sincronização de conteúdo | Installs são cópias independentes: atualização do template original não propaga para installs |
| Escala de contadores | `starsCount`/`installsCount` denormalizados exigem race condition handling em updates concorrentes |

---

## 7. Próximos Passos

1. Fechar as 6 decisões da seção 3.
2. Revisar este PRD com as decisões fechadas.
3. Detalhar schema Prisma completo.
4. Detalhar schemas Zod.
5. Aprovação para implementação.
