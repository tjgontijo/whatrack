# Plano Final: Prompt Enxuto + Skills Reutilizáveis (Híbrido) para Agentes AI

## Resumo
1. Adotar modelo híbrido: agente com `leanPrompt` obrigatório e skills opcionais/reutilizáveis.
2. Permitir várias skills por agente e reuso da mesma skill em múltiplos agentes.
3. Entregar já com UI completa: edição do prompt enxuto, biblioteca de skills e vínculo/ordenação por agente.
4. Manter migração direta (sem feature flag), com duas skills compartilhadas core seedadas e vinculadas a todos os agentes.

## Decisões Fechadas
1. Estratégia: `Seeds -> Skills`.
2. Armazenamento: banco via Prisma.
3. Escopo: backend + UI completa nesta fase.
4. Topologia: híbrido.
5. Prompt: editável normalmente na UI.
6. Runtime: `leanPrompt` obrigatório + skills opcionais.
7. Reuso: permitido entre agentes.
8. Governança: skills compartilhadas core em modo read-only do sistema; organização cria skills custom reutilizáveis.
9. Shared core V1: 2 skills (`factualidade`, `calibração de confiança`).
10. Aplicação inicial das skills core: todos os agentes.
11. Naming: renomear `systemPrompt` para `leanPrompt`.
12. Validação: nível alto.

## Mudanças de Interfaces Públicas e Tipos

### 1) Prisma
1. Renomear campo em `AiAgent`:
- `systemPrompt` -> `leanPrompt`.
2. Adicionar `AiSkill`:
- `id`, `organizationId`, `slug`, `name`, `description?`, `content`, `kind`, `source`, `isActive`, `createdAt`, `updatedAt`.
- `kind`: `SHARED` ou `AGENT`.
- `source`: `SYSTEM` ou `CUSTOM`.
- `@@unique([organizationId, slug])`.
3. Adicionar `AiAgentSkill` (N:N):
- `id`, `agentId`, `skillId`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`.
- `@@unique([agentId, skillId])`.
- índice por `agentId + sortOrder`.

### 2) Schemas Zod (`src/schemas/ai/ai-schemas.ts`)
1. Trocar `systemPrompt` por `leanPrompt` em create/update de agente.
2. Adicionar contratos de skill:
- `createAiSkillSchema`.
- `updateAiSkillSchema`.
- `agentSkillBindingSchema` (`skillId`, `sortOrder`, `isActive`).
3. Incluir em create/update de agente:
- `skillBindings?: agentSkillBindingSchema[]`.

### 3) API
1. Manter rotas de agentes existentes com novo contrato:
- `GET/POST /api/v1/ai-agents`.
- `GET/PATCH/DELETE /api/v1/ai-agents/:id`.
- Retornar e aceitar `leanPrompt` + `skillBindings`.
2. Criar CRUD de skills:
- `GET/POST /api/v1/ai-skills`.
- `GET/PATCH/DELETE /api/v1/ai-skills/:id`.
3. Regra de edição:
- `source=SYSTEM` não pode ser alterada nem removida.
- `source=CUSTOM` pode ser editada/removida.

### 4) UI (Settings AI)
1. Página de agente (`/dashboard/settings/ai/[id]`):
- Campo `Prompt Enxuto` (`leanPrompt`).
- Seção de skills vinculadas com seleção, ordem e ativo/inativo.
2. Página/listagem de skills:
- Biblioteca de skills (sistema + custom).
- Criação/edição de skills custom.
- Badge read-only para skills sistema.

## Regras de Runtime (Execução)
1. `dispatchAiEvent` compõe instruções assim:
- bloco 1: `leanPrompt` do agente.
- bloco 2: skills ativas vinculadas, ordenadas por `sortOrder`.
2. Se agente não tiver skill vinculada:
- executa apenas com `leanPrompt`.
3. Skills core são complementares, não substituem o prompt enxuto.
4. Persistência de insight e fluxo de aprovação permanecem iguais.

## Seeds e Migração de Dados
1. Atualizar os 3 seeds de agentes para usar `leanPrompt`.
2. Criar seed das 2 skills compartilhadas core por organização.
3. Criar vínculo dessas 2 skills com todos os agentes por organização (idempotente).
4. Para os 3 agentes seed:
- além das shared core, criar skill de domínio por agente (`kind=AGENT`, `source=SYSTEM`) e vincular.
5. Migration Prisma:
- rename de coluna para `leanPrompt`.
- criação das novas tabelas.
- backfill idempotente das shared core + vínculos para agentes existentes.

## Implementação por Camadas (ordem)
1. `prisma/schema.prisma` + migration SQL.
2. `src/schemas/ai/ai-schemas.ts`.
3. `src/services/ai/ai-skill.service.ts` (novo).
4. `src/services/ai/ai-agent.service.ts` (bindings + `leanPrompt`).
5. `src/services/ai/ai-execution.service.ts` (composição prompt+skills).
6. `src/app/api/v1/ai-skills/...` (novas routes).
7. `src/app/api/v1/ai-agents/...` (ajuste contrato).
8. UI em `src/components/dashboard/ai/...` e páginas `src/app/dashboard/settings/ai/...`.
9. seeds em `prisma/seeds/...`.

## Testes e Cenários
1. Unitário `ai-skill.service`:
- cria skill custom.
- bloqueia update/delete de skill `SYSTEM`.
- lista skills por organização.
2. Unitário `ai-agent.service`:
- create/update com `leanPrompt`.
- salva e ordena `skillBindings`.
- garante `404` para organização errada.
3. Unitário `ai-execution.service`:
- executa com `leanPrompt` sem skills.
- executa com `leanPrompt + skills` respeitando ordem.
- ignora binding inativo.
- mantém lógica de neutral skip.
4. Integração de rota:
- `/api/v1/ai-skills` happy path + erro de permissão + bloqueio SYSTEM.
- `/api/v1/cron/ai/classifier` sem regressão no disparo.
5. Seed test:
- execução idempotente (não duplica skills/vínculos).
- shared core vinculadas a todos os agentes.

## Validações a Executar
1. `npm run lint`
2. `npm run test`
3. `npm run test:prisma`
4. `npm run build`

## Critérios de Aceite
1. UI permite editar `leanPrompt` e gerenciar skills completas.
2. Mesmo skill pode ser vinculada a múltiplos agentes.
3. Agente funciona com prompt sem skill e também com prompt + skills.
4. Skills core sistema aparecem como read-only.
5. Seeds dos 3 agentes já nascem com configuração híbrida.
6. Sem fallback legado no runtime para contratos antigos.

## Assunções e Defaults
1. `leanPrompt` substitui semanticamente `systemPrompt` em toda a app.
2. Conteúdo das 2 shared core será definido em português, focado em não inferência e consistência de confiança.
3. `sortOrder` define precedência entre skills; menor valor executa primeiro.
4. Remoção de skill custom desvincula automaticamente dos agentes via relação com `onDelete: Cascade` na junção.
