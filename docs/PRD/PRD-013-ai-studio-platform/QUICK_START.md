# QUICK START - PRD-013 AI Studio Platform

---

## Visao Rapida

Este PRD comeca quando o PRD-012 ja tiver entregue:

- runtime estavel
- config minima por projeto
- execution logs
- blueprint default operando

So depois disso vale abrir o AI Studio completo.

---

## Escopo Rapido

O PRD-013 entrega:

- blueprints via UI
- skills e versoes via UI
- policies via UI
- execution logs completos
- Meta Ads Audit como skill
- studio final sobre o runtime novo

---

## Ordem De Execucao

| Fase | Tasks | O que faz |
|---|---|---|
| Fase 1 | T1-T5 | Services, APIs e permissoes |
| Fase 2 | T6-T10 | Hub do studio, blueprints e skills |
| Fase 3 | T11-T14 | Policies e observabilidade |
| Fase 4 | T15-T18 | Meta Ads Audit e cleanup |

---

## Precondicao

Nao iniciar este PRD antes de:

- PRD-012 com smoke test aprovado
- runtime novo ser o caminho principal do inbound
- logs tecnicos basicos estarem disponiveis

---

## Critério De Sucesso

O PRD-013 termina quando o time consegue operar a nova IA sem depender de:

- alteracao manual no banco para skills/policies
- alteracao manual em codigo para operar o studio
