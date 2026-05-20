---
name: next-feature-architecture
description: Use esta skill ao criar, alterar ou revisar código em projetos Next.js 16+ com App Router, arquitetura por features, separação forte de responsabilidades, arquivos pequenos, services, repositories, schemas, hooks, mutations, API routes e acesso organizado ao banco de dados.
---

# Skill: Next.js Feature Architecture

## Objetivo

Guiar o desenvolvimento em projetos Next.js 16+ (App Router) usando arquitetura modular por domínio, com responsabilidades bem separadas, arquivos pequenos e baixo acoplamento entre features.

Prioridade: código previsível, fácil de navegar, fácil de testar, seguro para server/client boundaries e performático.

## Princípios obrigatórios

1. Separar responsabilidade por camada.
2. Organizar código específico dentro de `features/[domain]`.
3. Manter `app/` como camada de roteamento, entrada HTTP e composição.
4. Manter banco de dados fora de componentes, hooks e código client.
5. Usar um arquivo por intenção sempre que possível.
6. Evitar arquivos grandes com múltiplas responsabilidades.
7. Evitar imports profundos entre features.
8. Preferir composição na rota/página em vez de uma feature importar outra diretamente.
9. Validar entradas com schemas antes de executar regra de negócio.
10. Colocar regras sensíveis no servidor.
11. Evitar `useEffect`, usando apenas em casos estritamente justificados.
12. Priorizar TanStack Query para busca e sincronização de dados client-side.
13. **IDs e UUIDs**: Proibido gerar IDs no código (`cuid`, `nanoid`, `uuid`). Delegar geração ao banco (`.defaultRandom()` Drizzle / `@default(uuid())` Prisma).
14. **Env vars**: Nunca usar `process.env.FOO` direto. Validar todas via `src/lib/env.ts` no boot.
15. **select/columns obrigatório**: Todo acesso ao banco deve especificar campos explicitamente. Nunca depender de `select *` implícito.
16. **Queries paralelas**: Usar `Promise.all` para queries independentes no mesmo repository ou service.
17. **Funções dinâmicas sempre com await**: `cookies()`, `headers()`, `params`, `searchParams` são todas async no Next.js 16 — sempre `await`.
18. **Testes e TDD**: O design modular favorece o TDD. Testes residem lado a lado com a implementação (`.test.ts`).

## Estrutura padrão do projeto

```txt
src/
  app/
    api/
    (public)/
    (dashboard)/
    layout.tsx
    page.tsx

  components/
    ui/
    layout/

  features/
    [domain]/
      components/
      hooks/
      mutations/
      queries/
      schemas/
      services/
      repositories/
      mappers/
      types.ts
      constants.ts
      index.ts
      server.ts

  server/
    auth/
      get-current-user-id.ts

  lib/
    db/
      index.ts        ← exporta o cliente do ORM (Prisma ou Drizzle)
    env.ts
    utils/

  proxy.ts            ← interceptação de requests (ex-middleware.ts)
  config/
  constants/
  types/
```

## Responsabilidade de cada diretório

### `src/app`

Rotas, layouts, páginas, handlers HTTP e composição entre features. Não coloque regra de negócio complexa em `app/`.

### `src/app/api`

Camada HTTP fina. Uma API route deve: ler a request → chamar service → retornar response. Nunca acessar banco diretamente.

### `src/features/[domain]`

Tudo específico daquele domínio: services, repositories, hooks, schemas, components.

### `src/server/auth`

Helpers de autenticação server-side. Centraliza lógica de sessão. Nunca duplicar em features.

### `src/lib/db`

Fornece o cliente do ORM configurado. Importado apenas por repositories.

```ts
// src/lib/db/index.ts — Prisma
import "server-only"
import { PrismaClient } from "@prisma/client"
export const db = new PrismaClient()

// src/lib/db/index.ts — Drizzle
import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { env } from "@/lib/env"
export const db = drizzle(new Pool({ connectionString: env.DATABASE_URL }))
```

### `src/proxy.ts`

Interceptação de requests no Next.js 16 (substituto do `middleware.ts`). Roda no runtime Node.js completo (não Edge). Use para autenticação, redirects e rewrite de headers.

```ts
// src/proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  // lógica de interceptação
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

## Regra de camadas (Fluxo de Dados)

```txt
Component
  chama hook, query ou mutation

Mutation ou Query (TanStack Query)
  chama API route ou Server Action

API Route ou Server Action
  autentica usuário (getCurrentUserId)
  chama service passando input como unknown
  retorna HTTP response ou dado

Service
  "server-only"
  valida input com schema (safeParse)
  aplica regra de negócio
  chama repository(ies)
  retorna { data } | { error, status }

