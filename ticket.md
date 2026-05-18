540 results - 63 files

src/app/(dashboard)/[organizationSlug]/[projectSlug]/analytics/components/conversion-funnel.tsx:
  41      id: stage.stage_name,
  42:     value: stage.ticket_count,
  43      label: stage.stage_name,

src/app/(dashboard)/[organizationSlug]/[projectSlug]/analytics/components/lead-activity.tsx:
  27            <Badge className='bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'>
  28:             {data.waitingLeads?.length || 0} Tickets
  29            </Badge>

src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx:
   33  
   34: type TicketItem = {
   35    id: string

   80  
   81: const getLeadName = (ticket: TicketItem) =>
   82:   ticket.lead.name || ticket.lead.pushName || ticket.lead.phone || 'Sem nome'
   83  

   90  
   91: const columns: ColumnDef<TicketItem>[] = [
   92    {

   94      label: 'Lead',
   95:     render: (ticket) => (
   96        <div className='flex items-center gap-2.5'>

   98            <AvatarFallback className='bg-primary/5 font-semibold text-[9px] text-primary'>
   99:             {getInitials(getLeadName(ticket))}
  100            </AvatarFallback>
  101          </Avatar>
  102:         <span className='truncate font-medium text-[13px]'>{getLeadName(ticket)}</span>
  103        </div>

  109      width: 160,
  110:     render: (ticket) => (
  111        <div className='flex items-center gap-1.5'>

  113            className='h-2 w-2 shrink-0 rounded-full'
  114:           style={{ backgroundColor: ticket.stage.color }}
  115          />
  116:         <span className='text-sm'>{ticket.stage.name}</span>
  117        </div>

  123      width: 110,
  124:     render: (ticket) => {
  125:       const s = STATUS_BADGE[ticket.status]
  126        return s ? (

  136      width: 120,
  137:     render: (ticket) => (
  138        <span className='font-semibold text-emerald-600'>
  139:         {ticket.dealValue ? (
  140:           formatCurrencyBRL(ticket.dealValue)
  141          ) : (

  150      width: 140,
  151:     render: (ticket) =>
  152:       ticket.assignee ? (
  153:         <span className='text-muted-foreground text-sm'>{ticket.assignee.name}</span>
  154        ) : (

  163      className: 'text-right',
  164:     render: (ticket) => (
  165:       <span className='text-muted-foreground text-xs'>{daysSince(ticket.createdAt)}d</span>
  166      ),

  169  
  170: const cardConfig: CardConfig<TicketItem> = {
  171:   icon: (ticket) => (
  172      <Avatar className='h-9 w-9 border border-border'>
  173        <AvatarFallback className='bg-primary/5 font-bold text-primary text-xs'>
  174:         {getInitials(getLeadName(ticket))}
  175        </AvatarFallback>

  178    title: getLeadName,
  179:   subtitle: (ticket) => (
  180      <div className='mt-0.5 flex items-center gap-1.5'>

  182          className='h-2 w-2 shrink-0 rounded-full'
  183:         style={{ backgroundColor: ticket.stage.color }}
  184        />
  185:       <span className='text-muted-foreground text-xs'>{ticket.stage.name}</span>
  186      </div>
  187    ),
  188:   badge: (ticket) => {
  189:     const s = STATUS_BADGE[ticket.status]
  190      return s ? (

  195    },
  196:   footer: (ticket) => (
  197      <div className='flex w-full items-center justify-between'>

  199          <MessageSquare className='h-3 w-3' />
  200:         {ticket.messagesCount}
  201        </span>
  202:       {ticket.dealValue ? (
  203          <span className='font-semibold text-emerald-600 text-xs'>
  204:           {formatCurrencyBRL(ticket.dealValue)}
  205          </span>
  206        ) : (
  207:         <span className='text-muted-foreground text-xs'>{daysSince(ticket.createdAt)}d atrás</span>
  208        )}

  212  
  213: function TicketKanbanCard({ ticket }: { ticket: TicketItem }) {
  214    return (

  218            <AvatarFallback className='bg-primary/5 font-semibold text-[9px] text-primary'>
  219:             {getInitials(getLeadName(ticket))}
  220            </AvatarFallback>

  222          <div className='min-w-0 flex-1'>
  223:           <p className='truncate font-semibold text-sm leading-tight'>{getLeadName(ticket)}</p>
  224:           {ticket.lead.phone && (
  225              <p className='truncate font-mono text-[11px] text-muted-foreground'>
  226:               {ticket.lead.phone}
  227              </p>

  234            <Calendar className='h-3 w-3' />
  235:           {daysSince(ticket.createdAt)}d
  236          </span>
  237:         {ticket.dealValue && (
  238            <span className='flex items-center gap-1 font-semibold text-emerald-600'>
  239              <DollarSign className='h-3 w-3' />
  240:             {formatCurrencyBRL(ticket.dealValue)}
  241            </span>
  242          )}
  243:         {ticket.assignee && (
  244            <Avatar className='h-4 w-4'>
  245              <AvatarFallback className='bg-muted text-[8px]'>
  246:               {getInitials(ticket.assignee.name)}
  247              </AvatarFallback>

  254  
  255: export default function TicketsPage() {
  256    const { organizationId } = useRequiredProjectRouteContext()

  277    const {
  278:     data: tickets,
  279      total,

  284      refetch,
  285:   } = useCrudInfiniteQuery<TicketItem>({
  286:     queryKey: ['tickets'],
  287      endpoint: '/api/v1/deals',

  293    const { data: stagesData } = useQuery<{ items: KanbanColumn[] }>({
  294:     queryKey: ['ticket-stages'],
  295      queryFn: async () => {

  303  
  304:   // Move ticket mutation
  305    const moveMutation = useMutation({
  306:     mutationFn: async ({ ticketId, stageId }: { ticketId: string; stageId: string }) => {
  307:       const res = await fetch(`/api/v1/deals/${ticketId}`, {
  308          method: 'PATCH',

  313          const err = await res.json()
  314:         throw new Error(err.error ?? 'Falha ao mover ticket')
  315        }

  318      onSuccess: () => {
  319:       queryClient.invalidateQueries({ queryKey: ['tickets'] })
  320      },

  322        toast.error(err.message)
  323:       queryClient.invalidateQueries({ queryKey: ['tickets'] })
  324      },

  384          <CrudDataView
  385:           data={tickets}
  386            view={view}

  389              <CrudListView
  390:               data={tickets}
  391                columns={columns}

  396              <CrudCardView
  397:               data={tickets}
  398                config={cardConfig}

  404                columns={kanbanColumns}
  405:               items={tickets}
  406                getItemId={(t) => t.id}
  407                getColumnId={(t) => t.stage.id}
  408:               renderCard={(ticket) => <TicketKanbanCard ticket={ticket} />}
  409:               onMoveItem={(ticketId, stageId) => moveMutation.mutate({ ticketId, stageId })}
  410              />

src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/pipeline/page.tsx:
  10    const { organizationSlug, projectSlug } = await params
  11:   redirect(`/${organizationSlug}/${projectSlug}/tickets`)
  12  }

src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/inbox/page.tsx:
  102  
  103:           {/* Right Panel: Ticket Details */}
  104            <ResizablePanel defaultSize={25} minSize={20} maxSize={40} collapsible>

  113                <div className='flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground text-sm'>
  114:                 Selecione uma conversa para ver os detalhes do ticket
  115                </div>

src/app/api/v1/conversations/[conversationId]/deal/route.ts:
   1  import { type NextRequest, NextResponse } from 'next/server'
   2: import { getConversationOpenDeal } from '@/features/conversations/services/conversation-ticket.service'
   3  import { apiError } from '@/lib/utils/api-response'

  29    } catch (error) {
  30:     logger.error({ err: error }, '[Conversation Ticket] Error')
  31:     return apiError('Failed to fetch ticket', 500, error)
  32    }

src/app/api/v1/deal-stages/route.ts:
   1  import { NextResponse } from 'next/server'
   2: import { createDealStageSchema } from '@/features/deal-stages/schemas/ticket-stage.schemas'
   3  import {

   5    listDealStages,
   6: } from '@/features/deal-stages/services/ticket-stage.service'
   7  import { apiError } from '@/lib/utils/api-response'

  29    } catch (error) {
  30:     logger.error({ err: error }, '[ticket-stages] GET error')
  31      return apiError('Falha ao buscar fases', 500, error)

  65    } catch (error) {
  66:     logger.error({ err: error }, '[ticket-stages] POST error')
  67      return apiError('Falha ao criar fase', 500, error)

src/app/api/v1/deal-stages/[stageId]/route.ts:
   1  import { type NextRequest, NextResponse } from 'next/server'
   2: import { updateDealStageSchema } from '@/features/deal-stages/schemas/ticket-stage.schemas'
   3  import {

   5    updateDealStage,
   6: } from '@/features/deal-stages/services/ticket-stage.service'
   7  import { apiError } from '@/lib/utils/api-response'

  45    } catch (error) {
  46:     logger.error({ err: error }, '[ticket-stages/[stageId]] PUT error')
  47      return apiError('Falha ao atualizar fase', 500, error)

  79    } catch (error) {
  80:     logger.error({ err: error }, '[ticket-stages/[stageId]] DELETE error')
  81      return apiError('Falha ao excluir fase', 500, error)

src/app/api/v1/deal-stages/reorder/route.ts:
   1  import { NextResponse } from 'next/server'
   2: import { reorderTicketStageSchema } from '@/features/deal-stages/schemas/ticket-stage.schemas'
   3: import { reorderDealStages } from '@/features/deal-stages/services/ticket-stage.service'
   4  import { apiError } from '@/lib/utils/api-response'

  16      const body = await req.json()
  17:     const parsed = reorderTicketStageSchema.safeParse(body)
  18      if (!parsed.success) {

  37    } catch (error) {
  38:     logger.error({ err: error }, '[ticket-stages/reorder] PUT error')
  39      return apiError('Falha ao reordenar fases', 500, error)

src/features/analytics/hooks/use-dashboard-analytics.ts:
  10    leads: number
  11:   tickets: number
  12    sales: number

  24    activeConversations: number
  25:   openTickets: number
  26    conversionRate: number

  47    image: string | null
  48:   ticketsAssigned: number
  49:   ticketsClosed: number
  50:   ticketsWon: number
  51    salesCount: number

src/features/analytics/services/conversion-funnel.ts:
  11    const [statusOverview, stageOverview] = await Promise.all([
  12:     // Query to get tickets by status
  13      prisma.$queryRaw`

  17        COALESCE(SUM(deal_value), 0) as total_value
  18:     FROM tickets
  19      WHERE organization_id = ${organizationId}::uuid

  24  
  25:     // Query to get tickets by stage
  26      prisma.$queryRaw`

  31        ts.order,
  32:       COUNT(t.id)::int as ticket_count,
  33        COALESCE(SUM(t.deal_value), 0) as total_value
  34:     FROM ticket_stages ts
  35:     LEFT JOIN tickets t ON t.stage_id = ts.id
  36        AND t.created_at BETWEEN ${startDate} AND ${endDate}

src/features/analytics/services/efficiency-metrics.ts:
  10  ) {
  11:   const ticketEfficiencies = await prisma.$queryRaw`
  12      SELECT

  21        t.resolution_time_sec
  22:     FROM tickets t
  23      WHERE t.organization_id = ${organizationId}::uuid

  37        AVG(resolution_time_sec)::int as avg_resolution_sec
  38:     FROM tickets
  39      WHERE organization_id = ${organizationId}::uuid

  46    return {
  47:     tickets: ticketEfficiencies,
  48      aggregated: aggregatedEfficiency,

src/features/analytics/services/lead-activity.ts:
  14        EXTRACT(EPOCH FROM (NOW() - c.last_inbound_at))::int as seconds_waiting,
  15:       t.id as ticket_id,
  16        ts.name as stage_name

  18      JOIN leads l ON l.id = c.lead_id
  19:     JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
  20:     JOIN ticket_stages ts ON ts.id = t.stage_id
  21      WHERE c.organization_id = ${organizationId}::uuid

  34        (EXTRACT(EPOCH FROM (NOW() - c.last_outbound_at)) / 3600)::int as hours_since_outbound,
  35:       t.id as ticket_id
  36      FROM conversations c
  37      JOIN leads l ON l.id = c.lead_id
  38:     JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
  39      WHERE c.organization_id = ${organizationId}::uuid

src/features/analytics/services/sla-metrics.ts:
  26          END as bucket
  27:       FROM tickets
  28        WHERE organization_id = ${organizationId}::uuid

  38      SELECT
  39:       t.id as ticket_id,
  40        l.name as lead_name,

  44        u.name as assignee_name
  45:     FROM tickets t
  46      JOIN conversations c ON c.id = t.conversation_id

src/features/auth/schemas/sign-up.ts:
  108  
  109: export const avgTicketOptions = [
  110    { value: 'ate_500', label: 'Até R$ 500' },

  160    leadsPerDay: z.string().min(1, 'Selecione uma opção'),
  161:   avgTicket: z.string().min(1, 'Selecione uma opção'),
  162    monthlyRevenue: z.string().min(1, 'Selecione uma opção'),

  241      leadsPerDay: z.string(),
  242:     avgTicket: z.string(),
  243      monthlyRevenue: z.string(),

src/features/conversations/server.ts:
  1: export { getConversationOpenDeal } from '@/features/conversations/services/conversation-ticket.service'

src/features/dashboard/components/pipeline/pipeline-stages-manager.tsx:
   72    isClosed: boolean
   73:   ticketsCount: number
   74  }

  131          <p className='mt-0.5 text-[11px] text-muted-foreground'>
  132:           {stage.ticketsCount} ticket{stage.ticketsCount !== 1 ? 's' : ''}
  133          </p>

  148            description={
  149:             stage.ticketsCount > 0
  150:               ? `A fase "${stage.name}" tem ${stage.ticketsCount} ticket(s) que serão movidos para a fase padrão antes da exclusão.`
  151                : `Tem certeza que deseja excluir a fase "${stage.name}"?`

  234                  <p className='font-medium text-sm'>Fase padrão</p>
  235:                 <p className='text-muted-foreground text-xs'>Novos tickets entram aqui</p>
  236                </div>

  249                  <p className='text-muted-foreground text-xs'>
  250:                   Tickets nesta fase são considerados fechados
  251                  </p>

  304    const { data, isLoading } = useQuery<{ items: Stage[] }>({
  305:     queryKey: ['ticket-stages', organizationId, projectId],
  306      queryFn: async () => {

  332        setLocalOrder(null)
  333:       queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
  334      },

  353        setLocalOrder(null)
  354:       queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
  355      },

  369        setLocalOrder(null)
  370:       queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
  371      },

  385      onSuccess: () => {
  386:       queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
  387      },

src/features/dashboard/schemas/dashboard-summary.ts:
  83      cac: z.number().nullable(),
  84:     ticket: z.number().nullable(),
  85    }),

src/features/dashboard/services/build-financial-summary.ts:
  24      cac: number | null
  25:     ticket: number | null
  26    }

  48    const cac = salesCount > 0 && investmentValue > 0 ? investmentValue / salesCount : null
  49:   const ticket = salesCount > 0 ? netRevenue / salesCount : null
  50  

  65        cac,
  66:       ticket,
  67      },

src/features/deal-stages/index.ts:
  1  export {
  2:   type CreateTicketStageInput,
  3    createDealStageSchema,
  4:   type ReorderTicketStageInput,
  5:   reorderTicketStageSchema,
  6:   type UpdateTicketStageInput,
  7:   updateTicketStageSchema,
  8: } from '@/features/deal-stages/schemas/ticket-stage.schemas'

src/features/deal-stages/server.ts:
  6    updateDealStage,
  7: } from '@/features/deal-stages/services/ticket-stage.service'

src/features/deal-stages/schemas/ticket-stage.schemas.ts:
   9  
  10: export const updateTicketStageSchema = z.object({
  11    name: z.string().min(1).max(60).optional(),

  20  
  21: export const reorderTicketStageSchema = z.object({
  22    orderedIds: z.array(z.string().uuid()).min(1),

  25  
  26: export type CreateTicketStageInput = z.infer<typeof createDealStageSchema>
  27: export type UpdateTicketStageInput = z.infer<typeof updateTicketStageSchema>
  28: export type ReorderTicketStageInput = z.infer<typeof reorderTicketStageSchema>

src/features/deal-stages/services/__tests__/ticket-stage.service.test.ts:
   3  const prismaMock = vi.hoisted(() => ({
   4:   ticketStage: {
   5      findFirst: vi.fn(),

  11    },
  12:   ticket: {
  13      updateMany: vi.fn(),

  22  import {
  23:   deleteTicketStage,
  24:   reorderTicketStages,
  25:   updateTicketStage,
  26: } from '@/features/deal-stages/services/ticket-stage.service'
  27  
  28: describe('ticket-stage.service', () => {
  29    beforeEach(() => {

  33    it('unsets previous default stage when setting a new default', async () => {
  34:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-1', name: 'Novo' })
  35:     prismaMock.ticketStage.update.mockResolvedValueOnce({
  36        id: 'stage-1',

  41        isClosed: false,
  42:       _count: { tickets: 10 },
  43      })
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

  71  
  72:   it('reassigns tickets to default stage before deleting a stage', async () => {
  73:     prismaMock.ticketStage.findFirst
  74        .mockResolvedValueOnce({ id: 'stage-del', isDefault: false })
  75        .mockResolvedValueOnce({ id: 'stage-default' })
  76:     prismaMock.ticketStage.count.mockResolvedValueOnce(3)
  77:     prismaMock.ticket.updateMany.mockResolvedValueOnce({ count: 4 })
  78:     prismaMock.ticketStage.delete.mockResolvedValueOnce({})
  79  
  80:     const result = await deleteTicketStage({
  81        organizationId: 'org-1',

  84  
  85:     expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
  86        where: { stageId: 'stage-del', organizationId: 'org-1' },

  88      })
  89:     expect(prismaMock.ticketStage.delete).toHaveBeenCalledWith({ where: { id: 'stage-del' } })
  90      expect(result).toEqual({ success: true })

src/features/deals/index.ts:
  2    type CloseDealInput,
  3:   type CreateTicketInput,
  4    closeDealSchema,
  5    createDealSchema,
  6:   type TicketsQueryInput,
  7    dealsQuerySchema,
  8:   type UpdateTicketInput,
  9    updateDealSchema,

src/features/deals/server.ts:
  2  export {
  3:   closeTicket,
  4    createDeal,

src/features/deals/actions/update-deal-stage-action.ts:
   7  export async function updateDealStageAction(params: {
   8:   ticketId: string
   9    stageId: string

  30    await prisma.deal.update({
  31:     where: { id: params.ticketId },
  32      data: { stageId: params.stageId },

src/features/deals/schemas/deal.schemas.ts:
  45  
  46: export type TicketsQueryInput = z.infer<typeof dealsQuerySchema>
  47: export type CreateTicketInput = z.infer<typeof createDealSchema>
  48: export type UpdateTicketInput = z.infer<typeof updateDealSchema>
  49  export type CloseDealInput = z.infer<typeof closeDealSchema>

src/features/deals/services/__tests__/deal.service.test.ts:
    9    },
   10:   ticketStage: {
   11      findFirst: vi.fn(),
   12    },
   13:   ticket: {
   14      findMany: vi.fn(),

   44  import {
   45:   closeTicket,
   46    listDeals,

   49  
   50: describe('ticket.service', () => {
   51    beforeEach(() => {

   56          return input({
   57:           ticket: { update: prismaMock.ticket.update },
   58            sale: {

   70  
   71:   it('lists tickets and keeps filtered where clause', async () => {
   72:     prismaMock.ticket.findMany.mockResolvedValueOnce([
   73        {
   74:         id: 'ticket-1',
   75          status: 'open',

   90      ])
   91:     prismaMock.ticket.count
   92        .mockResolvedValueOnce(1)

   95        .mockResolvedValueOnce(0)
   96:     prismaMock.ticket.aggregate.mockResolvedValueOnce({ _sum: { dealValue: 100 } })
   97  

  106  
  107:     expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
  108        expect.objectContaining({

  119      expect(result.total).toBe(1)
  120:     expect(result.items[0]?.id).toBe('ticket-1')
  121      expect(result.stats.totalDealValue).toBe(100)

  124    it('triggers CAPI on stage change when stage maps to conversion event', async () => {
  125:     prismaMock.ticket.findFirst.mockResolvedValueOnce({ stageId: 'stage-old', status: 'open' })
  126:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-new' })
  127:     prismaMock.ticket.update.mockResolvedValueOnce({
  128:       id: 'ticket-1',
  129        status: 'open',

  146        organizationId: 'org-1',
  147:       ticketId: 'ticket-1',
  148        stageId: 'stage-new',

  151      expect(capiMock.sendEvent).toHaveBeenCalledWith(
  152:       'ticket-1',
  153        'Purchase',
  154        expect.objectContaining({
  155:         eventId: 'purchase-ticket-1',
  156          value: 250,

  161    it('does not trigger CAPI when stage remains unchanged', async () => {
  162:     prismaMock.ticket.findFirst.mockResolvedValueOnce({ stageId: 'stage-same', status: 'open' })
  163:     prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-same' })
  164:     prismaMock.ticket.update.mockResolvedValueOnce({
  165:       id: 'ticket-1',
  166        status: 'open',

  182        organizationId: 'org-1',
  183:       ticketId: 'ticket-1',
  184        stageId: 'stage-same',

  189  
  190:   it('closes won ticket and updates lead counters', async () => {
  191:     prismaMock.ticket.findFirst.mockResolvedValueOnce({
  192:       id: 'ticket-1',
  193        status: 'open',

  196      })
  197:     prismaMock.ticket.update.mockResolvedValueOnce({
  198:       id: 'ticket-1',
  199        status: 'closed_won',

  219  
  220:     const result = await closeTicket({
  221        organizationId: 'org-1',
  222:       ticketId: 'ticket-1',
  223        reason: 'won',

  231          lifetimeValue: { increment: 300 },
  232:         totalTickets: { increment: 1 },
  233        },

  238          projectId: null,
  239:         ticketId: 'ticket-1',
  240          totalAmount: 300,

  250    it('updates existing sale instead of duplicating on won close', async () => {
  251:     prismaMock.ticket.findFirst.mockResolvedValueOnce({
  252:       id: 'ticket-2',
  253        status: 'open',

  258      prismaMock.sale.update.mockResolvedValueOnce({ id: 'sale-2' })
  259:     prismaMock.ticket.update.mockResolvedValueOnce({
  260:       id: 'ticket-2',
  261        status: 'closed_won',

  279  
  280:     await closeTicket({
  281        organizationId: 'org-1',
  282:       ticketId: 'ticket-2',
  283        reason: 'won',

src/features/meta-ads/services/ad-enrichment.service.ts:
   12    /**
   13:    * Enrich Ticket Tracking with Ad names and hierarchy
   14     */
   15:   async enrichTicket(ticketId: string) {
   16      const tracking = await prisma.dealTracking.findUnique({
   17:       where: { ticketId },
   18        select: {

   20          metaEnrichmentStatus: true,
   21:         ticket: {
   22            select: {

   40      if (
   41:       !tracking.ticket.projectId ||
   42:       !tracking.ticket.project ||
   43:       tracking.ticket.project.organizationId !== tracking.ticket.organizationId
   44      ) {
   45:       logger.warn(`[Enrichment] Ticket ${ticketId} has invalid or missing project reference.`)
   46        return

   48  
   49:     // Use the first active connection found for the ticket's project
   50      const connection = await prisma.metaConnection.findFirst({
   51        where: {
   52:         organizationId: tracking.ticket.organizationId,
   53:         projectId: tracking.ticket.projectId,
   54          status: 'ACTIVE',

   60        logger.warn(
   61:         `[Enrichment] No active Meta connection for project ${tracking.ticket.projectId} in organization ${tracking.ticket.organizationId}`
   62        )

   84        await prisma.dealTracking.update({
   85:         where: { ticketId },
   86          data: {

   98  
   99:       logger.info(`[Enrichment] Successfully enriched ticket ${ticketId} with Ad "${adData.name}"`)
  100      } catch (error: unknown) {

  104          { err: error, context: error instanceof MetaApiError ? error.data : message },
  105:         `[Enrichment] Error enriching ticket ${ticketId}`
  106        )

  108        await prisma.dealTracking.update({
  109:         where: { ticketId },
  110          data: {

  119    /**
  120:    * Bulk enrich pending tickets (useful for cron jobs)
  121     */

  131      for (const p of pendings) {
  132:       await this.enrichTicket(p.ticketId)
  133      }

src/features/meta-ads/services/ad-insights.service.ts:
   76                createdAt: { gte: dateStart },
   77:               ticket: {
   78                  tracking: {

  108                  createdAt: { gte: dateStart },
  109:                 ticket: {
  110                    tracking: {

src/features/meta-ads/services/capi.service.ts:
   17    async sendEvent(
   18:     ticketId: string,
   19      eventName: 'LeadSubmitted' | 'Purchase',

   21    ) {
   22:     const ticket = await prisma.deal.findUnique({
   23:       where: { id: ticketId },
   24        select: {

   53  
   54:     if (!ticket?.tracking?.ctwaclid) {
   55:       logger.info(`[CAPI] Skipping ticket ${ticketId}: No CTWA CLID found.`)
   56        return

   59      if (
   60:       !ticket.projectId ||
   61:       !ticket.project ||
   62:       ticket.project.organizationId !== ticket.organizationId
   63      ) {
   64:       logger.warn(`[CAPI] Ticket ${ticketId} has invalid or missing project reference.`)
   65        return

   67  
   68:     // 1. Find the active Pixels for the ticket's project only
   69      const targetPixels = await prisma.metaPixel.findMany({
   70        where: {
   71:         organizationId: ticket.organizationId,
   72:         projectId: ticket.projectId,
   73          isActive: true,

   82        logger.warn(
   83:         `[CAPI] No Pixels found for project ${ticket.projectId} in organization ${ticket.organizationId}.`
   84        )

   88      // 2. Hash User Data
   89:     const phone = ticket.conversation.lead.phone
   90      const hashedPhone = phone ? this.hashData(this.normalizePhone(phone)) : null

  105              event_id: options.eventId,
  106:             event_source_url: ticket.tracking.landingPage || '',
  107              user_data: {
  108:               external_id: [this.hashData(ticket.conversation.lead.id)],
  109                ph: hashedPhone ? [hashedPhone] : [],
  110:               ctwa_clid: ticket.tracking.ctwaclid,
  111              },

  131          await prisma.metaConversionEvent.upsert({
  132:           where: { ticketId_eventName: { ticketId, eventName } }, // NOTE: unique constraint may fail if multiple pixels send same eventName, but it currently overwrites
  133            update: {

  139            create: {
  140:             organizationId: ticket.organizationId,
  141:             ticketId,
  142              eventName,

  145              eventId: options.eventId,
  146:             ctwaclid: ticket.tracking.ctwaclid,
  147:             metaAdId: ticket.tracking.metaAdId,
  148              fbtraceId: response.headers.get('x-fb-trace-id') ?? undefined,

  154          logger.info(
  155:           `[CAPI] Successfully sent ${eventName} to pixel ${pixel.pixelId} for ticket ${ticketId}`
  156          )

  168          await prisma.metaConversionEvent.upsert({
  169:           where: { ticketId_eventName: { ticketId, eventName } },
  170            update: {

  177            create: {
  178:             organizationId: ticket.organizationId,
  179:             ticketId,
  180              eventName,

src/features/meta-ads/services/__tests__/ad-enrichment.service.test.ts:
   3  const prismaMock = vi.hoisted(() => ({
   4:   ticketTracking: {
   5      findUnique: vi.fn(),

  45    it('does nothing when tracking has no meta ad id', async () => {
  46:     prismaMock.ticketTracking.findUnique.mockResolvedValueOnce({
  47        metaAdId: null,
  48        metaEnrichmentStatus: 'PENDING',
  49:       ticket: {
  50:         id: 'ticket-1',
  51          organizationId: 'org-1',

  56  
  57:     await metaAdEnrichmentService.enrichTicket('ticket-1')
  58  
  59      expect(metaAccessTokenServiceMock.getDecryptedToken).not.toHaveBeenCalled()
  60:     expect(prismaMock.ticketTracking.update).not.toHaveBeenCalled()
  61    })

  63    it('stores failed status with message from meta api payload', async () => {
  64:     prismaMock.ticketTracking.findUnique.mockResolvedValueOnce({
  65        metaAdId: 'ad-1',
  66        metaEnrichmentStatus: 'PENDING',
  67:       ticket: {
  68:         id: 'ticket-1',
  69          organizationId: 'org-1',

  91  
  92:     await metaAdEnrichmentService.enrichTicket('ticket-1')
  93  
  94:     expect(prismaMock.ticketTracking.update).toHaveBeenCalledWith({
  95:       where: { ticketId: 'ticket-1' },
  96        data: {

src/features/onboarding/services/metrics/metrics-calculator.ts:
   3    leadsPerDay: string
   4:   avgTicket: string
   5    monthlyRevenue: string

  28  
  29: const AVG_TICKET_MAP: Record<string, number> = {
  30    ate_500: 250,

  64    const leadsPerDay = LEADS_PER_DAY_MAP[inputs.leadsPerDay] || 0
  65:   const avgTicket = AVG_TICKET_MAP[inputs.avgTicket] || 0
  66    const monthlyRevenue = MONTHLY_REVENUE_MAP[inputs.monthlyRevenue] || 0

  70    const leadsPerMonth = leadsPerDay * 30
  71:   const salesPerMonth = avgTicket > 0 ? monthlyRevenue / avgTicket : 0
  72  

  84  
  85:   // Valor do Lead = Ticket * Conversão
  86:   const leadValue = conversionRate !== null ? avgTicket * (conversionRate / 100) : null
  87  

src/features/organizations/schemas/organization-schemas.ts:
  49      telefone: z.string().nullable().optional(),
  50:     avgTicket: z.string().nullable().optional(),
  51      attendantsCount: z.string().nullable().optional(),

src/features/organizations/services/organization-management.service.ts:
  350    let metrics = {}
  351:   if (body.leadsPerDay && body.avgTicket && body.monthlyRevenue && body.attendantsCount) {
  352      metrics = calculateMetrics({
  353        leadsPerDay: body.leadsPerDay,
  354:       avgTicket: body.avgTicket,
  355        monthlyRevenue: body.monthlyRevenue,

  382          cpf: body.cpf || null,
  383:         avgTicket: body.avgTicket || null,
  384          attendantsCount: body.attendantsCount || null,

  398          cpf: body.cpf || null,
  399:         avgTicket: body.avgTicket || null,
  400          attendantsCount: body.attendantsCount || null,

src/features/projects/components/project-detail.tsx:
   8    Target,
   9:   Ticket,
  10  } from 'lucide-react'

  94          <SummaryCard
  95:           title='Tickets'
  96:           value={project.counts.ticketCount}
  97:           description='Tickets e conversas comerciais.'
  98:           icon={Ticket}
  99          />

src/features/projects/components/project-list.tsx:
  118              <span className='mx-2'>·</span>
  119:             <span>{project.counts.ticketCount} tickets</span>
  120              <span className='mx-2'>·</span>

src/features/projects/schemas/project.schemas.ts:
  49    leadCount: z.number().int().min(0),
  50:   ticketCount: z.number().int().min(0),
  51    saleCount: z.number().int().min(0),

src/features/projects/services/project.service.ts:
   31      leads: number
   32:     tickets: number
   33      sales: number

   73      leadCount: input.leads,
   74:     ticketCount: input.tickets,
   75      saleCount: input.sales,

  134              leads: true,
  135:             tickets: true,
  136              sales: true,

  188            leads: true,
  189:           tickets: true,
  190            sales: true,

  251            leads: true,
  252:           tickets: true,
  253            sales: true,

  283  
  284:   const projectTickets = await prisma.deal.findMany({
  285      where: {

  293  
  294:   const conversionCount = projectTickets.length
  295      ? await prisma.metaConversionEvent.count({

  298            success: true,
  299:           ticketId: {
  300:             in: projectTickets.map((ticket) => ticket.id),
  301            },

  361            leads: true,
  362:           tickets: true,
  363            sales: true,

  392            leads: true,
  393:           tickets: true,
  394            sales: true,

src/features/projects/services/__tests__/project.service.test.ts:
   23    },
   24:   ticket: {
   25      updateMany: vi.fn(),

   71            leads: 12,
   72:           tickets: 4,
   73            sales: 3,

  110          leadCount: 12,
  111:         ticketCount: 4,
  112          saleCount: 3,

  132          leads: 0,
  133:         tickets: 0,
  134          sales: 0,

  169          leads: 0,
  170:         tickets: 0,
  171          sales: 0,

  191          leadCount: 0,
  192:         ticketCount: 0,
  193          saleCount: 0,

  208          leads: 2,
  209:         tickets: 1,
  210          sales: 1,

src/features/sales/components/sales-list.tsx:
   7  
   8: // Inline type definition (previously from @/schemas/lead-tickets)
   9  type LeadSale = {

  20    }>
  21:   ticket?: {
  22      stage?: { name: string } | null

  83  
  84:               {sale.ticket && (
  85                  <div className='mt-3 flex flex-wrap gap-2 text-xs'>
  86:                   {renderTag('Estágio', sale.ticket.stage?.name || 'Sem Estágio')}
  87:                   {renderTag('Origem', sale.ticket.utmSource)}
  88:                   {renderTag('Meio', sale.ticket.utmMedium)}
  89:                   {renderTag('Campanha', sale.ticket.utmCampaign)}
  90                    <span className='inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/10 px-2 py-1'>

  92                      <span className='font-medium text-foreground text-xs'>
  93:                       {formatDateTime(sale.ticket.createdAt)}
  94                      </span>

src/features/sales/repositories/shared.ts:
  28    statusChangedAt: true,
  29:   ticketId: true,
  30    createdAt: true,

src/features/sales/repositories/sync-completed-sale-for-deal.repository.ts:
   8      organizationId: string
   9:     ticketId: string
  10      totalAmount: number

  17        organizationId: input.organizationId,
  18:       ticketId: input.ticketId,
  19      },

  41        organizationId: input.organizationId,
  42:       ticketId: input.ticketId,
  43        ...saleData,

src/features/sales/services/sync-completed-sale-for-deal.service.ts:
  10      organizationId: string
  11:     ticketId: string
  12      totalAmount: number

src/features/settings/components/pipeline-settings.tsx:
  18          title='Pipeline'
  19:         description='Gerencie as fases do seu funil de tickets'
  20          icon={Kanban}

src/features/whatsapp/components/inbox/chat-list.tsx:
   77  
   78:               const _statusBadge = chat.currentTicket && statusBadgeMap[chat.currentTicket.status]
   79  

  115                      <div className='mb-1 flex h-4 flex-wrap items-center gap-1.5 overflow-hidden'>
  116:                       {chat.currentTicket?.stage && (
  117                          <div
  118                            className='rounded px-1.5 py-0.5 font-medium/90 text-[9px] text-white tracking-wide'
  119:                           style={{ backgroundColor: chat.currentTicket.stage.color }}
  120                          >
  121:                           {chat.currentTicket.stage.name}
  122                          </div>
  123                        )}
  124:                       {chat.currentTicket?.tracking &&
  125:                         chat.currentTicket.tracking.sourceType === 'paid' && (
  126                            <Badge

src/features/whatsapp/components/inbox/deal-panel.tsx:
   41  
   42: interface TicketResponse {
   43    id: string

   80    leadInsights: {
   81:     totalTickets: number
   82      lifetimeValue: string

  100    const { data, isLoading, error } = useQuery({
  101:     queryKey: ['conversation-ticket', conversationId, organizationId, projectId],
  102      queryFn: async () => {
  103        try {
  104:         const data = await apiFetch(`/api/v1/conversations/${conversationId}/ticket`, {
  105            orgId: organizationId,

  107          })
  108:         return data as TicketResponse
  109        } catch (err) {

  117  
  118:   const ticket = data
  119  
  120    const { data: stagesData } = useQuery({
  121:     queryKey: ['ticket-stages', organizationId, projectId],
  122      queryFn: async () => {

  133  
  134:   const [optimisticTicket, addOptimisticTicket] = React.useOptimistic(
  135:     ticket,
  136      (state, newStageId: string) => {

  147      try {
  148:       if (!ticket) return
  149:       addOptimisticTicket(newStageId)
  150  
  151        const result = await updateDealStageAction({
  152:         ticketId: ticket.id,
  153          stageId: newStageId,

  158          toast.success('Etapa atualizada!')
  159:         queryClient.invalidateQueries({ queryKey: ['conversation-ticket', conversationId] })
  160        }
  161      } catch {
  162:       toast.error('Erro ao mover ticket')
  163      }

  183    const getWindowStatus = () => {
  184:     if (!optimisticTicket?.windowExpiresAt) return null
  185:     const expiresAt = new Date(optimisticTicket.windowExpiresAt)
  186      const timeRemaining = calculateTimeRemaining(expiresAt)

  224  
  225:   if (error || !ticket) {
  226      return (

  238  
  239:   const _statusBadge = STATUS_BADGE_MAP[optimisticTicket?.status || 'open']
  240    const _windowStatus = getWindowStatus()

  265            {/* Destaque: Tráfego Pago (Aha! Moment UX) */}
  266:           {optimisticTicket?.tracking?.sourceType === 'paid' && (
  267              <div className='relative overflow-hidden rounded-xl border border-[#c13584]/20 bg-gradient-to-br from-[#c13584]/10 to-[#833ab4]/5 p-4'>

  277                  </div>
  278:                 {optimisticTicket.tracking?.utmCampaign && (
  279                    <p className='mb-1 font-semibold text-foreground text-sm'>
  280:                     Campanha: {optimisticTicket.tracking.utmCampaign}
  281                    </p>
  282                  )}
  283:                 {optimisticTicket.tracking?.ctwaclid && (
  284                    <p
  285                      className='max-w-[200px] truncate font-mono text-[10px] text-muted-foreground/80'
  286:                     title={optimisticTicket.tracking.ctwaclid}
  287                    >
  288:                     ID: {optimisticTicket.tracking.ctwaclid}
  289                    </p>

  305                  <Select
  306:                   value={optimisticTicket?.stage?.id || ''}
  307                    onValueChange={handleUpdateStage}

  310                      <SelectValue>
  311:                       {optimisticTicket?.stage ? (
  312                          <div className='flex items-center gap-2'>

  314                              className='h-2 w-2 rounded-full'
  315:                             style={{ backgroundColor: optimisticTicket.stage.color }}
  316                            />
  317:                           <span className='font-medium text-sm'>{optimisticTicket.stage.name}</span>
  318                          </div>

  347                    <span className='text-foreground/90 text-sm'>
  348:                     {optimisticTicket?.assignee?.name || 'Não atribuído'}
  349                    </span>

  360                    <span className='font-semibold text-foreground/90 text-sm'>
  361:                     {formatDealValue(optimisticTicket?.dealValue)}
  362                    </span>

  368            {/* Dossiê & KPIs do Atendimento */}
  369:           {optimisticTicket?.kpis && (
  370              <div className='pt-2'>

  388                        <ArrowUpRight className='h-3 w-3' />{' '}
  389:                       {optimisticTicket.kpis.outboundMessagesCount}
  390                      </span>

  396                        <ArrowDownRight className='h-3 w-3' />{' '}
  397:                       {optimisticTicket.kpis.inboundMessagesCount}
  398                      </span>

  410                    <span className='font-bold text-foreground text-sm'>
  411:                     {formatTimer(optimisticTicket.kpis.firstResponseTimeSec)}
  412                    </span>

  423                    <span className='font-bold text-foreground text-sm'>
  424:                     {formatTimer(optimisticTicket.kpis.resolutionTimeSec)}
  425                    </span>

  431            {/* Histórico do Lead / LTV */}
  432:           {optimisticTicket?.leadInsights && (
  433              <div className='pt-2'>

  445                    <span className='font-bold text-xs'>
  446:                     {optimisticTicket.leadInsights.totalTickets} tickets
  447                    </span>

  456                    <span className='font-bold text-emerald-600 text-sm'>
  457:                     {formatDealValue(optimisticTicket.leadInsights.lifetimeValue)}
  458                    </span>

src/features/whatsapp/components/inbox/types.ts:
  14  
  15: export interface TicketStage {
  16    id: string

  20  
  21: export interface TicketTracking {
  22    sourceType: string

  26  
  27: export interface TicketInfo {
  28    id: string
  29    status: 'open' | 'closed_won' | 'closed_lost'
  30:   stage: TicketStage
  31:   tracking?: TicketTracking | null
  32  }

  41    unreadCount?: number
  42:   currentTicket?: TicketInfo
  43  }

src/features/whatsapp/hooks/use-realtime.ts:
  74  
  75:       const ticketsSub = subscribeTo(centrifuge, `org:${organizationId}:tickets`, (data) => {
  76          if (data.conversationId) {
  77            queryClient.invalidateQueries({
  78:             queryKey: ['conversation-ticket', data.conversationId, organizationId],
  79            })

  87          messagesSub.unsubscribe()
  88:         ticketsSub.unsubscribe()
  89          centrifuge.disconnect()

src/features/whatsapp/lib/queries/lead-segment-query.ts:
  18  
  19:     // Filter by Ticket Stage and Time in Stage
  20      ...(filters.stageId ||

  22      filters.stageTimeMaxDays !== undefined ||
  23:     filters.hasActiveTicket ||
  24      filters.sourceType

  27              some: {
  28:               tickets: {
  29                  some: {

  63  
  64:   // Note: The reason for the nested query above is because Ticket is related to instance,
  65    // and Lead has conversation with Instance.
  66:   // Let's verify relation: Lead -> Conversation -> WhatsConfig -> Ticket?
  67:   // Wait, Ticket belongs to Lead and Conversation directly in my schema!
  68:   // Let's check Ticket model.
  69    return prisma.lead.findMany({

src/features/whatsapp/lib/schemas/audience.ts:
  39    sourceType: z.string().optional(),
  40:   hasActiveTicket: z.boolean().optional(),
  41    createdAtGte: z.string().datetime().optional().nullable(),

src/features/whatsapp/services/add-campaign-audience.service.ts:
  61    if (crmFilters?.stageId) {
  62:     leadFilters.conversations = { some: { tickets: { some: { stageId: crmFilters.stageId } } } }
  63    }

src/features/whatsapp/services/whatsapp-chat-query.service.ts:
   50            id: true,
   51:           tickets: {
   52              where: {

   98      const conversation = lead.conversations[0]
   99:     const currentTicket = conversation?.tickets[0]
  100  

  108        unreadCount: 0,
  109:       currentTicket: currentTicket
  110          ? {
  111:             id: currentTicket.id,
  112:             status: currentTicket.status.name,
  113:             stage: currentTicket.stage,
  114:             tracking: currentTicket.tracking,
  115            }

src/features/whatsapp/services/whatsapp-chat.service.ts:
   83          lookupCache.getMessageDirectionId('INBOUND'),
   84:         lookupCache.getTicketStatusId('open'),
   85        ])

  128  
  129:       let ticket = await prisma.deal.findFirst({
  130          where: { conversationId: conversation.id, statusId: openStatusId },

  136        const messageTimestamp = new Date(parseInt(timestamp, 10) * 1000)
  137:       if (!ticket) {
  138:         ticket = await prisma.deal.create({
  139            data: {

  154          await prisma.deal.update({
  155:           where: { id: ticket.id },
  156            data: {

  223            appConversationId: conversation.id,
  224:           ticketId: ticket.id,
  225            directionId,

  239        await prisma.deal.update({
  240:         where: { id: ticket.id },
  241          data: { messagesCount: { increment: 1 } },

  284          lookupCache.getMessageDirectionId('OUTBOUND'),
  285:         lookupCache.getTicketStatusId('open'),
  286        ])

  328  
  329:       let ticket = await prisma.deal.findFirst({
  330          where: { conversationId: conversation.id, statusId: openStatusId },

  334        const defaultStage = await getDefaultDealStage(prisma, instance.organizationId)
  335:       if (!ticket) {
  336:         ticket = await prisma.deal.create({
  337            data: {

  363            appConversationId: conversation.id,
  364:           ticketId: ticket.id,
  365            directionId,

  378        await prisma.deal.update({
  379:         where: { id: ticket.id },
  380          data: { messagesCount: { increment: 1 } },

  468          lookupCache.getMessageDirectionId('OUTBOUND'),
  469:         lookupCache.getTicketStatusId('open'),
  470        ])

  523  
  524:       // 3. Ensure Ticket
  525:       let ticket = await prisma.deal.findFirst({
  526          where: { conversationId: conversation.id, statusId: openStatusId },

  531  
  532:       if (!ticket) {
  533:         ticket = await prisma.deal.create({
  534            data: {

  555            appConversationId: conversation.id,
  556:           ticketId: ticket.id,
  557            campaignRecipientId: undefined,

  571        await prisma.deal.update({
  572:         where: { id: ticket.id },
  573          data: { messagesCount: { increment: 1 } },

src/features/whatsapp/services/handlers/history.handler.ts:
   12   * - Creates Messages with source='history'
   13:  * - ❌ NEVER creates Tickets
   14   * - Idempotency via wamid

  202                appConversationId: conversation.id,
  203:               ticketId: null,
  204                directionId,

src/features/whatsapp/services/handlers/message.handler.ts:
  116              select: {
  117:               ticketExpirationDays: true,
  118              },

  134    const expirationDays =
  135:     config.organization.profile?.ticketExpirationDays || DEFAULT_EXPIRATION_DAYS
  136  

  240  
  241:         // 3. Ticket Management (Expiry & Last-Touch)
  242:         const openStatusId = await lookupCache.getTicketStatusId('open')
  243:         const closedStatusId = await lookupCache.getTicketStatusId('closed')
  244  
  245:         let ticket = await tx.ticket.findFirst({
  246            where: { conversationId: conversation.id, statusId: openStatusId },

  251          // Check Expiration
  252:         if (ticket) {
  253            const daysSinceCreation =
  254:             (messageTimestamp.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  255  
  256            // Only expire if it's an INBOUND message that would restart the conversation flow
  257:           // If it's just an echo, we usually keep the ticket open unless specific rules apply
  258            if (!isEcho && daysSinceCreation > expirationDays) {
  259              logger.info(
  260:               `[MessageHandler] Ticket ${ticket.id} expired (${daysSinceCreation.toFixed(1)} days). Closing.`
  261              )
  262  
  263:             await tx.ticket.update({
  264:               where: { id: ticket.id },
  265                data: {

  271              })
  272:             ticket = null // Force create new ticket
  273            }

  275  
  276:         const _isNewTicket = !ticket
  277          const windowExpiresAt = wasHistoryLead

  280  
  281:         if (!ticket) {
  282:           ticket = await tx.ticket.create({
  283              data: {

  300            if (!isEcho) {
  301:             await tx.ticket.update({
  302:               where: { id: ticket.id },
  303                data: {

  349              appConversationId: conversation.id,
  350:             ticketId: ticket.id,
  351              directionId,

  364            // Inbound Message (Client -> Clinic)
  365:           await tx.ticket.update({
  366:             where: { id: ticket.id },
  367              data: {

  391            // Outbound Message (Clinic -> Client)
  392:           const ticketUpdateData: any = {
  393              messagesCount: { increment: 1 },

  397  
  398:           if (ticket.firstResponseTimeSec === null) {
  399              const responseTime = Math.floor(
  400:               (messageTimestamp.getTime() - ticket.createdAt.getTime()) / 1000
  401              )
  402:             ticketUpdateData.firstResponseTimeSec = responseTime
  403            }
  404  
  405:           await tx.ticket.update({
  406:             where: { id: ticket.id },
  407:             data: ticketUpdateData,
  408            })

  447            if (trackingData) {
  448:             const existingTracking = await tx.ticketTracking.findUnique({
  449:               where: { ticketId: ticket.id },
  450              })

  453                // New Tracking
  454:               await tx.ticketTracking.create({
  455                  data: {
  456:                   ticketId: ticket.id,
  457                    ...trackingData,

  465                  metaAdEnrichmentService
  466:                   .enrichTicket(ticket.id)
  467                    .catch((err) =>

  469                        { err },
  470:                       `[Enrichment] Fire-and-forget failed for ticket ${ticket.id}`
  471                      )

  482                    data: {
  483:                     ticketId: ticket.id,
  484                      oldAdId: existingTracking.metaAdId,

  490                // Update fields
  491:               await tx.ticketTracking.update({
  492:                 where: { ticketId: ticket.id },
  493                  data: {

  504                  metaAdEnrichmentService
  505:                   .enrichTicket(ticket.id)
  506                    .catch((err) =>

  508                        { err },
  509:                       `[Enrichment] Update enrichment failed for ticket ${ticket.id}`
  510                      )

src/features/whatsapp/services/handlers/state-sync.handler.ts:
  11   * - Creates/updates Leads with source='state_sync'
  12:  * - ❌ NEVER creates Tickets
  13   * - Handles contact add/update/delete actions

src/lib/README.md:
  16  | `centrifugo/` | Clientes de integração para comunicação Real-time (Websockets). |
  17: | `constants/` | Enums e valores constantes compartilhados (ex: Status de Tickets). |
  18  | `date/` | Helpers para manipulação de datas e fusos horários (baseado em `date-fns`). |

src/lib/db/cache-keys.ts:
  20    ai: {
  21:     // Key per ticket — presence means "scheduled for analysis, expires at trigger time"
  22      // SETEX resets the timer on every new message (debounce effect)
  23:     classifierPending: (ticketId: string) => `ai:classifier:pending:${ticketId}`,
  24    },

src/lib/db/lookup-cache.ts:
   3  /**
   4:  * In-memory cache para lookup tables (LeadSource, TicketStatus, MessageDirection).
   5   * Evita N queries repetidas no handler.

   9    private leadSources: Map<string, string> = new Map()
  10:   private ticketStatuses: Map<string, string> = new Map()
  11    private messageDirections: Map<string, string> = new Map()

  22  
  23:   async getTicketStatusId(name: string): Promise<string> {
  24:     if (this.ticketStatuses.has(name)) {
  25:       return this.ticketStatuses.get(name)!
  26      }
  27      const status = await prisma.dealStatus.findUnique({ where: { name } })
  28:     if (!status) throw new Error(`TicketStatus "${name}" not found in database`)
  29:     this.ticketStatuses.set(name, status.id)
  30      return status.id

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
