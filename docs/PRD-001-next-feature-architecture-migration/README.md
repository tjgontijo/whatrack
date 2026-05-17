# PRD-001: Migracao para Arquitetura por Feature no Next.js

**Status:** Draft
**Data:** 2026-05-17
**Versao:** 1.0

---

## 📋 O Que e Este PRD?

Este PRD define a migracao arquitetural do sistema para aderir a `.agents/skills/next-feature-architecture/SKILL.md`.

**Documento:** plano de ajuste por dominio, com ordem de execucao, criterios de aceitacao e risco.

**Tempo Total:** 10-14 semanas

---

## 📂 Estrutura do PRD

```txt
PRD-001-next-feature-architecture-migration/
├── README.md (este arquivo)
├── CONTEXT.md (contexto arquitetural atual e alvo)
├── DIAGNOSTIC.md (problemas e riscos)
├── TASKS.md (plano de implementacao por dominio)
└── QUICK_START.md (guia rapido de execucao)
```

---

## 🎯 Resumo Executivo

### Status Atual

- Projeto Next.js grande, com padrao centrado em `src/services`.
- Sem estrutura `src/features/[domain]`.
- Parte das API routes acessa banco diretamente.

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 5 | 🟡 6 | 🟢 3 |

### Ordem de Fixacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Fundacao arquitetural | T1-T4 | 1-2 semanas |
| 2: Dominios core | T5-T8 | 3-4 semanas |
| 3: Dominios de crescimento | T9-T12 | 3-4 semanas |
| 4: Dominios perifericos + hardening | T13-T16 | 3-4 semanas |

**Total:** 10-14 semanas

---

## Regra Mandatoria Desta Migracao

Tudo que for de dominio (nao compartilhado) deve ser movido para `src/features/[domain]`.

- Nao manter compatibilidade em `src/services/**` ou `src/schemas/**` para dominio migrado.
- Nao manter componente de dominio em `src/components/dashboard/**` apos migracao do dominio.
- Nao manter hook de dominio em `src/hooks/**` apos migracao do dominio.

---

## 🔴 Problemas Criticos

### T1: Ausencia de arquitetura por feature

**Impacto:** alto acoplamento, baixa previsibilidade de ownership.
**Solucao:** migrar gradualmente para `src/features/[domain]` com API publica por feature.

### T2: Camada de repository inexistente

**Impacto:** regras e acesso ao banco misturados no mesmo arquivo.
**Solucao:** separar operacoes de banco em `repositories/` por intencao.

### T3: API route com acesso direto a banco

**Impacto:** quebra de boundary HTTP, maior risco de regressao.
**Solucao:** garantir fluxo route -> service -> repository em todos os dominios.

### T4: Regras de server boundary inconsistentes

**Impacto:** risco de import indevido em contexto client.
**Solucao:** aplicar `import 'server-only'` em services/repositories server.

### T5: Regra de IDs da arquitetura nao atendida em partes do app

**Impacto:** inconsistencias de padrao e rastreabilidade.
**Solucao:** remover geracao local de IDs sensiveis, delegar a estrategia definida no banco.

---

## 💾 Arquivos Principais

- `src/app/api/**/route.ts` - camada HTTP atual.
- `src/services/**` - casos de uso e acesso a dados misturados.
- `src/server/**` - auth, contexto e helpers server.
- `src/schemas/**` - validacao zod por dominio.
- `prisma/schema.prisma` - politica de IDs e modelagem.
- `.agents/skills/next-feature-architecture/SKILL.md` - arquitetura alvo.

---

## ✅ Como Comecar

1. Ler: CONTEXT.md, DIAGNOSTIC.md, TASKS.md, QUICK_START.md
2. Criar branch: `git checkout -b chore/feature-architecture-foundation`
3. Executar fase 1 completa antes de migrar dominios
4. Migrar dominios na ordem definida

## ✅ Regra de Conclusao por Task e Dominio

Toda task e todo dominio so podem ser marcados como concluidos quando estes passos forem executados:

1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. `git add -A && git commit -m "<tipo>(<domain>): <resumo-da-task>"`

Sem `build` e sem `commit`, a task permanece em andamento no PRD.

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 | Alto | Alta | CRITICO | 2-3d |
| T2 | Alto | Alta | CRITICO | 2-3d |
| T3 | Alto | Media | CRITICO | 2-4d |
| T4 | Medio | Alta | MEDIO | 1-2d |
| T5 | Alto | Media | CRITICO | 1-2d |

---

**Status:** Draft, pronto para aprovacao da execucao.