Repository
  "server-only"
  acessa banco via db
  select/columns explícitos obrigatórios
  Promise.all para queries independentes
  sem regra de negócio

lib/db/index.ts
  fornece a conexão com o banco
```

## Variáveis de Ambiente

Nunca acessar `process.env` diretamente no código. Centralizar em `src/lib/env.ts`:

```ts
// src/lib/env.ts
import "server-only"
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

Regras:
- Variáveis server-only: sem prefixo, importadas de `env.ts` (server-only)
- Variáveis client: prefixo `NEXT_PUBLIC_`, podem ter schema separado sem `server-only`
- Falha no boot se variável obrigatória ausente — erros explícitos, sem undefined silencioso

## Autenticação

Helper compartilhado — nunca duplicar lógica de sessão nas features:

```ts
// src/server/auth/get-current-user-id.ts
import "server-only"

export async function getCurrentUserId(request?: Request): Promise<string | null> {
  // implementação específica do projeto (better-auth, next-auth, clerk, etc.)
  const session = await getServerSession(request)
  return session?.user?.id ?? null
}
```

Uso em routes e actions:

```ts
const userId = await getCurrentUserId(request)
if (!userId) return apiError("Unauthorized", 401)
```

## Server Actions

Camada fina entre client e services. Suportam `updateTag()` e `refresh()` no Next.js 16.

```ts
// features/cases/actions/create-case.action.ts
"use server"

import { getCurrentUserId } from "@/server/auth/get-current-user-id"
import { createCaseService } from "../services/create-case.service"

export async function createCaseAction(input: unknown) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Não autorizado")
  return createCaseService(userId, input)
}
```

Para invalidação imediata após mutation (read-your-writes):

```ts
"use server"
import { updateTag } from "next/cache"

export async function updateCaseAction(input: unknown) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Não autorizado")

  const result = await updateCaseService(userId, input)

  // updateTag: invalida imediatamente na mesma request (diferente de revalidateTag que agenda)
  if ("data" in result) updateTag(`case:${result.data.id}`)
  return result
}
```

Uma action deve:
1. Usar `"use server"`.
2. Autenticar o usuário.
3. Receber input como `unknown`.
4. Chamar um service da feature.
5. Não conter regra de negócio.
6. Não acessar banco diretamente.
7. Não validar manualmente quando já existe schema.

## API Routes

```ts
// app/api/v1/cases/route.ts
import { getCurrentUserId } from "@/server/auth/get-current-user-id"
import { createCaseService } from "@/features/cases/services/create-case.service"
import { apiError, apiSuccess } from "@/lib/utils/api-response"

export async function POST(request: Request) {
  const userId = await getCurrentUserId(request)
  if (!userId) return apiError("Unauthorized", 401)

  const body = await request.json().catch(() => ({}))
  const result = await createCaseService(userId, body)

  if ("error" in result) return apiError(result.error, result.status ?? 400)
  return apiSuccess(result.data)
}
```

## Services

Um arquivo por caso de uso. Retorno padronizado: `{ data }` ou `{ error, status }`.

```ts
// features/cases/services/create-case.service.ts
import "server-only"
import { z } from "zod"
import { createCaseRepository } from "../repositories/create-case.repository"

const createCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function createCaseService(userId: string, input: unknown) {
  const parsed = createCaseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Dados inválidos", status: 400 as const, details: parsed.error.flatten() }
  }

  const record = await createCaseRepository({ userId, ...parsed.data })
  return { data: record }
}
```

Services devem:
1. Usar `import "server-only"`.
2. Receber `input: unknown` quando vier do client.
3. Validar com Zod (`safeParse` para retornar erro controlado).
4. Retornar `{ data }` em sucesso ou `{ error, status }` em falha.
5. Chamar repositories.

Services não devem:
1. Importar `db` diretamente.
2. Importar `NextResponse`.
3. Receber `Request`.
4. Ter JSX.
5. Ser usados em Client Components.

## Repositories

Um arquivo por operação. Select/columns **sempre** explícitos.

```ts
// features/cases/repositories/find-case-by-id.repository.ts
import "server-only"
import { db } from "@/lib/db"

// Prisma
export async function findCaseById(id: string, userId: string) {
  return db.case.findUnique({
    where: { id, userId },
    select: { id: true, title: true, description: true, createdAt: true },
  })
}

// Drizzle
export async function findCaseById(id: string, userId: string) {
  return db
    .select({ id: cases.id, title: cases.title, description: cases.description, createdAt: cases.createdAt })
    .from(cases)
    .where(and(eq(cases.id, id), eq(cases.userId, userId)))
    .limit(1)
    .then(rows => rows[0] ?? null)
}
```

Queries independentes em `Promise.all`:

