---
name: next-frontend-architecture
description: Use esta skill ao criar, alterar ou revisar frontend em projetos Next.js App Router, especialmente Next.js 16+, com Server Components, Client Components, forms, mutations, queries, estado, UI, URL state, loading, error states e separação de responsabilidades por feature.
---

# Skill: Next.js Frontend Architecture

## Objetivo

Guiar o desenvolvimento frontend em projetos Next.js usando App Router, arquitetura por features, Server Components por padrão, Client Components apenas quando necessários e separação clara entre telas, componentes, formulários, queries, mutations, actions, services e UI compartilhada.

A prioridade é manter o frontend previsível, performático, fácil de manter, seguro em relação aos limites server/client e consistente com o restante da arquitetura do projeto.

## Princípios obrigatórios

1. Usar Server Components por padrão.
2. Usar Client Components apenas quando houver interatividade real.
3. Manter arquivos em `app/` pequenos e focados em roteamento e composição.
4. Colocar UI específica dentro de `features/[domain]`.
5. Colocar UI genérica em `src/components/ui`.
6. Separar screens, components, forms, dialogs, queries e mutations.
7. Não usar `useEffect` para fluxo normal de dados.
8. Não buscar dados iniciais com `useEffect`.
9. Não usar Zustand para dados vindos do servidor.
10. Não importar services, repositories, `db`, Drizzle ou Prisma em Client Components.
11. Não importar arquivos server-only em componentes client.
12. Validar dados com schemas compartilhados.
13. Usar URL state para filtros, busca, paginação e tabs compartilháveis.
14. Garantir loading, error, empty e success states em telas relevantes.
15. Manter componentes pequenos e com responsabilidade única.

## Estrutura recomendada

Use esta estrutura como referência:

```txt
src/
  app/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx

  components/
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Dialog.tsx
      Card.tsx
      Badge.tsx
      Form.tsx
    layout/
      AppShell.tsx
      Sidebar.tsx
      Header.tsx

  features/
    [domain]/
      screens/
      components/
      forms/
      dialogs/
      queries/
      mutations/
      schemas/
      mappers/
      actions.ts
      types.ts
      index.ts

  hooks/
  lib/
  config/
  constants/
  types/
```

Exemplo para o domínio `cases`:

```txt
features/cases/
  screens/
    CasesScreen.tsx
    CaseDetailsScreen.tsx

  components/
    CaseCard.tsx
    CaseList.tsx
    CaseEmptyState.tsx
    CaseErrorState.tsx
    CaseMedicationList.tsx

  forms/
    CreateCaseForm.tsx
    LinkMedicationForm.tsx

  dialogs/
    CreateCaseDialog.tsx
    LinkMedicationDialog.tsx

  queries/
    cases.query-keys.ts
    use-cases-query.ts
    use-case-query.ts

  mutations/
    use-create-case-mutation.ts
    use-link-medication-mutation.ts
    use-delete-case-mutation.ts

  schemas/
    create-case.schema.ts
    link-medication.schema.ts
    case-search-params.schema.ts

  mappers/
    case.mapper.ts

  actions.ts
  types.ts
  index.ts
```

## Responsabilidade de `app/`

Arquivos em `app/` devem ser finos.

Uma página pode:

1. Receber `params`.
2. Receber `searchParams`.
3. Validar rota e autorização quando necessário.
4. Chamar uma screen da feature.
5. Definir metadata.
6. Chamar `notFound`, `redirect` ou `unauthorized` quando aplicável.

Uma página não deve:

1. Conter formulário grande.
2. Conter regra de negócio.
3. Fazer mutation diretamente.
4. Ter JSX complexo.
5. Acessar banco diretamente quando já existe service.
6. Misturar múltiplos domínios sem composição clara.

Exemplo:

```tsx
import { CasesScreen } from "@/features/cases/screens/CasesScreen";

export default function Page() {
  return <CasesScreen />;
}
```

Com `searchParams`:

```tsx
import { CasesScreen } from "@/features/cases/screens/CasesScreen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return <CasesScreen searchParams={resolvedSearchParams} />;
}
```

## Server Components

Use Server Components por padrão.

Use Server Components para:

