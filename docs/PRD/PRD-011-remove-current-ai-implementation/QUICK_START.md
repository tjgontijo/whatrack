# QUICK START - PRD-011 Remove Current AI Implementation

---

## Visao Rapida

Este PRD remove completamente a implementacao atual de IA antes da construcao do runtime novo.

Depois dele:

- nao existe mais agente antigo
- nao existe mais insight/aprovacao manual
- nao existe mais classifier por cron
- nao existe mais AI Studio atual
- nao existe mais pagina `/ia`
- nao existe mais Meta Ads Audit sobre a arquitetura antiga
- nao existe mais Meta Ads Copilot
- nao existem mais permissões expostas de IA no produto atual

---

## Premissa

Esse teardown so faz sentido porque o ambiente esta em desenvolvimento e sem usuarios.

---

## Ordem De Execucao

| Fase | Tasks | O que faz |
|---|---|---|
| Fase 1 | T1-T4 | Remove schema, seeds, services e auxiliares |
| Fase 2 | T5-T9 | Remove APIs, telas e navegacao |
| Fase 3 | T10-T13 | Remove triggers operacionais e referencias residuais |
| Fase 4 | T14-T16 | Valida ambiente limpo e libera PRD-012 |

---

## Checklist

- [ ] `AiAgent` e `AiInsight` nao existem mais no schema
- [ ] `message.handler` nao chama mais classifier
- [ ] APIs de agents/insights/skills/usage foram removidas
- [ ] telas `/settings/ai*` foram removidas
- [ ] inbox nao mostra approvals
- [ ] Meta Ads Audit antigo nao depende mais da IA atual
- [ ] Meta Ads Copilot nao existe mais
- [ ] onboarding nao provisiona skills antigas
- [ ] `view:ai` e `manage:ai` nao existem mais no app atual
- [ ] `reset-db`, `test`, `build` e `lint` passam

---

## Criterio De Sucesso

O PRD-011 termina quando a base estiver limpa e pronta para o PRD-012, mesmo que o produto fique temporariamente sem qualquer funcionalidade de IA.
