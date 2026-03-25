# PRD-017 Review vs nextjs-feature-dev Conventions

**Data:** 2026-03-25
**Status:** Review em progresso

---

## Checklist de Conformidade

### ✅ Já Conformes

- [x] **Task structure** — Cada task tem `**Files:**`, `**What to do:**`, `**Verification:**`, `**Depends on:**`
- [x] **Task granularity** — Tasks são pequenas e focadas (não 1 gigante por fase)
- [x] **Atomic commits** — Cada task terá seu próprio commit
- [x] **Domain organization** — Code está em `src/lib/whatsapp/`, `src/services/whatsapp/`, `src/components/dashboard/whatsapp/`
- [x] **Layers** — Distingue claramente Services (lógica), Routes (thin), UI (componentes)
- [x] **Result<T> pattern** — Services retornam Result (sucesso/erro)
- [x] **Zod validation** — Schemas separados em `src/schemas/whatsapp/`

### ⚠️ Ajustes Recomendados

#### 1. **Branch naming**
**Problema:** PRD-017 não menciona create feature branch.
**Ajuste:** Adicionar instrução ao QUICK_START.md para criar branch após aprovação PRD.
```bash
git checkout -b feature/2026-03-22-whatsapp-campaign-audience-builder
```

#### 2. **First commit deve ser o PRD**
**Problema:** Não há instrução sobre primeiro commit ser o PRD folder.
**Ajuste:** Adicionar ao QUICK_START.md:
```bash
git add docs/PRD/PRD-017-whatsapp-campaign-audience-builder/
git commit -m "docs: add PRD for WhatsApp campaign audience builder"
```

#### 3. **Task dependencies mais explícitas**
**Problema:** Ordem de execução está em um campo "Ordem de Execução" separado. Deveria estar em `Depends on:` de cada task.
**Ajuste:** Task 12 deve ter `Depends on: Task 11, Task 20` (não depende de Task 9 diretamente).

#### 4. **Commit messages por task**
**Problema:** Não há exemplos de commits atômicos por task (feat/test/refactor scope).
**Ajuste:** Adicionar ao QUICK_START.md exemplos como:
```
Task 1: feat(whatsapp): add campaign audience builder schema
Task 4: feat(whatsapp): add audience schemas with zod
Task 5: feat(whatsapp): add contact list service
Task 12: feat(whatsapp): add campaign variant stats and duplicate endpoint
Task 18: feat(whatsapp): add engagement funnel and recipient filters to campaign detail
```

#### 5. **Camadas mais claras nos arquivos criados**
**Problema:** Tasks mencionam `Create: src/services/whatsapp/...` mas não detalham se é Query, Service, Schema, Action.
**Ajuste:** Ser explícito nas task descriptions sobre qual subcamada:
- `src/services/whatsapp/queries/` (read-only, cache-eligible)
- `src/services/whatsapp/services/` (business logic, Result<T>)
- `src/lib/whatsapp/actions/` (thin Server Actions)
- `src/app/api/v1/whatsapp/` (thin Route Handlers)

#### 6. **Validação com Zod em todos os limites**
**Problema:** Tasks de API routes não mencionam explicitamente validação Zod.
**Ajuste:** Task 12 (rotas) deve mencionar: "Validar todos os payloads com schemas Zod antes de delegar para services."

#### 7. **Server Components by default**
**Problema:** Task 17 e 18 (UI) não mencionam que devem começar como Server Components.
**Ajuste:** Adicionar ao `**What to do:**`: "Componentes de builder começam como Server Components. Envolver em `'use client'` apenas passos interativos (formulários, seleção)."

#### 8. **Hooks directory strictness**
**Problema:** Task 19 (tag assignment UI) pode criar hooks sem razão clara.
**Ajuste:** Documentar: "Hooks em `src/hooks/` APENAS se real custom hook. API clients vão em `src/lib/whatsapp/api-client/`."

#### 9. **Structured logging (Pino)**
**Problema:** Não há menção a logger nas tasks de service.
**Ajuste:** Task 5, 6, 7, 9, etc. devem mencionar: "Log com `logger.info({ context }, 'message')` em pontos críticos."

