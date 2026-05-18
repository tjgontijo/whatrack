---
name: Decisao de renomear Ticket para Deal
description: Decisao arquitetural de renomear o conceito Ticket para Deal em todo o sistema
type: project
---

Ticket renomeado para Deal em todo o sistema.

**Why:** "Ticket" é jargão de suporte (Zendesk/Freshdesk). O WhaTrack é um CRM de vendas — o conceito correto é "Deal" (negociação). "Sale" é a transação concluída — conceito diferente, sem conflito.

**How to apply:**
- Model: `Deal` (era `Ticket`)
- Stages: `DealStage` (era `TicketStage`)
- Rota operacional: `/deals` (era `/tickets`)
- API: `/api/v1/deals` e `/api/v1/deal-stages`
- Feature dirs: `src/features/deals/` e `src/features/deal-stages/`
- View kanban = "Pipeline" na UI, view tabela = "Lista"
- Settings pipeline: `/settings/pipeline/` — mantém nome (configuração do pipeline)
- DB tables: renomear via migration Prisma
- Ainda NAO implementado — decisao tomada em 2026-05-18
