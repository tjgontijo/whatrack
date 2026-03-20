# Diagnostic: Contexto Canonico de Organizacao e Projeto na URL

**Data:** 2026-03-20
**Status:** Draft

---

## Resumo Executivo

- o problema principal e o escopo de projeto implicito fora da URL
- o risco principal e divergencia entre cliente, servidor e navegacao ao trocar o projeto ativo
- o impacto principal e inconsistencias operacionais em modulos que deveriam ser deterministas por projeto

---

## Problemas Encontrados

### 1. Escopo de projeto invisivel na navegacao

**Problema:** o contexto principal de projeto nao esta refletido na URL. O usuario pode estar em um modulo sensivel a projeto sem qualquer indicacao navegavel do escopo atual.

**Impacto:**
- links nao sao autoexplicativos nem facilmente compartilhaveis
- refresh e novas abas dependem de estado lateral
- reproduzir bugs por projeto exige saber qual seletor estava ativo

**Solucao Necessaria:**
1. criar rotas canonicas com `organizationSlug` e `projectSlug`
2. migrar a navegacao da sidebar para trocar URL em vez de apenas estado implcito

### 2. Multiplas fontes de verdade para o projeto atual

**Problema:** o projeto pode ser resolvido por header, sessao, cookie e hook cliente. Isso distribui o contexto em camadas demais.

**Impacto:**
- aumenta a chance de SSR e client ficarem dessincronizados
- torna debugging e manutencao mais dificeis
- favorece bugs em queries cacheadas e componentes cliente persistentes

**Solucao Necessaria:**
1. tornar a URL a fonte canonica
2. reduzir header/cookie para fallback controlado e nao para decisao primaria

### 3. Ausencia de slug no dominio principal de projeto

**Problema:** o modelo `Project` nao possui `slug`, impedindo URL estavel e legivel por projeto.

**Impacto:**
- a URL projetizada por slug ainda nao pode ser suportada
- seria necessario usar `id`, piorando legibilidade e experiencia

**Solucao Necessaria:**
1. adicionar `slug` em `Project`
2. criar backfill e regras de unicidade por organizacao

### 4. Politica de slug nao formalizada entre organizacao e projeto

**Problema:** embora `Organization` ja tenha `slug`, o sistema ainda nao explicita uma politica unica para geracao, colisao, edicao e garantia de unicidade entre `Organization.slug` e `Project.slug`.

**Impacto:**
- comportamento inconsistente na criacao de slugs
- UX ambigua em nomes repetidos
- risco de regras espalhadas em varios pontos sem contrato claro

**Solucao Necessaria:**
1. definir normalizacao unica de slug
2. diferenciar explicitamente a unicidade global da organizacao e a unicidade por organizacao do projeto
3. reforcar a garantia final no banco
4. definir UX de escolha e validacao de slug sem geracao silenciosa de alternativas

### 5. Estrutura atual de rotas nao comunica hierarquia multi-tenant

**Problema:** a arvore atual baseada em `/dashboard/...` nao carrega explicitamente organizacao e projeto nos segmentos.

**Impacto:**
- o layout nao recebe contexto do path
- a navegacao entre modulos depende de mecanismos auxiliares
- migracoes futuras continuam propagando o mesmo acoplamento

**Solucao Necessaria:**
1. criar uma nova arvore em `/app/[organizationSlug]/[projectSlug]/...`
2. mapear redirects temporarios a partir de rotas legadas

### 6. Risco de manter modelo hibrido por tempo demais

**Problema:** manter ao mesmo tempo o contexto antigo por cookie e a nova URL canonica tende a prolongar complexidade e multiplicar bugs de sincronizacao.

**Impacto:**
- mais condicoes de borda entre rotas antigas e novas
- mais custo de manutencao temporaria
- maior chance de componentes continuarem dependentes de estado implicito

**Solucao Necessaria:**
1. assumir corte arquitetural direto
2. remover a necessidade de compatibilidade legada do escopo principal
3. usar reset de banco quando isso simplificar a implementacao

### 7. Convencao fisica de tabelas inconsistente

**Problema:** o schema atual mistura tabelas com prefixos de dominio claros, como `whatsapp_*`, `meta_*`, `billing_*` e `ai_*`, com tabelas genericas ou pouco consistentes, como `organization`, `projects`, `member`, `invitation`, `leads`, `tickets` e `sales`.

**Impacto:**
- dificulta leitura e governanca do banco
- reduz previsibilidade para novas entidades
- aumenta a chance de convencoes divergentes entre dominios

**Solucao Necessaria:**
1. definir uma convencao fisica unica por dominio
2. revisar todos os `@@map(...)` fora do padrao
3. aproveitar o reset de banco para renomear o que for necessario sem carregar legado

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| Validacao server-side de projeto | ✅ | `getCurrentProjectId` e `resolveProjectScope` ja revalidam pertencimento do projeto a organizacao |
| Slug de organizacao | ✅ | `Organization` ja possui `slug` no schema |
| Seletor centralizado de projeto | ✅ | a troca de projeto parte de um unico ponto na sidebar |
| Estrutura multi-tenant ja existente | ✅ | a maioria dos modelos relevantes ja possui `organizationId` e `projectId` |

---

## Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Escopo implicito fora da URL | Alto | Alta | Critico | Medio |
| Fontes de verdade distribuidas | Alto | Alta | Critico | Medio |
| Falta de slug em projeto | Alto | Alta | Critico | Baixo |
| Politica de slug nao formalizada | Medio | Alta | Alto | Baixo |
| Migracao de arvore de rotas | Medio | Alta | Alto | Medio |
| Modelo hibrido prolongado | Alto | Alta | Critico | Medio |
| Convencao fisica inconsistente | Medio | Alta | Alto | Medio |

---

## Ordem Recomendada

1. Formalizar a politica de slug para organizacao e projeto
2. Modelar `project.slug` e servicos de resolucao por slug
3. Revisar a convencao fisica de tabelas com prefixo de dominio
4. Criar layout canonico em `/app/[organizationSlug]/[projectSlug]/...`
5. Migrar sidebar e contexto cliente para a URL
6. Migrar os modulos principais para a nova estrutura
7. Remover dependencias implicitas restantes sem manter camada legada longa
