# PRD (UC1): Padronização de Testes (Opção A)

## 1. Objetivo

Padronizar e isolar a suíte de testes para reduzir risco de quebra durante a reorganização do projeto, adotando a **Opção A**:

- `prisma/__tests__/`: testes de contrato do schema Prisma (models/enums/migrations)
- `src/services/**/__tests__/`: testes de regra de negócio e integrações
- `src/lib/**/__tests__/`: testes unitários de utilitários puros

## 2. Motivação

Hoje existem testes em locais que causam ambiguidade e/ou ficam desatualizados facilmente (ex.: testes de “schema validation” dentro de `src/lib/billing/__tests__`). Isso aumenta risco durante refactor porque:

- mistura “contrato do banco” com “lógica de negócio”
- cria testes redundantes
- dificulta rodar subconjuntos relevantes durante migração

## 3. Escopo

### 3.1. Inclui

- Mover testes de validação do Prisma schema para `prisma/__tests__/`.
- Ajustar execução do Vitest para suportar testes de Prisma em **ambiente `node`**.
- Definir convenção de nomes e regras de import/mocks.

### 3.2. Não inclui

- Reorganização de `src/lib/` (ex.: decomposição de `lib/util/`).
- Mudanças em rotas `src/app/**`.
- Mudanças de versão da API (manter `src/app/api/v1/**`).

## 4. Estado Atual (observações)

- `vitest.config.ts` usa `environment: 'jsdom'`.
- `tsconfig.json` exclui testes dentro de `src/` (ex.: `src/**/__tests__/**`).
- Existem testes de schema Prisma dentro de `src/lib/billing/__tests__` e `src/lib/company/__tests__`.

## 5. Requisitos / Regras

- **R1**: Testes de schema Prisma devem rodar em `node`.
- **R2**: Testes de UI/client continuam em `jsdom`.
- **R3**: Não alterar runtime do app (apenas tooling e testes).
- **R4**: Não mover `src/` nem mudar a convenção de versionamento da API (`src/app/api/v1`).

## 6. Proposta de Organização

### 6.1. Prisma

- Criar pasta: `prisma/__tests__/`
- Consolidar testes por assunto:
  - `prisma/__tests__/billing-schema.test.ts`
  - `prisma/__tests__/company-schema.test.ts`

### 6.2. Services

- Manter `src/services/**/__tests__/` para:
  - serviços de billing
  - integrações WhatsApp (uazapi/wuzapi)
  - etc.

### 6.3. Lib

- Manter `src/lib/**/__tests__/` apenas para utilitários puros.

## 7. Plano de Execução (Passo a Passo)

### Fase 1 — Preparação

1. Criar `prisma/__tests__/`.
2. Criar um config separado do Vitest para testes Prisma (ex.: `vitest.prisma.config.ts`) com:
   - `test.environment: 'node'`
   - `resolve.alias` preservando `@ -> src` (se necessário)

### Fase 2 — Migração de Testes Prisma

3. Mover/Consolidar:
   - `src/lib/billing/__tests__/*` -> `prisma/__tests__/billing-schema.test.ts`
   - `src/lib/company/__tests__/*` -> `prisma/__tests__/company-schema.test.ts`
4. Remover pastas vazias resultantes (`src/lib/billing/` e `src/lib/company/`) **somente se** ficarem realmente vazias e não forem dependidas por imports.

### Fase 3 — Ajuste de Scripts

5. Adicionar scripts no `package.json`:
   - `test`: mantém suíte atual
   - `test:prisma`: roda Vitest com config Prisma
   - `test:services`: opcional (fatia por path)

### Fase 4 — TypeScript (consistência)

6. Decidir e aplicar 1 estratégia:

- Estratégia recomendada (consistente com o estado atual): manter testes fora do typecheck do app.
  - adicionar `prisma/**/__tests__/**` em `tsconfig.json.exclude`

## 8. Checklist de Validação

- Rodar `npm test` (suíte atual) e garantir que nada regrediu.
- Rodar `npm run test:prisma` e garantir que os testes de schema passam.
- Rodar `npm run build` e garantir que não houve impacto.

## 9. Rollback

- Reverter commits da movimentação.
- Se necessário, voltar testes Prisma para a localização anterior.

## 10. Riscos

- Risco baixo: este PRD muda apenas tooling/testes.
- Atenção: testes Prisma em `jsdom` podem falhar; por isso o config separado com `node`.
- Atenção: `tsconfig.json` atualmente exclui testes de `src/`, mas não necessariamente de `prisma/`.

## 11. Resultado Esperado

- Padrão de testes definido e aplicado.
- Testes de schema Prisma isolados e executáveis sem efeitos colaterais.
- Base estável para iniciar os próximos PRDs por caso de uso.
