# Mapa de Diretorios

Referencia canonica de onde cada tipo de arquivo pertence neste projeto.
Consultar antes de criar qualquer arquivo novo.

## Convencao transversal (obrigatoria)

- Para codigo de dominio, usar sempre `src/<camada>/<dominio>/...`.
- Essa regra vale para todas as camadas aplicaveis: `src/app/api/`, `src/services/`, `src/server/`, `src/schemas/`, `src/hooks/`, `src/types/` e `src/components/dashboard/`.
- Arquivo flat na raiz da camada e aceito apenas para codigo realmente compartilhado/transversal.

## src/app/api/[versao]/[recurso]/

**Responsabilidade:** Route handlers HTTP — apenas autenticacao, validacao, delegacao e resposta.

- `route.ts` — handlers GET, POST, PATCH, DELETE
- `[id]/route.ts` — handlers de recurso por ID
- `[id]/[acao]/route.ts` — acoes especificas (ex: `close/route.ts`, `approve/route.ts`)

**Nao pertence aqui:** schemas Zod, queries Prisma, helpers, cache, logica de negocio.
**Convencao de dominio:** cada recurso em seu proprio subpath de dominio (evitar concentrar multiplos dominios no mesmo path).

---

## src/services/[dominio]/

**Responsabilidade:** Logica de negocio, queries Prisma, cache (quando necessario), integracao com APIs externas.

- `[recurso].service.ts` — operacoes CRUD e regras do dominio
- `[recurso].scheduler.ts` — jobs agendados
- `handlers/[tipo].handler.ts` — handlers de eventos/webhooks
- `index.ts` — re-exportacoes publicas do dominio, quando necessario

**Convencao de dominio:** nao criar service de dominio direto em `src/services/*.ts`; manter sempre dentro de `src/services/[dominio]/`.
**Convencao:** tipos de entrada/saida declarados no topo do arquivo com `interface` ou `type`.
**Proibido:** `any` em parametros ou retornos de funcoes exportadas.
**Regra de cache:** por padrao sem cache manual; se necessario, implementar cache externo no service com TTL explicito e invalidacao definida.

---

## src/server/[dominio]/

**Responsabilidade:** Utilitarios de servidor sem estado — autenticacao, autorizacao, acesso a sessao.

- `src/server/auth/` — validacao de sessao e guards de acesso
- `src/server/[dominio]/` — RBAC, membership, permissoes por dominio

**Convencao de dominio:** para codigo de dominio, nao criar arquivo flat em `src/server/*.ts`; usar `src/server/[dominio]/`.

**Diferenca critica entre src/server/ e src/services/:**

| Criterio                        | src/server/                              | src/services/                                             |
|---------------------------------|------------------------------------------|-----------------------------------------------------------|
| Pergunta-chave                  | Quem pode fazer isso e como?             | O que o sistema faz com isso?                             |
| Conteudo                        | Auth, sessao, RBAC, membership           | Regras de negocio, queries Prisma, cache, integracoes     |
| Acessa DB?                      | Sim, para verificar acesso/membership    | Sim, para persistencia de dominio                         |
| Conhece regras de negocio?      | Nao                                      | Sim                                                       |
| Exemplo                         | Guard de acesso, validacao de sessao     | Service de criacao/atualizacao de recurso de dominio      |

**Regra pratica:** se o codigo implementa uma funcionalidade do produto → `src/services/`. Se controla quem pode acessar ou como a sessao funciona → `src/server/`.

---

## src/schemas/

**Responsabilidade:** Unico local para todos os schemas Zod do projeto.

- `[dominio]/[recurso]-schemas.ts` — schemas de input/output de API e regras de validacao de dominio

Schemas de query params, body, response e entidades ficam todos aqui.

**Proibido:** schemas Zod inline em routes, services ou componentes. Se nao existe o arquivo, criar em `src/schemas/`.

---

## src/lib/

**Responsabilidade:** Utilitarios puros sem estado e sem dependencia de dominio.