1. Buscar dados iniciais.
2. Renderizar telas estáticas ou semi-estáticas.
3. Acessar services server-side.
4. Reduzir JavaScript enviado ao client.
5. Compor layout e conteúdo.
6. Ler `params` e `searchParams`.

Exemplo:

```tsx
import { listCasesService } from "../services/list-cases.service";
import { CaseList } from "../components/CaseList";

export async function CasesScreen() {
  const cases = await listCasesService();

  return <CaseList cases={cases} />;
}
```

Um Server Component não deve usar:

1. `useState`.
2. `useEffect`.
3. Event handlers como `onClick` e `onChange`.
4. Browser APIs como `window`, `document` e `localStorage`.
5. TanStack Query hooks.
6. React Hook Form.
7. Zustand client stores.

## Client Components

Use Client Components apenas quando necessário.

Um arquivo deve usar `"use client"` quando precisar de:

1. Estado local com `useState`.
2. Event handlers.
3. Browser APIs.
4. React Hook Form.
5. TanStack Query.
6. Toasts client-side.
7. Modais interativos.
8. Tabs interativas.
9. Drag and drop.
10. SDKs client-side.

Exemplo:

```tsx
"use client";

import { useState } from "react";

export function ExpandableCard({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section>
      <button type="button" onClick={() => setIsOpen((value) => !value)}>
        Alternar
      </button>

      {isOpen ? children : null}
    </section>
  );
}
```

Não transforme uma tela inteira em Client Component sem necessidade.

Prefira isolar a parte interativa:

```txt
CasesScreen.tsx
  Server Component

CreateCaseDialog.tsx
  Client Component

CreateCaseForm.tsx
  Client Component
```

## Regra para `useEffect`

`useEffect` deve ser exceção, não padrão.

Não use `useEffect` para:

1. Buscar dados iniciais.
2. Derivar estado.
3. Copiar props para state.
4. Sincronizar formulário com props sem necessidade.
5. Chamar mutation automaticamente no mount.
6. Controlar loading de fetch manual.
7. Montar a tela depois do primeiro render.
8. Reproduzir padrões de SPA antiga.

Use `useEffect` apenas para sincronizar com sistemas externos ao React, como:

1. `window.addEventListener`.
2. `document`.
3. `localStorage`.
4. `setInterval`.
5. `setTimeout` persistente.
6. WebSocket.
7. Analytics.
8. SDKs client-side.
9. Observers.
10. Bibliotecas imperativas de terceiros.

Exemplo correto:

```tsx
"use client";

import { useEffect } from "react";

export function AnalyticsPageView() {
  useEffect(() => {
    window.analytics?.track("page_view");
  }, []);

  return null;
}
```

Exemplo ruim:

```tsx
"use client";

import { useEffect, useState } from "react";

export function CasesList() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    fetch("/api/cases")
      .then((response) => response.json())
      .then(setCases);
  }, []);

  return null;
}
```

Alternativas corretas:

1. Server Component para dados iniciais.
2. TanStack Query ou SWR para dados client-side dinâmicos.
3. Server Actions ou mutation hooks para escrita.
4. Cálculo direto no render para estado derivado.
5. React Hook Form para estado de formulário.

## Screens

Screens representam telas ou grandes seções da feature.

Use:

```txt
features/[domain]/screens/
  [Domain]Screen.tsx
  [Domain]DetailsScreen.tsx
```

Uma screen pode:

1. Buscar dados server-side quando for Server Component.
2. Receber dados vindos de `app/`.
3. Validar `searchParams`.
4. Compor componentes da feature.
5. Compor components de `src/components/ui`.
6. Definir layout interno da feature.

Uma screen não deve:

1. Ter mutation client-side se for Server Component.
2. Conter formulário grande inline.
3. Acessar repository diretamente.
4. Acessar `db` diretamente.
5. Misturar lógica de muitas features.

Exemplo:

```tsx
import { listCasesService } from "../services/list-cases.service";
import { CaseEmptyState } from "../components/CaseEmptyState";
import { CaseList } from "../components/CaseList";
import { CreateCaseDialog } from "../dialogs/CreateCaseDialog";

export async function CasesScreen() {
  const cases = await listCasesService();

  return (
    <main>
      <header>
        <h1>Casos</h1>
        <CreateCaseDialog />
      </header>

      {cases.length > 0 ? <CaseList cases={cases} /> : <CaseEmptyState />}
    </main>
  );
}
```