```ts
// features/billing/repositories/find-checkout-page-data.repository.ts
import "server-only"
import { db } from "@/lib/db"

export async function findCheckoutPageData(organizationId: string) {
  const [subscription, profile, projects] = await Promise.all([
    db.billingSubscription.findUnique({
      where: { organizationId },
      select: { isActive: true, plan: true },
    }),
    db.organizationProfile.findUnique({
      where: { organizationId },
      select: { onboardingStatus: true },
    }),
    db.project.findMany({
      where: { organizationId, isArchived: false },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ])

  return { subscription, profile, projects }
}
```

Cada repository deve:
1. Usar `import "server-only"`.
2. Importar `db` de `@/lib/db`.
3. Especificar `select` (Prisma) ou colunas explícitas (Drizzle) — **sem exceção**.
4. Usar `Promise.all` para queries independentes.
5. Não conter regra de negócio.
6. Não validar input de formulário.

## Schemas Compartilhados

Mesmo schema Zod para client (formulário) e server (service):

```ts
// features/cases/schemas/create-case.schema.ts
import { z } from "zod"

export const createCaseSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
```

Client (react-hook-form):
```ts
import { createCaseSchema } from "@/features/cases/schemas/create-case.schema"
const form = useForm({ resolver: zodResolver(createCaseSchema) })
```

Server (service):
```ts
import { createCaseSchema } from "../schemas/create-case.schema"
const parsed = createCaseSchema.safeParse(input)
```

## Cache (Next.js 16 — estável)

No Next.js 16, o modelo é **dinâmico por padrão**. Cache é opt-in explícito via `"use cache"`.

### `"use cache"` — diretiva estável

Colocar no topo de um arquivo (cacheia todas as funções exportadas) ou dentro de uma função específica:

```ts
// Cacheia toda a função
import { cacheLife, cacheTag } from "next/cache"

async function getCasesForOrg(organizationId: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(`org-cases:${organizationId}`)

  return findCasesByOrgRepository(organizationId)
}

// Cacheia todo o arquivo
"use cache"
import { cacheLife } from "next/cache"

export async function getPublicConfig() {
  cacheLife("max")
  return { version: "1.0", features: [...] }
}
```

### `cacheLife` — perfis de cache

```ts
cacheLife("seconds")   // stale: 0s,  revalidate: 1s,   expire: 1min
cacheLife("minutes")   // stale: 0s,  revalidate: 1min, expire: 1h
cacheLife("hours")     // stale: 30s, revalidate: 1h,   expire: 1d
cacheLife("days")      // stale: 1h,  revalidate: 1d,   expire: 1wk
cacheLife("weeks")     // stale: 1d,  revalidate: 1wk,  expire: 1mo
cacheLife("max")       // stale: 1wk, revalidate: 1mo,  expire: 1yr (estático puro)
```

### Invalidação de cache

`revalidateTag` — agenda revalidação (assíncrono, fundo):
```ts
import { revalidateTag } from "next/cache"
revalidateTag(`org-cases:${organizationId}`)
```

`updateTag` — invalida imediatamente na mesma request (Server Actions only, read-your-writes):
```ts
import { updateTag } from "next/cache"
updateTag(`case:${caseId}`)  // apenas em "use server"
```

### Ativar Partial Prerendering (PPR)

```ts
// next.config.ts
export default {
  cacheComponents: true,  // habilita PPR + Cache Components
}
```

Com PPR ativo, partes estáticas (cacheadas) e dinâmicas coexistem na mesma página sem `dynamic = "force-dynamic"`.

### React `cache()` para deduplicação no request

```ts
import { cache } from "react"
import { findCaseById } from "../repositories/find-case-by-id.repository"

export const getCaseById = cache(findCaseById)
// Múltiplos Server Components chamando getCaseById com mesmo ID = 1 query
```

## Rendering no Next.js 16

**Regra fundamental**: Next.js 16 é **dinâmico por padrão**. Para cache, use `"use cache"` explicitamente.

```ts
// DINÂMICO por padrão — sem necessidade de force-dynamic
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // params é Promise no Next.js 16 — sempre await
  const data = await fetchData(id)  // executa a cada request
  return <div>{data.title}</div>
}

// CACHEADO — opt-in explícito
async function fetchData(id: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(`item:${id}`)
  return findItemById(id)
}
```

Funções dinâmicas obrigatoriamente com `await` no Next.js 16:

```ts
// CORRETO
const cookieStore = await cookies()
const headerList = await headers()
const { id } = await params
const { q } = await searchParams

// ERRADO — síncrono não é mais suportado
const cookieStore = cookies()  // TS error
```

`connection()` para opt-in dinâmico explícito quando não há `cookies()`/`headers()` direto:

