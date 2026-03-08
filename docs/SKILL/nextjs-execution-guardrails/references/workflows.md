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
10. Antes da UI, classificar a tela: se for dashboard read-heavy (leitura inicial + formularios), implementar `page.tsx` server-first e reservar client components para interacao.
11. UI: componentes em `src/components/dashboard/[dominio]/`; usar `"use client"` so se necessario e sem `useEffect`/`useLayoutEffect`.
12. Para rotas server-first, criar `loading.tsx` com skeleton estavel quando houver espera perceptivel.
13. Cobrir casos principais e limites (erro, vazio, permissao, fallback).
14. Escrever ou atualizar testes para comportamento novo.
15. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
16. Rodar validacao proporcional ao impacto.
17. Entregar resumo com arquivos alterados, testes executados e riscos.

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
5. Criar route em `src/app/api/[versao]/[recurso]/route.ts` seguindo a anatomia:
   ```
   autenticar → validar com schema importado → delegar ao service → retornar HTTP
   ```
6. Usar guard de permissao granular (RBAC) para rotas que exigem permissao especifica; guard de membership simples para rotas abertas a membros autenticados.
7. Nao adicionar helper de data, filtro ou cache dentro da route.
8. Decidir cache no service: por padrao sem cache manual; usar cache externo (Redis ou similar) somente quando houver evidencia de necessidade.
9. Padronizar status codes: 200 GET, 201 POST, 204 DELETE, 400 validacao, 403 acesso, 404 nao encontrado, 409 conflito, 500 erro interno.
10. Usar o utilitario centralizado de resposta de erro do projeto — nao criar `NextResponse.json({ error })` manual em cada handler.
11. Usar `revalidateTag` na route apos mutacoes bem-sucedidas (POST/PATCH/DELETE).
12. Cobrir caminho feliz e falhas esperadas em teste.
13. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
14. Se houver interceptacao/autorizacao no nivel de framework, alterar o arquivo de proxy/middleware do projeto (verificar `directory-map.md` para o arquivo correto).
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
11. Rodar suite de testes de persistencia do projeto quando houver impacto em schema.
12. Registrar riscos de migracao, compatibilidade e rollback quando houver.

## Workflow: Refactor Seguro

1. Definir objetivo tecnico mensuravel da refatoracao (ex: "mover logica de filtro da route para o service").
2. Preservar comportamento externo — nenhuma mudanca funcional nao solicitada.
3. Refatorar em passos pequenos e verificaveis; um passo por vez.
4. Se a regra for usada em mais de um dominio, extrair para modulo neutro (sem nome de dominio) antes de ajustar consumidores.
5. Sequencia recomendada: extrair schema → extrair helpers → extrair service → limpar route.
6. Se a refatoracao envolver pagina dashboard read-heavy, mover o bootstrap inicial para o servidor antes de otimizar detalhes de client.
7. Executar testes a cada bloco de mudanca relevante.
8. Garantir que ha teste criado ou atualizado para confirmar ausencia de regressao.
9. Executar obrigatoriamente os testes criados/atualizados antes da entrega.
10. Evitar combinar refactor com mudanca funcional nao solicitada.
11. Em cleanup estrutural, verificar se restam aliases/wrappers entre dominios sem valor funcional e remover.
12. Garantir ausencia de arquivos obsoletos, diretorios vazios e codigo morto apos o cleanup.
13. Entregar com justificativa tecnica curta e verificavel.

## Workflow: Otimizacao de Performance (Dashboard/API GET)

1. Medir baseline da tela/endpoint antes de mudar (TTFR no client e latencia do GET).
2. Verificar se ha escrita em caminho de leitura (route GET, guard de auth, service de leitura) e remover qualquer side effect.
3. Garantir contrato paginado no GET de listagem (`page/pageSize` ou `cursor/limit`) com schema Zod dedicado.
4. Revisar service da listagem:
   - usar `select` minimo;
   - evitar `include` amplo;
   - usar `findMany + count` em paralelo quando houver pagina numerada.
5. Revisar indices para filtros/ordenacao mais usados pela tela.
6. No client, aplicar `useInfiniteQuery` e impedir fetch sequencial de todas as paginas no mount.
7. Aplicar virtualizacao (`react-virtuoso`) para listas com potencial de volume.
8. Aplicar busca diferida com `useDeferredValue` e threshold minimo (padrao 3 caracteres).
9. Validar defaults de QueryClient para dashboard (`staleTime`, `gcTime`, `refetchOn*`).
10. Cobrir com teste(s) direcionado(s):
   - schema de query paginada;
   - service de listagem com filtros;
   - consumo client (primeira pagina + proxima pagina sob demanda).
11. Reexecutar medicao apos mudancas e registrar ganho/perda com numeros.
12. Entregar com resumo objetivo: gargalo raiz, alteracoes, evidencias de desempenho, riscos pendentes.
