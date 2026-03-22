# Diagnostic: Remove Current AI Implementation

**Data:** 2026-03-21
**Status:** Complete

---

## Resumo Executivo

- O stack atual de IA atrapalha mais do que ajuda para a migracao.
- O principal ganho de remover primeiro e eliminar nome, schema e UX herdados antes da V1 nova.
- O principal risco e deixar referencias escondidas e quebrar build/testes.

---

## Problemas Encontrados

### 1. O Modelo Atual Conflita Com O Modelo Novo

**Problema:** o sistema atual usa `AiAgent`, `AiSkill` legado e `AiInsight`, enquanto o PRD-012 quer reintroduzir modelos e fluxos novos para runtime project-scoped.

**Impacto:**
- colisao de conceitos
- alto custo cognitivo
- risco de manter adapters desnecessarios

**Solucao Necessaria:**
1. remover o schema legado
2. remover services e APIs antigas
3. abrir espaco para nomes e contratos novos

### 2. A UX Atual E Totalmente Amarrada Ao Fluxo De Aprovacao Manual

**Problema:** inbox, AI Studio e APIs foram desenhados para `AiInsight` e aprovacao humana.

**Impacto:**
- essas superficies nao ajudam o runtime novo
- manter isso vivo gera retrabalho de cleanup depois

**Solucao Necessaria:**
1. apagar telas e endpoints atuais
2. reintroduzir UX apenas quando o runtime novo existir

### 3. O Inbound Ainda Dispara Scheduler Legado

**Problema:** o `message.handler` ainda enfileira classificacao assincrona no caminho principal.

**Impacto:**
- qualquer migracao futura precisa conviver com um side effect antigo
- o WhatsApp continua dependente de fluxo obsoleto

**Solucao Necessaria:**
1. remover enqueue do inbound
2. remover cron e route do classifier

### 4. Provisioning Antigo Vaza Para Onboarding E Organizacao

**Problema:** a criacao de organizacao e o onboarding ainda provisionam skills do modelo atual.

**Impacto:**
- dados legados continuam nascendo mesmo depois da limpeza parcial

**Solucao Necessaria:**
1. remover `ensureCoreSkillsForOrganization`
2. limpar seeds do modelo antigo

### 5. Meta Ads Audit Mantem Uma Segunda Arquitetura Antiga

**Problema:** o endpoint de audit ainda depende de `dispatchAiEventForAudit`.

**Impacto:**
- mesmo removendo inbox e AI Studio, a base continuaria carregando runtime antigo

**Solucao Necessaria:**
1. remover endpoint/fluxo atual
2. reconstruir isso apenas no PRD-013

### 6. O Produto Ainda Expõe IA Em RBAC, Settings E Meta Ads Copilot

**Problema:** mesmo removendo agents/insights, a base continua falando em IA via permissões, rota `/ia`, organização e copilot do Meta Ads.

**Impacto:**
- o produto não fica realmente “sem IA”
- nomes e contratos herdados continuam vazando para novas features

**Solucao Necessaria:**
1. remover `view:ai` e `manage:ai` do app atual
2. remover `aiCopilot*` de schema e services
3. remover páginas e ações secundárias como `/ia` e Meta Ads Copilot

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| Ambiente sem usuarios | ✅ | Permite hard delete sem estrategia de transicao |
| PRD-012 e PRD-013 ja existem | ✅ | Existe destino claro para o sistema novo |
| Dependencias do legado sao localizaveis | ✅ | Schema, services, APIs e telas estao bem identificados |

---

## Matriz De Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Referencias escondidas quebrarem build | Alto | Alta | Critico | 2h |
| Seeds/testes antigos falharem apos cleanup | Medio | Alta | Alto | 2h |
| Remocao parcial deixar lixo conceitual | Medio | Media | Medio | 1h |
| Permissoes e settings de IA ficarem expostos | Medio | Media | Medio | 1h |

---

## Ordem Recomendada

1. remover schema legado
2. remover services, APIs e pages
3. remover triggers no inbound/onboarding
4. limpar referencias auxiliares
5. validar build/test/lint/reset-db
