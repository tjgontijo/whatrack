51 results - 15 files

src/features/analytics/hooks/use-dashboard-analytics.ts:
  24    activeConversations: number
  25:   openTickets: number
  26    conversionRate: number

  47    image: string | null
  48:   ticketsAssigned: number
  49:   ticketsClosed: number
  50:   ticketsWon: number
  51    salesCount: number

src/features/analytics/services/conversion-funnel.ts:
  17        COALESCE(SUM(deal_value), 0) as total_value
  18:     FROM tickets
  19      WHERE organization_id = ${organizationId}::uuid

  34      FROM ticket_stages ts
  35:     LEFT JOIN tickets t ON t.stage_id = ts.id
  36        AND t.created_at BETWEEN ${startDate} AND ${endDate}

src/features/analytics/services/efficiency-metrics.ts:
  21        t.resolution_time_sec
  22:     FROM tickets t
  23      WHERE t.organization_id = ${organizationId}::uuid

  37        AVG(resolution_time_sec)::int as avg_resolution_sec
  38:     FROM tickets
  39      WHERE organization_id = ${organizationId}::uuid

src/features/analytics/services/lead-activity.ts:
  18      JOIN leads l ON l.id = c.lead_id
  19:     JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
  20      JOIN ticket_stages ts ON ts.id = t.stage_id

  37      JOIN leads l ON l.id = c.lead_id
  38:     JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
  39      WHERE c.organization_id = ${organizationId}::uuid

src/features/analytics/services/sla-metrics.ts:
  26          END as bucket
  27:       FROM tickets
  28        WHERE organization_id = ${organizationId}::uuid

  44        u.name as assignee_name
  45:     FROM tickets t
  46      JOIN conversations c ON c.id = t.conversation_id

src/features/dashboard/components/pipeline/pipeline-stages-manager.tsx:
   72    isClosed: boolean
   73:   ticketsCount: number
   74  }

  131          <p className='mt-0.5 text-[11px] text-muted-foreground'>
  132:           {stage.ticketsCount} deal{stage.ticketsCount !== 1 ? 's' : ''}
  133          </p>

  148            description={
  149:             stage.ticketsCount > 0
  150:               ? `A fase "${stage.name}" tem ${stage.ticketsCount} deal(s) que serão movidos para a fase padrão antes da exclusão.`
  151                : `Tem certeza que deseja excluir a fase "${stage.name}"?`

src/features/deal-stages/services/__tests__/ticket-stage.service.test.ts:
   3  const prismaMock = vi.hoisted(() => ({
   4:   ticketStage: {
   5      findFirst: vi.fn(),

  22  import {
  23:   deleteTicketStage,
  24:   reorderTicketStages,
  25:   updateTicketStage,
  26  } from '@/features/deal-stages/services/deal-stage.service'

  33    it('unsets previous default stage when setting a new default', async () => {
  34:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-1', name: 'Novo' })
  35:     prismaMock.ticketStage.update.mockResolvedValueOnce({
  36        id: 'stage-1',

  44  
  45:     const result = await updateTicketStage({
  46        organizationId: 'org-1',

  50  
  51:     expect(prismaMock.ticketStage.updateMany).toHaveBeenCalledWith({
  52        where: { organizationId: 'org-1', id: { not: 'stage-1' } },

  58    it('reorders stages when all ids belong to organization', async () => {
  59:     prismaMock.ticketStage.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
  60:     prismaMock.ticketStage.update.mockResolvedValue({})
  61      prismaMock.$transaction.mockResolvedValueOnce([])
  62  
  63:     const result = await reorderTicketStages({
  64        organizationId: 'org-1',

  72    it('reassigns deals to default stage before deleting a stage', async () => {
  73:     prismaMock.ticketStage.findFirst
  74        .mockResolvedValueOnce({ id: 'stage-del', isDefault: false })
  75        .mockResolvedValueOnce({ id: 'stage-default' })
  76:     prismaMock.ticketStage.count.mockResolvedValueOnce(3)
  77      prismaMock.deal.updateMany.mockResolvedValueOnce({ count: 4 })
  78:     prismaMock.ticketStage.delete.mockResolvedValueOnce({})
  79  
  80:     const result = await deleteTicketStage({
  81        organizationId: 'org-1',

  88      })
  89:     expect(prismaMock.ticketStage.delete).toHaveBeenCalledWith({ where: { id: 'stage-del' } })
  90      expect(result).toEqual({ success: true })

src/features/deals/services/__tests__/deal.service.test.ts:
    9    },
   10:   ticketStage: {
   11      findFirst: vi.fn(),

  125      prismaMock.deal.findFirst.mockResolvedValueOnce({ stageId: 'stage-old', status: 'open' })
  126:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-new' })
  127      prismaMock.deal.update.mockResolvedValueOnce({

  162      prismaMock.deal.findFirst.mockResolvedValueOnce({ stageId: 'stage-same', status: 'open' })
  163:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-same' })
  164      prismaMock.deal.update.mockResolvedValueOnce({

  231          lifetimeValue: { increment: 300 },
  232:         totalTickets: { increment: 1 },
  233        },

src/features/projects/services/project.service.ts:
  283  
  284:   const projectTickets = await prisma.deal.findMany({
  285      where: {

  293  
  294:   const conversionCount = projectTickets.length
  295      ? await prisma.metaConversionEvent.count({

  299            ticketId: {
  300:             in: projectTickets.map((deal) => deal.id),
  301            },

src/features/whatsapp/components/inbox/deal-panel.tsx:
   80    leadInsights: {
   81:     totalTickets: number
   82      lifetimeValue: string

  445                    <span className='font-bold text-xs'>
  446:                     {optimisticDeal.leadInsights.totalTickets} deals
  447                    </span>

src/features/whatsapp/hooks/use-realtime.ts:
  74  
  75:       const ticketsSub = subscribeTo(centrifuge, `org:${organizationId}:deals`, (data) => {
  76          if (data.conversationId) {

  87          messagesSub.unsubscribe()
  88:         ticketsSub.unsubscribe()
  89          centrifuge.disconnect()

src/lib/README.md:
  16  | `centrifugo/` | Clientes de integração para comunicação Real-time (Websockets). |
  17: | `constants/` | Enums e valores constantes compartilhados (ex: Status de Tickets). |
  18  | `date/` | Helpers para manipulação de datas e fusos horários (baseado em `date-fns`). |

src/lib/i18n/locales/en-US.json:
  4    "leads": "Leads",
  5:   "tickets": "Tickets",
  6    "sales": "Sales",

src/lib/i18n/locales/es-ES.json:
  4    "leads": "Leads",
  5:   "tickets": "Tickets",
  6    "sales": "Ventas",

src/lib/i18n/locales/pt-BR.json:
  4    "leads": "Leads",
  5:   "tickets": "Tickets",
  6    "sales": "Vendas",
