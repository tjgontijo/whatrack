# Tasks: PRD-002 Contexto Canonico de Organizacao e Projeto na URL

**Data:** 2026-03-20
**Status:** Draft
**Total:** 14
**Estimado:** 1 a 2 sprints para corte arquitetural

---

## Fase 1: Modelagem e Resolucao de Slug

### T1: Formalizar a politica de slug para organizacao e projeto

**Files:**
- Modify: `docs/PRD/PRD-002-project-context-url-routing/CONTEXT.md`
- Modify: `src/schemas/projects/project-schemas.ts`
- Modify: `src/schemas/organizations/...` se necessario

**What to do:**
- Definir regras unicas de normalizacao de slug.
- Definir unicidade global para organizacao e unicidade por organizacao para projeto.
- Definir comportamento de colisao, corrida e edicao de slug.
- Definir que o usuario escolhe o slug e o sistema apenas valida e sinaliza disponibilidade.

**Verification:**
- a documentacao deixa explicito como slug e gerado, validado e mantido
- schemas e contratos aceitam apenas formato coerente com a politica

---

### T2: Revisar convencao de `@@map` e definir prefixos por dominio

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `docs/PRD/PRD-002-project-context-url-routing/CONTEXT.md` se necessario

**What to do:**
- Auditar todas as tabelas mapeadas no schema.
- Definir a convencao final de prefixos por dominio.
- Renomear tabelas fisicas fora do padrao para a nova convencao.

**Verification:**
- nenhuma tabela principal fica sem prefixo de dominio
- revisao manual do bloco de `@@map(...)` confirma consistencia

---

