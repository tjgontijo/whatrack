# Diagnostic: AI Foundation Layer

**Data:** 2026-03-23
**Status:** Draft

---

## Resumo Executivo

- O problema principal e a ausencia de uma fundacao unica para contexto, eventos, agentes e cadencias
- O risco principal e implementar PRDs subsequentes sobre contratos inconsistentes, principalmente em scoping por projeto e paths de codigo
- O impacto principal e bloquear ou fragmentar PRD-012, PRD-013 e PRD-022

---

## Problemas Encontrados

### 1. Ausencia de schema e servicos base

**Problema:** o repositario nao possui modelos de fundacao de IA nem contratos compartilhados para contexto, eventos e agentes.

**Impacto:**

- PRDs dependentes ficam forcados a redefinir os mesmos conceitos
- nao existe trilha auditavel unica para acoes de IA

**Solucao Necessaria:**

1. Criar os modelos Prisma base
2. Criar servicos, queries e infraestrutura compartilhados

### 2. A versao anterior do PRD assumia migracao legada que nao existe mais

**Problema:** o PRD anterior ainda descrevia migracao de `AiInsight` e `AiInsightCost`, mas o PRD-011 ja removeu essas estruturas do schema e do banco.

**Impacto:**

- `TASKS.md`, `CONTEXT.md` e `QUICK_START.md` ficaram contraditorios
- o implementador poderia perder tempo tentando executar scripts e migracoes inexistentes

**Solucao Necessaria:**

1. Remover qualquer task de migracao legada deste PRD
2. Reescrever o quick start assumindo base limpa apos PRD-011

### 3. O PRD anterior nao refletia o eixo `projectId` de forma consistente

**Problema:** a versao anterior falava em configuracao por projeto, mas nao tratava `projectId` como parte explicita de todos os modelos e contratos operacionais relevantes.

**Impacto:**

- risco de consultas caras ou ambiguas quando a organizacao tiver varios projetos
- risco de misturar timeline, score, contexto e uso entre projetos da mesma organizacao

**Solucao Necessaria:**

1. Tornar `projectId` explicito nos modelos operacionais relevantes
2. Exigir filtros por `organizationId` e `projectId` nas queries e agregacoes de projeto

### 4. O PRD anterior misturava convencoes de arquitetura e tooling

**Problema:** a versao anterior planejava `src/services/ai/*`, importava `@/lib/result` inexistente, usava Jest em testes e apontava para superficies de dashboard nao presentes no repositario.

**Impacto:**

- tasks nao executaveis no estado real do projeto
- aumento do retrabalho para quem fosse implementar

**Solucao Necessaria:**

1. Reorganizar o PRD em `src/lib/ai/*`, `src/server/*` e `src/app/api/*`
2. Adotar `src/lib/shared/result.ts` e Vitest
3. Remover tasks de UI fora de escopo

### 5. A modelagem anterior de enrollment entrava em conflito com re-enrollment

**Problema:** havia instrucoes para usar `@@unique([cadenceId, leadId])` em `AiCadenceEnrollment`, mas a regra de negocio permite re-enrollment historico.

**Impacto:**

- impossibilidade de reinscrever um lead na mesma cadencia apos interrupcao ou conclusao
- conflito direto entre `CONTEXT.md` e `TASKS.md`

**Solucao Necessaria:**

1. Remover a unique constraint da dupla `cadenceId + leadId`
2. Manter a regra de unicidade apenas para enrollments ativos no service layer

### 6. Riscos tecnicos de volume e crescimento de memoria continuam validos

**Problema:** `AiEvent` pode crescer rapidamente e `longMemory` pode se tornar descontrolado se nao houver limites.

**Impacto:**

- consultas lentas por timeline e uso
- prompts mais caros e contexto degradado

**Solucao Necessaria:**

1. Definir indices orientados a `organizationId`, `projectId`, `status` e `createdAt`
2. Limitar `longMemory` via schema e service layer

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| Stack base atualizada | ✅ | `next@16`, `prisma@7`, `vitest` e `zod` ja estao no projeto |
| Validacao central de env | ✅ | `src/lib/env/env.ts` ja existe e valida `DATABASE_URL` |
| Logging estruturado | ✅ | `src/lib/utils/logger.ts` ja esta disponivel |
| Dominio principal project-aware | ✅ | `Lead`, `Ticket` e `Project` ja usam `organizationId` / `projectId` no schema atual |
| Legado removido | ✅ | PRD-011 ja removeu `AiInsight` e correlatos |

---

## Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Scoping incompleto por projeto | Alto | Alta | Critico | Medio |
| Tasks desatualizadas com tooling real | Medio | Alta | Alto | Baixo |
| Modelagem incorreta de enrollment | Alto | Media | Alto | Baixo |
| Crescimento de `AiEvent` sem indices corretos | Medio | Media | Medio | Baixo |
| Crescimento de `longMemory` sem limite | Medio | Media | Medio | Baixo |

---

## Ordem Recomendada

1. Corrigir contratos compartilhados e schema project-aware
2. Subir infra minima de Mastra, Inngest e `Result<T>`
3. Implementar servicos e queries base
4. Fechar testes unitarios e validacao final
