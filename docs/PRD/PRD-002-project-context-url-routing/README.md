# PRD-002: Contexto Canonico de Organizacao e Projeto na URL

**Status:** Draft
**Data:** 2026-03-20
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD define a migracao do contexto ativo de organizacao e projeto para uma URL canonica no formato `/app/[organizationSlug]/[projectSlug]/...`. Hoje o projeto ativo e resolvido de forma implicita por cookie, header e fallback de sessao, o que funciona para boa parte do fluxo, mas introduz estado invisivel, sincronizacao fragil entre SSR e client e dificuldade para compartilhar links ou reproduzir bugs.

A proposta desta migracao e tornar a URL a fonte primaria de contexto para todas as areas dependentes de projeto. Como o sistema ainda esta em desenvolvimento, este PRD assume corte arquitetural direto: sem camada de compatibilidade legada como requisito e com liberdade para resetar o banco usando `scripts/reset-db.sh` quando a nova modelagem exigir.

---

## Estrutura do PRD

PRD-002-project-context-url-routing/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md

---

## Resumo Executivo

### Objetivo
- Tornar `organizationSlug` e `projectSlug` parte explicita da navegacao.
- Eliminar o projeto global implicito como fonte canonica de escopo.
- Melhorar consistencia entre SSR, client, refresh, links compartilhados e navegacao entre abas.
- Padronizar os nomes fisicos das tabelas para sempre usarem prefixo de dominio.

### Status Atual
- A organizacao ativa ja possui `slug` no banco.
- O projeto ainda nao possui `slug` persistido no modelo principal.
- O contexto de projeto e resolvido hoje por uma combinacao de cookie, header, fallback de sessao e hooks de cliente.
- Parte relevante das APIs ja valida `organizationId` e `projectId` no servidor, o que e uma base correta para a migracao.

### Escopo
- Entra:
- criar estrutura canonica de rota em `/app/[organizationSlug]/[projectSlug]/...`
- adicionar `slug` ao dominio de projeto
- criar resolucao server-side de contexto por slug
- migrar o seletor de projeto da sidebar para navegacao por URL
- remover o projeto global implicito como fonte canonica
- usar reset de banco quando a nova modelagem tornar isso mais simples do que migracao incremental
- revisar e renomear `@@map` para adotar prefixo de dominio consistente

- Fica fora:
- revisao completa de IA, billing ou modulos sem escopo de projeto
- exposicao publica de URLs amigaveis fora do app autenticado
- alteracao do modelo de permissao por organizacao
- manutencao obrigatoria de rotas legadas como parte da entrega
- migracao incremental de dados para preservar bancos antigos

### Estimativa
- Ordem de grandeza: 1 a 2 sprints para infraestrutura e migracao da arvore principal.
- Como o sistema pode ser resetado, o custo de compatibilidade diminui e o rollout pode ser mais direto.

---

## Arquivos/Areas Principais

- `prisma/schema.prisma`
- `prisma/migrations/...`
- `src/app/app/[organizationSlug]/[projectSlug]/...`
- `src/components/dashboard/sidebar/...`
- `src/components/dashboard/projects/...`
- `src/hooks/project/...`
- `src/server/project/...`
- `src/services/projects/...`
- `src/app/api/v1/projects/current/...`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Validar o formato canonico de rota e aprovar o corte arquitetural direto antes de iniciar a implementacao.
