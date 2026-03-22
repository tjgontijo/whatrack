# Contexto: AI Studio Platform

**Ultima atualizacao:** 2026-03-21

---

## Definicao

Depois que o core runtime estiver estavel, o produto ainda precisara de uma camada de operacao. O AI Studio e essa camada.

Ele existe para que o time consiga:

- entender o que o agente esta fazendo
- alterar prompts e skills de forma controlada
- ativar blueprints
- gerenciar policies por projeto
- migrar features paralelas para o novo runtime

---

## Quem Usa

- usuarios internos com permissao `manage:ai`
- operadores e admins de projeto
- eventualmente suporte/ops que precisem investigar execucoes

---

## Fluxo Atual Esperado Depois Do PRD-012

O PRD-012 deve deixar o produto com:

- config minima por projeto
- um blueprint default
- runtime inbound estavel
- execution logs minimos
- inbox mostrando atividade read-only

O que ainda faltara:

- studio completo para editar e publicar skills
- governanca de blueprints
- UI de policies
- observabilidade mais rica
- migracao de features paralelas, como Meta Ads Audit

---

## Regras De Negocio Relevantes

- tudo continua project-scoped
- publicar versao de skill deve ser acao explicita
- logs de execucao sao auditaveis e nao editaveis
- policies de seguranca continuam server-side first
- UI nao pode se tornar fonte unica de verdade; banco e runtime permanecem soberanos

---

## Dados E Integracoes

### Modelos Base Reutilizados

- `AiProjectConfig`
- `AiBlueprintActivation`
- `AiSkill`
- `AiSkillVersion`
- `AiConversationState`
- `AiSkillExecutionLog`
- `AiCrisisKeyword`

### Possiveis Extensoes De Modelo

- historico de publicacao de skill, se o modelo atual de versao nao bastar
- regras de terminologia configuraveis por projeto
- metadados de UI para blueprints e skills

### Integracoes

- runtime Mastra do PRD-012
- Meta Ads Audit
- APIs project-scoped do dashboard

---

## Estado Desejado

### AI Studio

O projeto deve ter um hub de IA capaz de:

- exibir o blueprint ativo
- listar skills do projeto
- abrir detalhe da skill
- publicar nova versao
- gerenciar policies
- investigar logs

### Meta Ads Audit

O endpoint de audit deixa de usar arquitetura paralela e passa a chamar uma skill do runtime novo.

### Evolucao De Superficie

Quando este PRD terminar, a UI minima do PRD-012 deve ter virado um AI Studio completo, sem edicao manual em banco ou codigo para operar skills e policies.