## Components

Componentes específicos do domínio ficam em:

```txt
features/[domain]/components/
```

Componentes genéricos ficam em:

```txt
src/components/ui/
```

Componentes da feature podem:

1. Receber DTOs por props.
2. Renderizar UI específica do domínio.
3. Chamar callbacks recebidos por props.
4. Usar componentes de `src/components/ui`.

Componentes da feature não devem:

1. Acessar banco.
2. Importar repositories.
3. Importar services server-only em Client Components.
4. Conter regra de negócio sensível.
5. Fazer fetch manual com `useEffect`.

Exemplo:

```tsx
import { Card } from "@/components/ui/Card";

import type { CaseCardDTO } from "../types";

export function CaseCard({ item }: { item: CaseCardDTO }) {
  return (
    <Card>
      <h2>{item.initials}</h2>
      <p>{item.ageLabel}</p>
    </Card>
  );
}
```

## UI compartilhada

Componentes em `src/components/ui` devem ser genéricos, reutilizáveis e sem regra de domínio.

Eles podem:

1. Receber props.
2. Renderizar HTML e estilos.
3. Expor variantes visuais.
4. Emitir eventos.
5. Suportar acessibilidade.

Eles não devem:

1. Chamar Server Actions.
2. Chamar services.
3. Chamar repositories.
4. Fazer fetch de dados.
5. Conhecer entidades do domínio.
6. Importar arquivos de `features/[domain]`.

Exemplo permitido:

```tsx
export function Button({
  children,
  type = "button",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return <button type={type}>{children}</button>;
}
```

Exemplo proibido:

```tsx
import { createCaseAction } from "@/features/cases/actions";

export function Button() {
  return <button formAction={createCaseAction}>Criar caso</button>;
}
```

## Forms

Forms devem ficar em:

```txt
features/[domain]/forms/
```

Todo formulário deve ter schema associado em:

```txt
features/[domain]/schemas/
```

Forms simples podem usar Server Actions diretamente.

Forms complexos devem usar:

1. React Hook Form.
2. Zod Resolver.
3. Mutation da feature.
4. Feedback visual de loading, erro e sucesso.
5. Schema compartilhado com o service.

Mesmo quando o formulário valida no client, a validação crítica deve acontecer novamente no service.

Exemplo de form client:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createCaseSchema, type CreateCaseInput } from "../schemas/create-case.schema";
import { useCreateCaseMutation } from "../mutations/use-create-case-mutation";

export function CreateCaseForm() {
  const form = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      initials: "",
    },
  });

  const createCase = useCreateCaseMutation();

  function onSubmit(data: CreateCaseInput) {
    createCase.mutate(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("initials")} />
      <button type="submit" disabled={createCase.isPending}>
        Criar caso
      </button>
    </form>
  );
}
```

## Server Actions no frontend

Server Actions são a ponte entre UI client e services server-side.

Client Components podem chamar actions por meio de:

1. `form action`.
2. `formAction`.
3. Mutation hooks.
4. Event handlers, quando fizer sentido.

A action deve continuar fina:

```txt
action
  autentica
  chama service

service
  valida schema
  aplica regra
  chama repository
```

Client Component não deve importar service diretamente.

Correto:

```tsx
"use client";

import { useCreateCaseMutation } from "../mutations/use-create-case-mutation";

export function CreateCaseButton() {
  const createCase = useCreateCaseMutation();

  return (
    <button type="button" onClick={() => createCase.mutate({ initials: "AB" })}>
      Criar
    </button>
  );
}
```

Mutation:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCaseAction } from "../actions";
import { casesQueryKeys } from "../queries/cases.query-keys";

export function useCreateCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCaseAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casesQueryKeys.lists() });
    },
  });
}
```

## Mutations

Mutations client-side ficam em:

```txt
features/[domain]/mutations/
```

Use nomes assim:

```txt
use-create-case-mutation.ts
use-update-case-mutation.ts
use-delete-case-mutation.ts
use-link-medication-mutation.ts
```

