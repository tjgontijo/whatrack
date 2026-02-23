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

const SYSTEM_PROMPT = `Você é um Analista de BI e Performance sênior especializado em Meta Ads.
Sua única função é analisar séries temporais de dados de campanhas e fornecer diagnósticos profundos e analíticos.

REGRAS ESTritas:
1. FOCO NO DIAGNÓSTICO: Priorize a identificação clara de tendências, picos e quebras estruturais usando dados precisos.
2. ESCOPO DA CAMPANHA: NÃO faça "drill-down" sugerindo otimizações a nível de criativos específicos ou de conjuntos de anúncios, visto que você só está vendo dados agrupados (macro) da campanha.
3. CAUSA RAIZ: Foque em eficiência do funil da página, fadiga estrutural, oscilação de CPM/leilão ou estrangulamento de CPA.
4. LINGUAGEM DE BI: Use jargões corretos, foque nos dados e evite recomendações genéricas de "guru de marketing".
5. RECOMENDAÇÕES ENXUTAS: Forneça poucas ações (focadas em orçamento, lances ou pausas/escalas macro).

CONTEXTO DE ANÁLISE:
Você receberá o histórico de resultados diários. Correlacione o volume gasto com CPA e trace onde o funil está quebrando (Cliques -> LPV -> IC -> Compra).`;

const analysisMapZodSchema = z.object({
    status: z.enum(["CRITICAL", "WARNING", "HEALTHY"]).describe("Diagnóstico geral de saúde sistêmica da campanha."),
    executiveSummary: z.string().describe("Resumo analítico direto ao ponto sobre o comportamento da campanha no período avaliado."),
    deepDiagnostics: z.array(z.object({
        area: z.string().describe("Ex: 'Fuga de Etapa (LPV -> IC)', 'CPA em Degradação', 'Instabilidade de Leilão'"),
        severity: z.enum(["high", "medium", "low"]),
        observation: z.string().describe("Leitura do dado factual. Ex: 'O CPA médio pulou de R$20 nos primeiros dias para R$45 nos últimos 3 dias.'"),
        rootCause: z.string().describe("A causa macro-estrutural embasada pela observação. Como você não vê os criativos, foque na fadiga agregada ou queda de eficiência sazonal/página."),
    })).describe("Diagnóstico puro e profundo. Liste os de alta severidade primeiro."),
    keyRecommendations: z.array(z.object({
        priority: z.number().int(),
        action: z.string().describe("Ação focada em investimento, ajuste de funil externo (LP) ou alteração macro de estrutura.")
    })).max(3).describe("Apenas 1 a 3 recomendações vitais e baseadas nos diagnósticos."),
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

        // Validation 4: At least 7 days with active spend
        const activeDays = timeline.filter((day: any) => day.spend > 0);
        if (activeDays.length < 7) {
            return NextResponse.json({
                error: 'Campanha muito recente para análise estatística segura',
                detail: `A campanha possui apenas ${activeDays.length} dias ativos com gasto (sendo necessários pelo menos 7). Deixe-a performar mais tempo ou estenda o limite de dias global da análise.`
            }, { status: 400 });
        }

        // 5. Instantiate Mastra Agent
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
