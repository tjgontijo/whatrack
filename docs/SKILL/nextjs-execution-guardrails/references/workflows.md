# Workflows

## Workflow: Nova Feature

1. Confirmar objetivo funcional e criterio de aceite implicito no pedido.
2. Consultar `directory-map.md` para identificar onde cada camada sera criada.
3. Mapear modulos impactados em `src/` e definir estrategia de menor diff.
4. Definir teste(s) do comportamento esperado antes da entrega e preparar criacao/ajuste durante a implementacao.
5. Implementar por camadas na ordem: schema → service → route → UI.
6. Em todas as camadas de dominio, respeitar `src/<camada>/<dominio>/...` (evitar arquivos flat na raiz da camada).
7. Schema: criar ou atualizar em `src/schemas/[dominio]/[recurso]-schemas.ts`.
8. Service: implementar logica de negocio, queries e cache em `src/services/[dominio]/`.
9. Route: apenas autenticar, validar (com schema importado), delegar ao service, responder.
10. UI: componentes em `src/components/dashboard/[dominio]/`; usar `"use client"` so se necessario e sem `useEffect`/`useLayoutEffect`.
11. Cobrir casos principais e limites (erro, vazio, permissao, fallback).
12. Escrever ou atualizar testes para comportamento novo.
13. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
14. Rodar validacao proporcional ao impacto.
15. Entregar resumo com arquivos alterados, testes executados e riscos.

## Workflow: Bugfix

1. Reproduzir mentalmente ou por teste o comportamento incorreto.
2. Isolar causa raiz antes de editar — nao assumir a camada errada.
3. Verificar se o bug esta na route (logica fora do lugar), no service (regra errada) ou no schema (validacao incorreta).
4. Corrigir no ponto mais proximo da origem do problema.
5. Evitar patch superficial que mascare causa estrutural.
6. Criar ou atualizar teste que falhava antes e passa depois.
7. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
8. Validar ausencia de regressao nos fluxos adjacentes.
9. Reportar causa raiz e como a correcao evita recorrencia.

## Workflow: Endpoint/API

1. Definir contrato: entrada (query params ou body), saida e codigos de erro esperados.
2. Aplicar convencao de dominio em todas as camadas tocadas (`src/<camada>/<dominio>/...`).
3. Criar schema Zod em `src/schemas/[dominio]/[recurso]-schemas.ts` (nao inline na route).
4. Criar ou atualizar service em `src/services/[dominio]/[recurso].service.ts` com a logica.
5. Criar route em `src/app/api/v1/[recurso]/route.ts` seguindo a anatomia:
   ```
   autenticar → validar com schema importado → delegar ao service → retornar HTTP
   ```
6. Usar `validatePermissionAccess` para rotas com RBAC; `validateFullAccess` para rotas abertas a membros.
7. Nao adicionar helper de data, filtro ou cache dentro da route.
8. Decidir cache no service: por padrao sem cache manual; usar Redis somente quando houver evidencia de necessidade.
9. Padronizar status codes: 200 GET, 201 POST, 204 DELETE, 400 validacao, 403 acesso, 404 nao encontrado, 409 conflito, 500 erro interno.
10. Usar `apiError()` de `src/lib/utils/api-response.ts` para erros — nao criar `NextResponse.json({ error })` manual.
11. Usar `revalidateTag` na route apos mutacoes bem-sucedidas (POST/PATCH/DELETE).
12. Cobrir caminho feliz e falhas esperadas em teste.
13. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
14. Se houver interceptacao/autorizacao no nivel de framework, alterar `src/proxy.ts` (nao `src/middleware.ts`).
15. Confirmar impacto em consumidores existentes.

## Workflow: Prisma e Dados

1. Verificar necessidade real da mudanca de schema.
2. Aplicar alteracao minima no Prisma schema.
3. Gerar migracao com nome descritivo: `npx prisma migrate dev --name descricao-da-mudanca`.
4. Usar `select` em todas as queries — nunca `include` sem restricao de campos.
5. Usar `prisma.$transaction` quando multiplas operacoes precisam ser atomicas.
6. Revisar impacto em services, seeds e fluxos dependentes.
7. Atualizar camadas que dependem do modelo alterado (types, formatters, services).
8. Validar leitura/escrita com casos reais e limites (null, vazio, conflito).
9. Criar ou atualizar teste para o comportamento de persistencia alterado.
10. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
11. Rodar `npm run test:prisma` quando houver impacto em persistencia.
12. Registrar riscos de migracao, compatibilidade e rollback quando houver.

## Workflow: Refactor Seguro

1. Definir objetivo tecnico mensuravel da refatoracao (ex: "mover logica de filtro da route para o service").
2. Preservar comportamento externo — nenhuma mudanca funcional nao solicitada.
3. Refatorar em passos pequenos e verificaveis; um passo por vez.
4. Se a regra for usada em mais de um dominio, extrair para modulo neutro (sem nome de dominio) antes de ajustar consumidores.
5. Sequencia recomendada: extrair schema → extrair helpers → extrair service → limpar route.
6. Executar testes a cada bloco de mudanca relevante.
7. Garantir que ha teste criado ou atualizado para confirmar ausencia de regressao.
8. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
9. Evitar combinar refactor com mudanca funcional nao solicitada.
10. Em cleanup estrutural, executar `rg -n "legacy|teamType|teamId|x-team-id|manage:team_" src` e garantir resultado vazio.
11. Se houver qualquer ocorrencia de compatibilidade legada no `src/`, bloquear entrega ate remover.
12. Entregar com justificativa tecnica curta e verificavel.