| Subdiretorio         | Conteudo                                                    |
|----------------------|-------------------------------------------------------------|
| `src/lib/auth/`      | Cliente de auth, guards, definicoes de roles                |
| `src/lib/db/`        | Instancias de banco, cache, filas; cache-keys               |
| `src/lib/date/`      | Funcoes de data (range, formatacao, calculo)                |
| `src/lib/utils/`     | Utilitarios genericos (resposta de erro, logger, encryption)|
| `src/lib/constants/` | Constantes compartilhadas (statuses, stages, headers)       |
| `src/lib/i18n/`      | Internacionalizacao                                         |

**Regra:** funcoes utilitarias em `src/lib/` devem ser puras (exceto clientes/instancias em `src/lib/db/` e integracoes).

---

## src/hooks/

**Responsabilidade:** React hooks — acesso a dados, estado de UI, autorizacao client-side.

- `src/hooks/[dominio]/use-[recurso].ts` — hook de dominio
- `src/hooks/ui/use-[funcionalidade].ts` — hooks de UI genericos
- `src/hooks/auth/use-[funcionalidade].ts` — hooks de autenticacao client-side

**Convencao de dominio:** hook de dominio sempre dentro de `src/hooks/[dominio]/`.

---

## src/types/

**Responsabilidade:** Tipos TypeScript compartilhados que nao sao schemas Zod.

- `[dominio]/[recurso].ts` — tipos de dominio

**Quando usar aqui vs inferir do Prisma ou Zod:** usar `src/types/` para tipos que representam contratos entre camadas que nao vem diretamente de um schema.
**Convencao de dominio:** evitar criar tipo de dominio flat em `src/types/*.ts`.

---

## src/components/

**Responsabilidade:** Componentes React reutilizaveis.

| Subdiretorio                           | Conteudo                                              |
|----------------------------------------|-------------------------------------------------------|
| `src/components/ui/`                   | Componentes base do design system (ex: shadcn/ui)     |
| `src/components/dashboard/[dominio]/`  | Componentes de feature do dashboard                   |
| `src/components/data-table/`           | Componentes genericos de tabela, filtro e paginacao   |
| `src/components/landing/`             | Componentes da landing page (PascalCase)              |
| `src/components/onboarding/`          | Componentes de onboarding                             |

**Regra de co-localizacao:**
- Componente reutilizavel em 2+ lugares → `src/components/dashboard/[dominio]/`
- Componente exclusivo de uma rota → `src/app/dashboard/[rota]/components/` (aceito)

**Convencao de dominio:** componente de feature deve nascer dentro do dominio correspondente.
- Proibido criar diretorio de dominio do dashboard em `src/components/<dominio>/`.
- `src/components/` raiz deve ficar restrito a blocos compartilhados/transversais.

---

## src/app/dashboard/[rota]/

**Responsabilidade:** Pages do dashboard (Server Components por padrao).

- `page.tsx` — page component (server)
- `layout.tsx` — layout compartilhado
- `components/` — componentes co-localizados exclusivos desta rota
- `client.tsx` ou `[nome]-client.tsx` — client component co-localizado quando necessario

---

## Interceptacao de framework (proxy/middleware)

**Responsabilidade:** Interceptacao de requests no nivel de framework.

- Verificar no projeto qual arquivo e o ponto de interceptacao correto (ex: `src/proxy.ts` ou similar).
- Nunca criar um segundo arquivo de middleware paralelo.
- Qualquer logica de interceptacao de framework vai no arquivo designado pelo projeto.

---

## Regra de ouro: onde colocar uma funcao nova?

```
E uma funcao pura sem acesso a DB?          → src/lib/[categoria]/
E logica de negocio ou query Prisma?        → src/services/[dominio]/
E autenticacao ou autorizacao de servidor?  → src/server/[dominio]/
E qualquer schema Zod?                      → src/schemas/[dominio]/[recurso]-schemas.ts
E um tipo TypeScript puro (sem Zod)?        → src/types/[dominio]/[recurso].ts
E um React hook?                            → src/hooks/[dominio]/
E um componente React?                      → src/components/dashboard/[dominio]/
```