Uma mutation pode:

1. Chamar Server Action.
2. Chamar API Route quando houver API pública ou integração externa.
3. Controlar loading.
4. Controlar erro.
5. Invalidar queries.
6. Atualizar cache otimisticamente quando fizer sentido.
7. Disparar toast quando apropriado.
8. Redirecionar quando fizer sentido.

Uma mutation não deve:

1. Acessar banco.
2. Importar `db`.
3. Importar Drizzle ou Prisma.
4. Importar repository.
5. Importar service server-only.
6. Substituir validação do service.
7. Conter regra sensível de domínio.

## Queries

Queries client-side ficam em:

```txt
features/[domain]/queries/
```

Use queries client-side quando houver:

1. Filtros interativos.
2. Paginação dinâmica.
3. Refetch.
4. Cache no client.
5. Atualização após mutation.
6. Dados que mudam sem navegação.
7. UX rica sem recarregar a tela.

Para dados iniciais, prefira Server Components.

Estrutura recomendada:

```txt
queries/
  cases.query-keys.ts
  use-cases-query.ts
  use-case-query.ts
```

Query keys:

```ts
export const casesQueryKeys = {
  all: ["cases"] as const,
  lists: () => [...casesQueryKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...casesQueryKeys.lists(), filters] as const,
  details: () => [...casesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...casesQueryKeys.details(), id] as const,
};
```

Query hook:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { casesQueryKeys } from "./cases.query-keys";

async function getCasesRequest() {
  const response = await fetch("/api/cases");

  if (!response.ok) {
    throw new Error("Erro ao buscar casos.");
  }

  return response.json();
}

export function useCasesQuery() {
  return useQuery({
    queryKey: casesQueryKeys.lists(),
    queryFn: getCasesRequest,
  });
}
```

## Estado

Separe os tipos de estado.

```txt
Server state
  dados vindos do servidor
  Server Components, TanStack Query ou SWR

Form state
  React Hook Form

UI state local
  useState

UI state global
  Zustand apenas quando necessário

URL state
  searchParams
```

Não use Zustand para dados vindos do servidor.

Use Zustand apenas para UI global, como:

1. Sidebar aberta ou fechada.
2. Tema.
3. Modal global.
4. Estado global de wizard.
5. Preferências visuais.

Não use Zustand para:

1. Lista de casos.
2. Usuário autenticado vindo do servidor.
3. Medicações vindas do banco.
4. Sessões clínicas.
5. Dados que precisam de cache, refetch e invalidação.

## URL State

Filtros, busca, paginação, ordenação e tabs compartilháveis devem morar na URL.

Exemplo:

```txt
/cases?search=ana&page=2&status=active
```

Use schema para validar `searchParams`.

```ts
import { z } from "zod";

export const caseSearchParamsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  status: z.enum(["active", "archived"]).optional(),
});
```

Evite guardar filtros compartilháveis apenas em `useState`.

Use `useState` apenas para filtros efêmeros que não precisam sobreviver a refresh, compartilhamento de link ou navegação.

## Loading, Error, Empty e Success States

Toda tela de listagem deve prever:

1. Loading state.
2. Error state.
3. Empty state.
4. Success state.

Use convenções de rota quando o estado for da rota:

```txt
app/app/cases/
  loading.tsx
  error.tsx
  not-found.tsx
```

Use componentes da feature quando o estado for de uma seção:

```txt
features/cases/components/
  CaseEmptyState.tsx
  CaseErrorState.tsx
  CaseListSkeleton.tsx
```

Exemplo:

```tsx
export function CaseEmptyState() {
  return (
    <section>
      <h2>Nenhum caso encontrado</h2>
      <p>Crie o primeiro caso para começar.</p>
    </section>
  );
}
```

## DTOs e mappers para UI

Evite passar entidades cruas do banco profundamente pela árvore de componentes.

Fluxo recomendado:

```txt
repository
  retorna entity

service
  aplica regra

mapper
  transforma em DTO

component
  recebe DTO
```

Exemplo:

```ts
export type CaseCardDTO = {
  id: string;
  initials: string;
  ageLabel: string;
  medicationsCount: number;
};
```

Mapper:

```ts
import type { PatientCaseEntity } from "../db.types";
import type { CaseCardDTO } from "../types";

