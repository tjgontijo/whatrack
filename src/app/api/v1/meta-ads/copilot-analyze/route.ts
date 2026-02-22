import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { metaAccessTokenService } from '@/services/meta-ads/access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';

const SYSTEM_PROMPT = `Você é um especialista sênior em tráfego pago com foco em Meta Ads (Facebook e Instagram).
Sua única função é analisar dados de performance de campanhas e fornecer diagnósticos precisos.

REGRAS:
- Responda APENAS sobre tráfego pago e Meta Ads. Recuse qualquer outro assunto.
- Baseie TODOS os diagnósticos nos dados fornecidos (orçamento diário, gastos, cliques, CPA, ROI/ROAS, funil). Nunca invente métricas.
- Priorize gargalos com maior impacto financeiro.
- Use linguagem direta e técnica, adequada para um gestor de tráfego experiente.
- Planos de ação devem ser específicos e implementáveis imediatamente.

CONTEXTO DE ANÁLISE:
Você receberá um payload JSON com o histórico diário da campanha (spend, impressions, clicks, cpc, cpm, lpv, cpv, ic, cpaIc, purchases, cpa, revenue, roas) dos últimos dias. Diferencie entre fuga de clique -> LPV, LPV -> IC, ou IC -> Compra. Identifique tendências, padrões de fadiga e ineficiências.`;

const analysisMapZodSchema = z.object({
    status: z.enum(["CRITICAL", "WARNING", "HEALTHY"]).describe("Diagnóstico geral da campanha."),
    summary: z.string().describe("Resumo executivo em 2-3 frases sobre a saúde geral da campanha."),
    bottlenecks: z.array(z.object({
        type: z.string().describe("Ex: 'Fadiga de Criativo', 'Fuga LPV→IC'"),
        severity: z.enum(["high", "medium", "low"]),
        description: z.string().describe("Diagnóstico detalhado em 1-2 frases. Inclua a métrica evidenciadora inline, ex: 'CTR caiu de 1.2% para 0.4% nos últimos 3 dias'"),
    })),
    actionPlan: z.array(z.object({
        priority: z.number().int().min(1),
        action: z.string().describe("Ação prática e específica"),
        rationale: z.string().describe("Por que essa ação resolve o gargalo identificado"),
        effort: z.enum(["low", "medium", "high"]).describe("Esforço de implementação"),
    })),
});

export async function POST(req: Request) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { organizationId, campaignId, accountId, campaignName, days = 7 } = body;

        if (!organizationId || !campaignId || !accountId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Token
        const account = await prisma.metaAdAccount.findFirst({
            where: { organizationId, adAccountId: accountId },
        });

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const token = await metaAccessTokenService.getDecryptedToken(account.connectionId);

        // 2. Fetch Time Range Data
        const dateStart = new Date();
        dateStart.setDate(dateStart.getDate() - (days - 1));
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = new Date().toISOString().split('T')[0];

        const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${campaignId}/insights`, {
            params: {
                access_token: token,
                time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
                time_increment: 1, // Break down by day!
                fields: 'spend,impressions,clicks,inline_link_clicks,reach,actions,action_values'
            }
        });

        const rawData = response.data.data || [];

        // 3. Transform Data to clean JSON array for the LLM
        const timeline = rawData.map((dayData: any) => {
            const actions = dayData.actions || [];
            const actionValues = dayData.action_values || [];

            const getActionVal = (list: any[], type: string) => {
                let item = list.find((a: any) => a.action_type === type);
                if (!item) item = list.find((a: any) => a.action_type === `offsite_conversion.fb_pixel_${type}`);
                return item ? Number(item.value) : 0;
            };

            const spend = Number(dayData.spend || 0);
            const clicks = Number(dayData.inline_link_clicks || dayData.clicks || 0);

            const purchases = getActionVal(actions, 'purchase');
            const rev = getActionVal(actionValues, 'purchase');
            const ic = getActionVal(actions, 'initiate_checkout');
            const lpv = getActionVal(actions, 'landing_page_view');

            return {
                date: dayData.date_start,
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
            };
        });

        // 4. Instantiate Mastra Agent
        const mastraAgent = new Agent({
            name: 'Meta Ads Copilot',
            id: 'meta-ads-copilot',
            instructions: SYSTEM_PROMPT,
            model: openai('gpt-4o'), // High intelligence
        });

        const prompt = `Analise a campanha "${campaignName}" com base no seguinte histórico dos últimos ${days} dias (ordenados do mais antigo para o mais recente):
        
${JSON.stringify(timeline, null, 2)}

Produza a análise solicitada.`;

        // 5. Generate Insight
        const result = (await mastraAgent.generate(
            prompt,
            { structuredOutput: { schema: analysisMapZodSchema } }
        )) as any;

        const aiOutput = result.object;

        return NextResponse.json({
            success: true,
            timeline,
            analysis: aiOutput
        });

    } catch (error: any) {
        const detail = error?.response?.data || error?.message || String(error)
        console.error('[Copilot] ❌ Analysis Error:', JSON.stringify(detail, null, 2))
        console.error('[Copilot] Stack:', error?.stack)
        return NextResponse.json({
            error: 'Internal server error analyzing campaign',
            detail: process.env.NODE_ENV === 'development' ? detail : undefined
        }, { status: 500 });
    }
}