### T3: Adicionar slug ao modelo de projeto

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/...`

**What to do:**
- Adicionar o campo `slug` em `Project`.
- Garantir unicidade composta por `organizationId` + `slug`.
- Definir estrategia simples de populacao de slug para ambientes resetados.

**Verification:**
- `npx prisma validate`
- confirmar que a seed ou criacao de projeto gera slug sem colisao dentro da organizacao

---

### T4: Expor slug nos contratos e servicos de projeto

**Files:**
- Modify: `src/schemas/projects/project-schemas.ts`
- Modify: `src/services/projects/project.service.ts`
- Test: `src/services/projects/__tests__/project.service.test.ts`

**What to do:**
- Incluir `slug` nos payloads de listagem, detalhe e criacao/edicao quando aplicavel.
- Garantir validacao de formato e disponibilidade de slug.
- Manter validacao de unicidade por organizacao.

**Verification:**
- testar criacao, edicao e conflito de slug
- testar erro quando o slug estiver em uso

**Depends on:** T3

---

## Fase 2: Infraestrutura de Contexto Canonico

### T5: Criar resolver server-side de contexto por slug

**Files:**
- Create: `src/server/project/resolve-project-context.ts`
- Modify: `src/server/project/get-current-project-id.ts`
- Modify: `src/server/project/project-scope.ts`

**What to do:**
- Resolver `organizationSlug` e `projectSlug` para um contexto validado.
- Retornar `organizationId`, `projectId`, nomes e slugs para o layout.
- Reduzir o fluxo antigo por cookie para uso estritamente auxiliar ou remover quando possivel.

**Verification:**
- testar slug valido, slug inexistente e slug que pertence a outra organizacao

**Depends on:** T4

---

### T6: Criar arvore canonica de rotas no app

**Files:**
- Create: `src/app/app/[organizationSlug]/[projectSlug]/layout.tsx`
- Create: `src/app/app/[organizationSlug]/[projectSlug]/page.tsx`

**What to do:**
- Implementar o layout projetizado que recebe o contexto validado por slug.
- Tornar esse layout a base de todos os modulos scoped por projeto.
- Garantir comportamento de erro/redirect para organizacao ou projeto invalidos.

**Verification:**
- navegar para rota valida e invalida
- confirmar que o layout recebe o contexto correto sem depender de cookie

**Depends on:** T5

---

### T7: Definir entrada canonica do app

**Files:**
- Modify: `src/app/app/...`

**What to do:**
- Redirecionar `/app` para o ultimo projeto valido do usuario.
- Se nao houver ultimo projeto conhecido, resolver um projeto padrao valido da organizacao.
- Nao introduzir camada obrigatoria de redirects legados como parte do escopo principal.

**Verification:**
- abrir `/app`
- confirmar que a entrada cai em uma URL canonica valida

**Depends on:** T6

---

## Fase 3: Sidebar, Hook e Navegacao

### T8: Criar validacao de disponibilidade de slug em formularios

**Files:**
- Modify: `src/components/dashboard/projects/...`
- Modify: `src/components/dashboard/organization/...` se necessario
- Modify: `src/app/api/v1/projects/...` e `src/app/api/v1/organizations/...` se necessario

**What to do:**
- Expor validacao de slug em tempo real ou sob demanda para formularios de organizacao e projeto.
- Permitir que o usuario escolha o slug explicitamente.
- Bloquear submit quando o slug for invalido ou indisponivel.

**Verification:**
- o formulario mostra estados de slug valido, invalido e em uso
- o submit falha corretamente se o backend detectar colisao

**Depends on:** T7

### T9: Migrar o seletor de projeto para navegacao por URL

**Files:**
- Modify: `src/components/dashboard/sidebar/sidebar-client.tsx`
- Modify: `src/components/dashboard/projects/project-selector.tsx`

**What to do:**
- Trocar a selecao de projeto para `router.push` da mesma area no novo `projectSlug`.
- Preservar a secao atual quando fizer sentido.
- Persistir opcionalmente o ultimo projeto no backend apenas para fallback de entrada.

**Verification:**
- trocar projeto e confirmar mudanca real da URL
- abrir nova aba e confirmar contexto consistente

**Depends on:** T7

---

### T10: Substituir o hook de projeto atual por contexto derivado da rota

**Files:**
- Modify: `src/hooks/project/use-project.ts`
- Create: `src/hooks/project/use-project-route-context.ts` se necessario

**What to do:**
- Fazer o hook expor o projeto atual a partir do contexto da rota ou de uma fonte canonica derivada dela.
- Eliminar leitura direta de cookie no cliente.
- Garantir sincronizacao com `router.push`, refresh e navegacao entre abas.

**Verification:**
- consumidores do hook passam a refletir a troca de URL sem refresh manual

**Depends on:** T9

---

### T11: Ajustar links e builders de navegacao interna

**Files:**
- Modify: `src/components/dashboard/sidebar/sidebar.tsx`
- Modify: `src/components/dashboard/layout/...`
- Modify: componentes que geram links hardcoded para `/dashboard/...`

**What to do:**
- Centralizar geracao de links com `organizationSlug` e `projectSlug`.
- Remover dependencias de caminhos fixos sem contexto de projeto.
- Preparar helpers reutilizaveis para montar URLs internas.

**Verification:**
- smoke test de navegacao lateral entre modulos scoped por projeto

**Depends on:** T9

---

## Fase 4: Migracao de Modulos Principais

### T12: Migrar a primeira onda de paginas para a URL canonica

**Files:**
- Create/Modify: `src/app/app/[organizationSlug]/[projectSlug]/campaigns/whatsapp/...`
- Create/Modify: `src/app/app/[organizationSlug]/[projectSlug]/whatsapp/inbox/...`
- Create/Modify: `src/app/app/[organizationSlug]/[projectSlug]/leads/...`
- Create/Modify: `src/app/app/[organizationSlug]/[projectSlug]/tickets/...`
- Create/Modify: `src/app/app/[organizationSlug]/[projectSlug]/sales/...`

**What to do:**
- Mover os modulos mais sensiveis a projeto para a nova arvore.
- Garantir que recebam contexto explicito por slug.
- Remover dependencias de `/dashboard` para esses modulos, sem exigir convivencia longa entre as duas arvores.

**Verification:**
- abrir cada modulo pela URL nova
- confirmar que a troca de projeto preserva a secao atual quando suportado

**Depends on:** T11

---

### T13: Adaptar APIs para preferirem contexto explicito

**Files:**
- Modify: `src/app/api/v1/...`
- Modify: `src/server/project/project-scope.ts`

**What to do:**
- Priorizar `projectId` explicito derivado da rota ou payload validado quando cabivel.
- Reduzir dependencia de resolver escopo por estado implicito.
- Remover fallback implicito onde a nova estrutura ja for definitiva.

**Verification:**
- revisar endpoints criticos de leads, sales, tickets, items, meta ads e whatsapp

**Depends on:** T12

---

## Fase 5: Hardening e Limpeza

### T14: Executar reset de ambiente e smoke test completo

**Files:**
- Modify: `scripts/reset-db.sh` se necessario
- Modify: `docs/PRD/PRD-002-project-context-url-routing/QUICK_START.md`
- Create: checklist operacional se necessario

**What to do:**
- Resetar banco e ambiente local com `scripts/reset-db.sh` se a nova modelagem exigir.
- Validar criacao de dados consistentes com slugs e nova navegacao.
- Documentar o procedimento oficial de bootstrap do ambiente apos a mudanca.

**Verification:**
- `scripts/reset-db.sh`
- `npm run build`
- smoke manual nas areas principais

**Depends on:** T13