export function toCaseCardDTO(item: PatientCaseEntity): CaseCardDTO {
  return {
    id: item.id,
    initials: item.initials,
    ageLabel: item.birthYear ? `${new Date().getFullYear() - item.birthYear} anos` : "Idade não informada",
    medicationsCount: 0,
  };
}
```

Component:

```tsx
import type { CaseCardDTO } from "../types";

export function CaseCard({ item }: { item: CaseCardDTO }) {
  return <article>{item.initials}</article>;
}
```

## Index público da feature

O `index.ts` da feature deve exportar apenas API pública segura para frontend.

Pode exportar:

1. Components públicos.
2. Screens públicas, quando fizer sentido.
3. Forms públicos.
4. Schemas usados por forms.
5. Types públicos.
6. Constants públicas.

Não deve exportar:

1. Actions.
2. Services.
3. Repositories.
4. DB types internos.
5. Arquivos server-only.
6. Query internals sem necessidade.

Exemplo:

```ts
export { CasesScreen } from "./screens/CasesScreen";
export { CreateCaseForm } from "./forms/CreateCaseForm";
export { createCaseSchema } from "./schemas/create-case.schema";

export type { CaseCardDTO } from "./types";
```

Actions devem ser importadas explicitamente:

```ts
import { createCaseAction } from "@/features/cases/actions";
```

## Imports proibidos no client

Client Components não devem importar:

```txt
@/server/*
@/features/*/repositories/*
@/features/*/services/*
@/features/*/db.types
@/server/db/*
drizzle-orm
@prisma/client
server-only
next/headers
next/cookies
```

Client Components podem importar:

```txt
@/components/ui/*
@/features/[domain]/components/*
@/features/[domain]/forms/*
@/features/[domain]/queries/*
@/features/[domain]/mutations/*
@/features/[domain]/schemas/*
@/features/[domain]/types
```

## Composição entre features

Features devem evitar importar internals de outras features.

Prefira composição em `app/` ou em uma screen de nível superior.

Bom:

```tsx
import { UserSummary } from "@/features/users";
import { RecentCases } from "@/features/cases";

export default function DashboardPage() {
  return (
    <>
      <UserSummary />
      <RecentCases />
    </>
  );
}
```

Evite:

```tsx
import { RecentCases } from "@/features/cases/components/RecentCases";

export function UserProfile() {
  return <RecentCases />;
}
```

Quando uma feature precisar usar outra, importe pela API pública do `index.ts` ou mova a composição para a página.

## Estilo de componentes

Prefira componentes pequenos e explícitos.

Diretrizes:

1. Um componente deve ter uma responsabilidade clara.
2. Evite componentes com mais de 150 linhas.
3. Extraia subcomponentes quando houver seções independentes.
4. Evite props genéricas demais como `data` quando existir tipo claro.
5. Evite componentes que buscam dados, controlam formulário, fazem mutation e renderizam layout ao mesmo tempo.

Exemplo de divisão:

```txt
CasesScreen.tsx
  compõe a tela

CaseList.tsx
  renderiza lista

CaseCard.tsx
  renderiza item

CreateCaseDialog.tsx
  controla modal

CreateCaseForm.tsx
  controla formulário
```

## Acessibilidade

Todo componente interativo deve considerar acessibilidade.

Regras:

1. Botões devem usar `button`.
2. Links de navegação devem usar `Link` ou `a`.
3. Inputs devem ter label acessível.
4. Estados de erro devem ser legíveis por leitores de tela quando possível.
5. Modais devem gerenciar foco.
6. Ícones interativos devem ter texto acessível.
7. Não use `div` clicável quando `button` resolve.

Exemplo ruim:

```tsx
<div onClick={onClose}>Fechar</div>
```

Exemplo correto:

```tsx
<button type="button" onClick={onClose}>
  Fechar
</button>
```

## Performance

Regras:

1. Não transforme componentes server em client sem necessidade.
2. Isole Client Components na menor árvore possível.
3. Evite passar objetos grandes para Client Components.
4. Use DTOs específicos para UI.
5. Evite `useEffect` para fetch inicial.
6. Evite stores globais para dados do servidor.
7. Use cache e revalidação de forma explícita quando necessário.
8. Use loading states para streaming e suspense quando aplicável.
9. Evite importar bibliotecas pesadas em componentes globais.

## Padrão para criar uma tela nova

Ao criar uma tela nova:

1. Identifique o domínio.
2. Crie ou reutilize `features/[domain]`.
3. Crie uma screen em `features/[domain]/screens`.
4. Deixe `app/` apenas chamando a screen.
5. Crie components específicos em `components/`.
6. Crie forms em `forms/` quando houver entrada de dados.
7. Crie schema em `schemas/`.
8. Crie mutation em `mutations/` se houver escrita client-side.
9. Crie query em `queries/` se houver leitura client-side dinâmica.
10. Use service server-side para dados iniciais quando fizer sentido.
11. Adicione loading, error e empty states.
12. Exporte apenas itens públicos pelo `index.ts`.

## Padrão para criar um formulário novo

Ao criar um formulário novo:

1. Criar schema em `schemas/`.
2. Criar ou reutilizar action em `actions.ts`.
3. Garantir que o service valide novamente o input.
4. Criar mutation em `mutations/` se o form for client-side rico.
5. Criar form em `forms/`.
6. Usar componentes de `src/components/ui`.
7. Exibir erros por campo.
8. Exibir loading no submit.
9. Invalidar queries após sucesso.
10. Fechar dialog ou redirecionar quando fizer sentido.

## Padrão para busca e filtros

Ao criar busca, filtros ou paginação:

1. Preferir URL state com `searchParams`.
2. Criar schema para validar `searchParams`.
3. Criar componente de filtros dentro da feature.
4. Atualizar URL em vez de manter estado isolado quando o filtro for compartilhável.
5. Buscar dados server-side quando possível.
6. Usar query client-side quando a UX exigir refetch sem navegação.

## Checklist de revisão

Antes de concluir uma alteração frontend, verifique:

1. A página em `app/` está fina.
2. Server Components foram usados por padrão.
3. Client Components estão restritos ao necessário.
4. Não há fetch inicial com `useEffect`.
5. Não há `useEffect` para estado derivado.
6. Não há import de service server-only em Client Component.
7. Não há import de repository no frontend.
8. Não há import de `db`, Drizzle ou Prisma no frontend.
9. Forms usam schemas.
10. Services validam novamente os inputs críticos.
11. Mutations invalidam queries relacionadas.
12. Query keys estão padronizadas.
13. Estado vindo do servidor não está em Zustand.
14. Filtros compartilháveis usam URL state.
15. Listagens têm loading, error e empty state.
16. Components genéricos continuam em `src/components/ui`.
17. Components específicos continuam dentro da feature.
18. O `index.ts` não exporta server internals.
19. Arquivos continuam pequenos.
20. Lint, typecheck e testes foram executados quando disponíveis.

## Anti-padrões

Não faça:

1. `useEffect` para buscar dados iniciais.
2. `useEffect` para copiar props para state.
3. `useEffect` para calcular estado derivado.
4. `"use client"` em página inteira sem necessidade.
5. Client Component importando service.
6. Client Component importando repository.
7. Client Component importando `db`.
8. UI compartilhada conhecendo domínio.
9. Feature importando internals de outra feature.
10. Zustand armazenando server state.
11. Form sem schema.
12. Mutation sem invalidação de cache quando a lista relacionada muda.
13. Componentes gigantes com layout, fetch, form e mutation juntos.
14. `index.ts` exportando actions, services e repositories.
15. Filtros importantes presos em estado local.

## Critério de conclusão

Considere a tarefa concluída quando:

1. O frontend respeita os limites server/client.
2. A tela está organizada dentro da feature correta.
3. O `app/` está fino.
4. Server Components foram usados sempre que possível.
5. Client Components existem apenas por necessidade.
6. `useEffect` não foi usado para fluxo normal de dados.
7. Forms, queries e mutations estão em pastas próprias.
8. Schemas validam entradas relevantes.
9. Loading, error e empty states foram tratados.
10. Não há vazamento de banco ou server-only para o client.
11. O código está pequeno, legível e consistente com a arquitetura do projeto.
