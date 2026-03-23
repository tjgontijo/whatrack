# QUICK START - PRD-013 AI Studio Platform

---

## Visao Rapida

Este PRD comeca quando o PRD-012 ja tiver entregue:

- runtime inbound estavel
- config minima por projeto via API
- execution logs basicos
- `AiEvent` persistido

So depois disso vale abrir o AI Studio completo.

---

## Escopo Rapido

O PRD-013 entrega:

- AI Studio por projeto
- wizard de blueprint sobre `AiProjectConfig`
- skills e versoes via UI com override por projeto
- policies via UI
- execution logs completos
- timeline de `AiEvent` no inbox
- RBAC `view:ai` + `manage:ai`
- frontend alinhado ao shell atual do dashboard

---

## Ordem De Execucao

| Fase | Tasks | O que faz |
|---|---|---|
| Fase 1 | T1-T6 | Schema, services, queries e APIs |
| Fase 2 | T7-T12 | RBAC, hub com `HeaderPageShell`, wizard e skills |
| Fase 3 | T13-T17 | Policies e observabilidade |
| Fase 4 | T18-T19 | Consolidacao final e validacao |

---

## Precondicao

Nao iniciar este PRD antes de:

- PRD-012 com smoke test aprovado
- runtime novo ser o caminho principal do inbound
- `AiEvent` e `AiSkillExecutionLog` estarem disponiveis

---

## Criterio De Sucesso

O PRD-013 termina quando o time consegue operar a nova IA sem depender de:

- alteracao manual no banco para skills e policies
- alteracao manual em codigo para operar o studio
- `manage:ai` para apenas visualizar logs e timeline
- um layout visual novo fora do padrao atual do dashboard