```ts
import { connection } from "next/server"

export default async function Page() {
  await connection()  // garante renderização dinâmica
  const data = await fetchSensitiveData()
  return <div>{data}</div>
}
```

## Streaming com Suspense

Isolar Server Components lentos para não bloquear o layout:

```tsx
// app/(dashboard)/cases/page.tsx
import { Suspense } from "react"
import { CaseList } from "@/features/cases/components/case-list"
import { CaseListSkeleton } from "@/features/cases/components/case-list-skeleton"

export default function CasesPage() {
  return (
    <div>
      <h1>Cases</h1>
      <Suspense fallback={<CaseListSkeleton />}>
        <CaseList />  {/* Server Component com await interno */}
      </Suspense>
    </div>
  )
}
```

Regra: cada seção independente da página deve ter seu próprio `<Suspense>`. Nunca `await` na raiz do page que bloqueia tudo.

## Error, Not Found e Loading

```ts
// Em route handlers: HTTP explícito
return apiError("Recurso não encontrado", 404)

// Em Server Components: funções do Next.js
import { notFound } from "next/navigation"
if (!record) notFound()  // renderiza not-found.tsx do segmento mais próximo
```

Cada `(grupo)/` ou rota com dados deve ter:
- `loading.tsx` — skeleton exibido automaticamente pelo Suspense do layout
- `error.tsx` — captura erros inesperados (`"use client"` obrigatório)
- `not-found.tsx` — para `notFound()` explícito

## Exports Públicos da Feature

`index.ts` exporta apenas API pública segura da feature:

```ts
// features/cases/index.ts
export { CaseForm } from "./components/case-form"
export { createCaseSchema } from "./schemas/create-case.schema"
export type { CreateCaseInput, CaseDTO } from "./types"
```

Não exportar: Actions, Services, Repositories, tipos internos do banco.

Actions importadas explicitamente para deixar o boundary claro:
```ts
import { createCaseAction } from "@/features/cases/actions/create-case.action"
```

## Server Boundaries

Arquivos que acessam banco, secrets ou autenticação devem usar `import "server-only"`. Isso inclui Services, Repositories, e qualquer arquivo em `server/` ou `lib/db/`.

Arquivos de utilitários puros em `lib/` (formatação, validação, constantes) não precisam de `server-only`.

## Validação de Entrada

Toda entrada vinda de Server Action, API Route, formulário, query string ou client deve ser tratada como `unknown`. O service valida com schema.

Correto:
```ts
export async function createCaseService(userId: string, input: unknown) {
  const data = createCaseSchema.safeParse(input)
  if (!data.success) return { error: "Inválido", status: 400 as const }
  // ...
}
```

Errado:
```ts
export async function createCaseService(userId: string, input: CreateCaseInput) {
  // TypeScript não valida em runtime — dados externos podem não bater com o tipo
}
```

## Testes e TDD

A separação estrita de responsabilidades desta arquitetura foi desenhada para facilitar testes e o fluxo **TDD (Test-Driven Development)**:

1. **Testes Co-localizados**: Arquivos de teste devem residir **junto** à implementação. Exemplo: `features/cases/services/create-case.service.test.ts`.
2. **Foco nos Services**: Por serem funções puras (assíncronas) marcadas com `"server-only"` e que não dependem de contexto HTTP (`Request`, `NextResponse`), os **Services** são ideais para testes unitários. Você pode mockar o Repository e focar apenas na regra de negócio.
3. **Schemas Independentes**: Teste a validação do Zod separadamente para garantir que rejeita dados inválidos e formata erros corretamente.
4. **Integração nos Repositories**: Teste os Repositories preferencialmente com um banco de dados de testes (integração real).
5. **Ciclo Red-Green-Refactor**: Comece escrevendo o teste do Service definindo os retornos esperados (`{ data }` ou `{ error, status }`) e validações de input, implemente a lógica, e depois refatore com segurança.

## Critério de Conclusão

Uma tarefa só está pronta se:

1. Segue o fluxo: Component → Query/Mutation → Route/Action → Service → Repository → DB.
2. Arquivos pequenos e especializados (um por intenção).
3. `index.ts` limpo de código server-only.
4. `getCurrentUserId` usado para autenticação — sem lógica de sessão duplicada.
5. Todo acesso ao banco tem `select`/colunas explícitos.
6. Queries independentes usam `Promise.all`.
7. Env vars acessadas via `env.ts`, nunca `process.env` direto.
8. `cookies()`, `headers()`, `params`, `searchParams` usados com `await`.
9. Cache via `"use cache"` + `cacheLife` + `cacheTag` onde aplicável.
10. Lógica de negócio coberta por testes unitários e arquivos `.test.ts` posicionados corretamente.
11. Build e type-check sem erros.
