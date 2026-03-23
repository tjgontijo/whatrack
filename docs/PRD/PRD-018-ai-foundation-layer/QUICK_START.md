# Quick Start: PRD-018 AI Foundation Layer

## Leitura Recomendada

1. `README.md`
2. `CONTEXT.md`
3. `DIAGNOSTIC.md`
4. `TASKS.md`

## Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/2026-03-23-ai-foundation-layer
```

## Primeiro Commit

```bash
git add docs/PRD/PRD-018-ai-foundation-layer/
git commit -m "docs: add PRD for ai foundation layer"
```

## Ordem de Execucao

1. Fase 1: ajustar dependencias, criar `Result<T>`, definir tipos/schemas e subir o schema Prisma project-aware
2. Fase 2: configurar Mastra, Inngest e a rota `/api/inngest`
3. Fase 3: implementar servicos, queries, testes e validacao final com smoke check por `projectId`

## Verificacao

- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma db seed`
- `npm run lint`
- `npm run build`
- `npm run test`
- Smoke check manual: criar contexto para lead de um projeto, registrar evento e consultar por `projectId`

## Notas de Execucao

- Este PRD nao possui script de migracao legada; o PRD-011 ja removeu `AiInsight` e `AiInsightCost`
- Este PRD entrega fundacao e contratos; nao entrega UI final de dashboard, inbox ou studio
- O scoping por `projectId` nao e opcional nos contratos operacionais deste PRD
