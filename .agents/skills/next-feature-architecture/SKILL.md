---
name: next-feature-architecture
description: Use esta skill ao criar, alterar ou revisar código em projetos Next.js que seguem arquitetura por features, separação forte de responsabilidades, arquivos pequenos, services, repositories, schemas, hooks, mutations, API routes e acesso organizado ao banco de dados.
---

# Skill: Next.js Feature Architecture

## Objetivo

Guiar o desenvolvimento em projetos Next.js usando uma arquitetura modular por domínio, com responsabilidades bem separadas, arquivos pequenos e baixo acoplamento entre features.

A prioridade é manter o código previsível, fácil de navegar, fácil de testar e seguro para server/client boundaries.

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
11. Evitar useEffect, usando apenas em casos estritamente justificados.
12. Priorizar TanStack Query para busca e sincronização de dados.
13. Em Next.js 16+, usar `src/proxy.ts` em vez de `src/middleware.ts`.
14. Usar Cache Components com a diretiva `'use cache'` e a função `cacheLife()` para controle de cache granulado.
15. Focar em performance de consultas e renderização (ex: react-virtuoso para listas longas).
16. **IDs e UUIDs**: Proibido gerar IDs no código (ex: `cuid`, `nanoid`). Sempre use `uuid` com a responsabilidade de geração delegada ao PostgreSQL (`.defaultRandom()`).

## Estrutura padrão do projeto

Use esta estrutura como referência principal:

```txt
src/
  app/
    api/
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

  lib/
    db/
      prisma.ts
    utils.ts

  config/
  constants/
  types/
```

## Responsabilidade de cada diretório

### `src/app`

Use para rotas, layouts, páginas, handlers HTTP e composição entre features.

Não coloque regra de negócio complexa em `app/`.

### `src/app/api`

Use apenas como camada HTTP. Uma API route deve ler a request, chamar um service da feature e retornar a response. Não deve acessar o banco diretamente.

## Features

Cada domínio deve ficar em `src/features/[domain]/`. Tudo que é específico daquele domínio deve morar dentro da feature.

## Regra de camadas (Fluxo de Dados)

Siga este fluxo rigorosamente:

```txt
Component
  chama hook, query ou mutation

Mutation ou Query
  chama API route ou Server Action

Server Action
  "use server"
  pega usuário autenticado (getCurrentUserId)
  chama service passando input (unknown)

Service
  "server-only"
  valida input com schema (parse)
  aplica regra de negócio
  chama repository

Repository
  "server-only"
  acessa o banco de dados (prisma)

lib/db/prisma.ts
  fornece a conexão com o banco
```

## Server Actions

Server Actions devem ser uma camada fina entre o client e os services.

Uma action deve:

1. Usar `"use server"`.
2. Autenticar o usuário quando necessário.
3. Receber input como `unknown`.
4. Chamar um service da feature.
5. Não conter regra de negócio.
6. Não acessar banco diretamente.
7. Não validar manualmente quando já existe schema.

Exemplo correto:

```ts
"use server";

import { getCurrentUserId } from "@/server/auth/get-current-user-id";
import { createCaseService } from "./services/create-case.service";
import { listCasesService } from "./services/list-cases.service";

export async function createCaseAction(input: unknown) {
	const userId = await getCurrentUserId();
	return createCaseService(userId, input);
}

export async function listCasesAction() {
	const userId = await getCurrentUserId();
	return listCasesService(userId);
}
```

Evite:

```ts
"use server";

import { prisma } from "@/lib/db/prisma";

export async function createCaseAction(input: CreateCaseInput) {
	return prisma.patientCase.create({ data: input });
}
```

Server Actions não devem importar `prisma`, ORMs ou repositories diretamente quando houver service.

## Autenticação em Actions

Não duplique lógica de sessão dentro das features. Crie um helper compartilhado em `src/server/auth/get-current-user-id.ts`.

Exemplo:

```ts
import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCurrentUserId() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		throw new Error("Não autorizado");
	}

	return session.user.id;
}
```

As features devem chamar esse helper em vez de repetir lógica de sessão.

## Validação de Entrada

Toda entrada que vem de Server Action, API Route, formulário, query string ou client deve ser tratada como `unknown`. O service é responsável por validar o input com schema.

Correto:

```ts
export async function createCaseService(userId: string, input: unknown) {
	const data = createCaseSchema.parse(input);
	return createCaseRepository(userId, data);
}
```

Evite:

```ts
export async function createCaseService(userId: string, input: CreateCaseInput) {
	return createCaseRepository(userId, input);
}
```

Motivo: TypeScript não valida dados em runtime. O uso de `unknown` força a validação.

## Services Pequenos

Services representam casos de uso. Use um arquivo por caso de uso.

Cada service deve:

1. Usar `import "server-only"`.
2. Receber input como `unknown` quando vier do client.
3. Validar com schema.
4. Aplicar regra de negócio.
5. Chamar repositories.
6. Retornar dados do domínio ou DTOs.

Services não devem:

1. Importar `prisma` diretamente.
2. Importar `NextResponse`.
3. Receber `Request`.
4. Ter JSX.
5. Ser usados em Client Components.

## Repositories Pequenos

Repositories devem ser separados por operação de banco. Um arquivo por operação.

Use:

```txt
repositories/
  create-case.repository.ts
  find-case-by-id.repository.ts
```

Cada repository deve:

1. Usar `import "server-only"`.
2. Importar `prisma` de `@/lib/db/prisma`.
3. Executar uma operação clara de banco.
4. Não conter regra de negócio.
5. Não validar input de formulário.

## Exports Públicos da Feature

O arquivo `index.ts` da feature deve exportar apenas a API pública segura da feature.

Pode exportar:

1. Components públicos.
2. Schemas que podem ser usados por formulários.
3. Types públicos.
4. Constants públicas.

Não deve exportar:

1. Actions.
2. Services.
3. Repositories.
4. DB types internos.

Exemplo recomendado (`index.ts`):

```ts
export { CaseForm } from "./components/CaseForm";
export { createCaseSchema } from "./schemas/create-case.schema";
export type { CaseDTO } from "./types";
```

Actions devem ser importadas explicitamente de seus arquivos para deixar claro o boundary:

```ts
import { createCaseAction } from "@/features/cases/actions";
```

## Server boundaries

Qualquer arquivo que acessa banco, secrets ou autenticação deve usar `import "server-only"`. Isso inclui Services, Repositories e arquivos nas pastas `server/` e `lib/`.

## Critério de conclusão

Uma tarefa só está pronta se:

1. Seguir o fluxo: Action (unknown) -> Service (parse) -> Repository (db).
2. Tiver arquivos pequenos e especializados (um por intenção).
3. `index.ts` estiver limpo de código server-only.
4. `getCurrentUserId` for usado para autenticação.
5. Estiver 100% livre de erros de lint.
