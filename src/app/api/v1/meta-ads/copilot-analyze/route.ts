import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { Agent } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { metaAccessTokenService } from '@/services/meta-ads/access-token.service'
import axios from 'axios'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[copilot-analyze] ${name} environment variable is required`)
  return value
}

const SYSTEM_PROMPT = `Você é um Analista de BI e Performance sênior especializado em Meta Ads.
Sua única função é analisar dados de campanhas e fornecer diagnósticos profundos e analíticos.

REGRAS ESTRITAS:
1. FOCO NO DIAGNÓSTICO: Priorize a identificação clara de tendências, sazonalidade e eficiência.
2. CONTEXTO MACRO: Atente-se aos dias da semana informados na timeline e relacione com eventos, feriados ou comportamentos de 'final de semana' vs 'dias úteis'. Use a sua base de dados externa se o período coincidir com feriados nacionais do Brasil (como Carnaval, feriados prolongados, etc).
3. ESTRUTURA DA CAMPANHA: Note quais conjuntos de anúncio (AdSets) e criativos (Ads) estão puxando o resultado para cima ou para baixo (você receberá os maiores gastadores).
4. LINGUAGEM DE BI: Use jargões corretos e foque na correlação dos dados reais.
5. RECOMENDAÇÕES: Formule planos de ação embasados no contexto temporal e estrutural.`

const analysisMapZodSchema = z.object({
  status: z
    .enum(['CRITICAL', 'WARNING', 'HEALTHY'])
    .describe('Diagnóstico geral de saúde sistêmica da campanha.'),
  executiveSummary: z
    .string()
    .describe(
      'Resumo analítico direto ao ponto sobre o comportamento da campanha. Mencione os dias de semana, sazonalidade ou ofensores/highlights se eles ditaram o resultado.'
    ),
  deepDiagnostics: z
    .array(
      z.object({
        area: z
          .string()
          .describe(
            "Ex: 'Fuga de Etapa (LPV -> IC)', 'Alta performance aos finais de semana', 'Criativo vencedor', 'Criativo X puxando o CPA'"
          ),
        severity: z.enum(['high', 'medium', 'low']),
        observation: z
          .string()
          .describe(
            "Leitura do dado factual. Ex: 'O Criativo A gastou 60% do orçamento gerando 1 compra', 'O ROAS triplicou no sábado'."
          ),
        rootCause: z
          .string()
          .describe(
            'Sua hipótese como BI sobre o cenário, contextualizando com os dados de conjunto/criativo ou calendário macro caso faça sentido.'
          ),
      })
    )
    .describe('Diagnóstico puro e profundo. Liste os de alta severidade primeiro.'),
  keyRecommendations: z
    .array(
      z.object({
        priority: z.number().int(),
        action: z
          .string()
          .describe(
            'Ação focada em investimento, realocação de verba, testes/pausas de criativo/conjunto, etc.'
          ),
      })
    )
    .max(4)
    .describe('Apenas 1 a 4 recomendações vitais e baseadas nos diagnósticos.'),
})

export async function POST(req: Request) {
  try {
    const access = await validatePermissionAccess(req, 'manage:ai')
    if (!access.hasAccess || !access.teamId) {
      return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { teamId, organizationId, campaignId, accountId, campaignName, days = 7 } = body

    const scopedTeamId = teamId ?? organizationId ?? access.teamId

    if (!scopedTeamId || !campaignId || !accountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (scopedTeamId !== access.teamId) {
      return NextResponse.json({ error: 'Forbidden for requested team' }, { status: 403 })
    }

    // 1. Fetch Token
    const account = await prisma.metaAdAccount.findFirst({
      where: { organizationId: access.teamId, adAccountId: accountId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const token = await metaAccessTokenService.getDecryptedToken(account.connectionId)

    // 2. Fetch Time Range Data concurrent requests
    const dateStart = new Date()
    dateStart.setDate(dateStart.getDate() - (days - 1))
    const dateStartStr = dateStart.toISOString().split('T')[0]
    const dateEndStr = new Date().toISOString().split('T')[0]

    const commonParams = {
      access_token: token,
      time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
      fields: 'spend,impressions,clicks,inline_link_clicks,reach,actions,action_values',
    }

    const [campaignDailyRes, adsetsRes, adsRes] = await Promise.all([
      axios
        .get(
          `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${campaignId}/insights`,
          {
            params: { ...commonParams, time_increment: 1 },
          }
        )
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(
          `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${campaignId}/insights`,
          {
            params: {
              ...commonParams,
              level: 'adset',
              fields: commonParams.fields + ',adset_name',
            },
          }
        )
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(
          `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${campaignId}/insights`,
          {
            params: { ...commonParams, level: 'ad', fields: commonParams.fields + ',ad_name' },
          }
        )
        .catch(() => ({ data: { data: [] } })),
    ])

    const rawData = campaignDailyRes.data.data || []
    const rawAdsets = adsetsRes.data.data || []
    const rawAds = adsRes.data.data || []

    // 3. Transform Data maps
    const getActionVal = (list: any[], type: string) => {
      let item = list.find((a: any) => a.action_type === type)
      if (!item)
        item = list.find((a: any) => a.action_type === `offsite_conversion.fb_pixel_${type}`)
      return item ? Number(item.value) : 0
    }

    const timeline = rawData.map((dayData: any) => {
      const actions = dayData.actions || []
      const actionValues = dayData.action_values || []
      const spend = Number(dayData.spend || 0)
      const clicks = Number(dayData.inline_link_clicks || dayData.clicks || 0)
      const purchases = getActionVal(actions, 'purchase')
      const rev = getActionVal(actionValues, 'purchase')
      const ic = getActionVal(actions, 'initiate_checkout')
      const lpv = getActionVal(actions, 'landing_page_view')

      // Format weekday
      const dateObj = new Date(dayData.date_start + 'T12:00:00Z')
      const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })

      return {
        date: dayData.date_start,
        dayOfWeek,
        spend,
        impressions: Number(dayData.impressions || 0),
        clicks,
        cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
        lpv,
        cpv: lpv > 0 ? Number((spend / lpv).toFixed(2)) : 0,
        ic,
        cpaIc: ic > 0 ? Number((spend / ic).toFixed(2)) : 0,
        purchases,
        cpa: purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0,
        revenue: rev,
        roas: spend > 0 ? Number((rev / spend).toFixed(2)) : 0,
      }
    })

    const mapAggregates = (data: any[], nameField: string) => {
      return data
        .map((item) => {
          const actions = item.actions || []
          const actionValues = item.action_values || []
          const spend = Number(item.spend || 0)
          const purchases = getActionVal(actions, 'purchase')
          const rev = getActionVal(actionValues, 'purchase')
          return {
            name: item[nameField] || 'Desconhecido',
            spend,
            purchases,
            cpa: purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0,
            roas: spend > 0 ? Number((rev / spend).toFixed(2)) : 0,
            clicks: Number(item.inline_link_clicks || item.clicks || 0),
          }
        })
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5) // Limit TOP 5 objects
    }

    const topAdsets = mapAggregates(rawAdsets, 'adset_name')
    const topAds = mapAggregates(rawAds, 'ad_name')

    // Validation 4: At least 7 days with active spend
    const activeDays = timeline.filter((day: any) => day.spend > 0)
    if (activeDays.length < 7) {
      return NextResponse.json(
        {
          error: 'Campanha muito recente para análise estatística segura',
          detail: `A campanha possui apenas ${activeDays.length} dias ativos com gasto (sendo necessários pelo menos 7). Deixe-a performar mais tempo ou estenda o limite de dias global da análise.`,
        },
        { status: 400 }
      )
    }

    // 5. Instantiate Mastra Agent
    const mastraAgent = new Agent({
      name: 'Meta Ads Copilot',
      id: 'meta-ads-copilot',
      instructions: SYSTEM_PROMPT,
      model: openai('gpt-4o'), // High intelligence
    })

    const prompt = `Analise a campanha "${campaignName}" com base nestes dados dos últimos ${days} dias:
        
TIMELINE (Diário):
${JSON.stringify(timeline, null, 2)}

TOP 5 CONJUNTOS DE ANÚNCIO (AGREGADO NO PERÍODO):
${JSON.stringify(topAdsets, null, 2)}

TOP 5 CRIATIVOS/ANÚNCIOS (AGREGADO NO PERÍODO):
${JSON.stringify(topAds, null, 2)}

Produza a análise solicitada avaliando também performance de dias da semana e os maiores gastadores acima.`

    // 5. Generate Insight
    const result = (await mastraAgent.generate(prompt, {
      structuredOutput: { schema: analysisMapZodSchema },
    })) as any

    const aiOutput = result.object

    return NextResponse.json({
      success: true,
      timeline,
      analysis: aiOutput,
    })
  } catch (error: any) {
    const detail = error?.response?.data || error?.message || String(error)
    console.error('[Copilot] ❌ Analysis Error:', JSON.stringify(detail, null, 2))
    console.error('[Copilot] Stack:', error?.stack)
    return NextResponse.json(
      {
        error: 'Internal server error analyzing campaign',
        detail: process.env.NODE_ENV === 'development' ? detail : undefined,
      },
      { status: 500 }
    )
  }
}
