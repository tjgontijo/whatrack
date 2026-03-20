# Quick Start: PRD-002 Contexto Canonico de Organizacao e Projeto na URL

**Status:** Draft
**Data:** 2026-03-20

---

## Objetivo de Execucao

Migrar o sistema de um contexto implicito de projeto para uma URL canonica baseada em `organizationSlug` e `projectSlug`, assumindo corte arquitetural direto e ambiente resetavel.

---

## Ordem Recomendada

1. Ler `CONTEXT.md`
2. Ler `DIAGNOSTIC.md`
3. Executar `TASKS.md` na ordem proposta

---

## Sequencia Curta de Implementacao

1. Modelar `project.slug` e gerar migration
2. Revisar `@@map(...)` e aplicar prefixos de dominio nas tabelas fisicas
3. Expor slug nos servicos e contratos de projeto
4. Criar resolver server-side por slug
5. Criar layout canonico em `/app/[organizationSlug]/[projectSlug]/...`
6. Migrar sidebar para navegar por URL
7. Migrar os modulos principais para a nova arvore
8. Resetar ambiente com `scripts/reset-db.sh` se a modelagem exigir

---

## Validacoes Minimas

- `scripts/reset-db.sh` quando houver alteracao estrutural de schema ou seed
- `npx prisma validate`
- `npm run build`
- smoke manual:
- abrir `/app`
- trocar projeto na sidebar
- refresh em pagina scoped por projeto
- abrir o mesmo link em nova aba

---

## Criterios de Pronto

- a URL expressa organizacao e projeto nas areas scoped
- a sidebar troca projeto mudando a URL
- o servidor valida o contexto por slug
- o cliente nao depende de cookie para descobrir o projeto atual
- os modulos principais ja operam na nova arvore canonica
- as tabelas mapeadas seguem prefixo de dominio consistente

---

## Observacoes

- o cookie de projeto pode continuar existindo apenas como memoria opcional do ultimo projeto usado
- a implementacao deve priorizar corte limpo e simplicidade arquitetural, nao convivencia longa com a estrutura anterior