#### 10. **Caching explícito (Next.js 16)**
**Problema:** Query services não mencionam quando usar `'use cache'` + `cacheTag`.
**Ajuste:** Tasks de queries (segment preview, list preview) devem mencionar: "Use `'use cache'` com `cacheTag` para queries custosas, com invalidação via `updateTag` em mutations."

---

## Ajustes Editoriais

### Em CONTEXT.md

Adicionar seção "Arquitetura de Camadas" (inspirada em nextjs-conventions):

```markdown
## Arquitetura de Camadas

### `src/lib/whatsapp/`
- `queries/` — Leitura pura. Usam `'use cache'` + `cacheTag` para queries custosas.
- `actions/` — Server Actions thin. Autenticação → validação Zod → delega para service → retorna Result.
- `services/` — Lógica de negócio. Orquestra operações, retorna Result<T>.
- `api-client/` — Cliente HTTP para APIs internas/externas (não vai em `src/hooks`).
- `schemas/` — Validação Zod para todos os limites: payloads, webhooks, env vars.
- `types/` — TypeScript types específicos do domínio.

### `src/app/api/v1/whatsapp/`
- Route Handlers thin (10-20 linhas). Parse → validate Zod → call service → respond.
- Nunca importar Prisma diretamente. Sempre via service.

### `src/components/dashboard/whatsapp/`
- Server Components por padrão.
- Fetch data em Server Components, passe props para Client Components.
- `'use client'` apenas para hooks/events/browser APIs.

### `src/services/whatsapp/` (LEGADO)
Domínios já existentes usam `src/services/`. Novas tasks devem usar `src/lib/whatsapp/services/`.
```

### Em TASKS.md

Expandir cada task com **Commit message** sugerido:

```markdown
### Task 5: Implementar servico de listas de contatos

...

**Commit message:**
```
feat(whatsapp): add contact list service with CSV import
```

**Logging points:**
- `logger.info({ listId, memberCount }, '[ContactList] Imported members')`
- Capture errors com `logger.error({ err, listId }, '[ContactList] Import failed')`

**Zod validation:**
- Request body validateido com `WhatsAppContactListCreateSchema`
- CSV parsed com validacao de phone + colunas obrigatorias
```

### Em QUICK_START.md

Adicionar "Regras de Implementacao (nextjs-conventions)":

```markdown
## Regras de Implementação

1. **Domain-organized code** — Tudo em `src/lib/whatsapp/` ou `src/components/dashboard/whatsapp/`
2. **Route handlers thin** — Max 20 linhas. Parse → validate → delegate → respond.
3. **Services own logic** — Retornam `Result<T>`, nunca throw para erros esperados.
4. **Server Components first** — Default é Server. Add `'use client'` só se precisa hooks/events.
5. **Zod at every boundary** — Server Actions, route handlers, webhooks, env vars.
6. **Structured logging (Pino)** — `logger.info({ context }, 'message')` em service layer.
7. **Explicit caching** — `'use cache'` + `cacheTag` + `cacheLife` apenas quando apropriado.
8. **Atomic commits** — Cada task = um commit com msg `feat(whatsapp): ` + descricao clara.
9. **No hardcoded colors** — Use semantic tokens: `bg-primary`, `text-foreground`.
10. **WCAG 2.1 AA** — 4.5:1 contrast, focus rings, color + icon + text para status.
```

---

## Ordem Recomendada de Revisão

1. **CONTEXT.md** — Adicionar "Arquitetura de Camadas"
2. **TASKS.md** — Expandir cada task com commit message + logging + validation hints
3. **QUICK_START.md** — Adicionar branch naming, first commit, implementation rules
4. **README.md** — Referenciar nextjs-feature-dev na seção "Próximo Passo"

---

## Segurança do PRD

O PRD-017 é **sound e pronto para execução**. Os ajustes acima são refinamentos para total alinhamento com nextjs-feature-dev, não bloqueadores.

Recomendação: **Aplicar os ajustes agora** (1-2h de edição) para garantir que quem executar PRD-017 tenha contexto + exemplos + patterns claros.
