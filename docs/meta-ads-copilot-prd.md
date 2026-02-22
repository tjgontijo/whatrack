# PRD: Copiloto Especialista em Meta Ads
**Versão:** 1.1
**Status:** Em Desenvolvimento
**Data:** 2026-02-22

---

## 1. Visão Geral

### Problema
Gestores de tráfego que utilizam o painel de campanhas do WhaTrack visualizam métricas detalhadas (gasto, CPM, CTR, CPA, ROAS, funil LPV→IC→Compras), mas precisam interpretar esses dados manualmente para identificar gargalos e tomar decisões de otimização. Esse processo é lento, exige expertise e está sujeito a vieses cognitivos.

### Solução
Um Copiloto especialista em Meta Ads integrado diretamente ao painel de campanhas. O usuário seleciona uma campanha e, com um clique, recebe uma análise estruturada gerada por um agente de IA com conhecimento profundo de tráfego pago — identificando tendências, gargalos no funil, sinais de fadiga de criativo e um plano de ação priorizado.

### Objetivo de Negócio
- Aumentar o valor percebido do WhaTrack para clientes que gerenciam campanhas no Meta Ads.
- Reduzir o tempo necessário para gerar insights acionáveis a partir dos dados de campanha.
- Diferenciar a plataforma com uma camada de IA especializada, não genérica.

---

## 2. Estado Atual da Implementação

### O que já existe (implementado)

| Componente | Arquivo | Status |
|---|---|---|
| Endpoint de análise | `src/app/api/v1/meta-ads/copilot-analyze/route.ts` | ✅ Implementado |
| Drawer de análise | `src/components/dashboard/meta-ads/campaign-analysis-drawer.tsx` | ✅ Implementado |
| Agente Mastra (Groq) | Dentro do `copilot-analyze/route.ts` | ✅ Implementado |
| Coluna de ações na tabela | `src/app/dashboard/meta-ads/campaigns/columns.tsx` | ✅ Implementado |
| Timeline 7-14 dias | Fetch interno no endpoint | ✅ Implementado |
| Output estruturado (Zod) | Schema com `status`, `summary`, `bottlenecks`, `actionPlan` | ✅ Implementado |
| Gráfico Gasto vs. Conversão | `ComposedChart` (Recharts) no drawer | ✅ Implementado |

### Arquitetura atual do fluxo

```
CampaignAnalysisDrawer (click "Analisar")
  └─▶ POST /api/v1/meta-ads/copilot-analyze
        ├─ Fetch timeline 7-14 dias da Meta Graph API
        ├─ Mastra Agent (Groq llama-3.3-70b-versatile)
        │    └─ Zod schema output:
        │         ├─ status: "CRITICAL" | "WARNING" | "HEALTHY"
        │         ├─ summary: string
        │         ├─ bottlenecks: string[]
        │         └─ actionPlan: string[]
        └─ Resposta renderizada no Drawer
```

### Tipos implementados

```typescript
// src/components/dashboard/meta-ads/campaign-analysis-drawer.tsx
interface CopilotAnalysisResult {
  timeline: Array<{
    date: string;
    spend: number;
    revenue: number;
    cpa: number;
    clicks: number;
    purchases: number;
  }>;
  analysis: {
    status: "CRITICAL" | "WARNING" | "HEALTHY";
    summary: string;
    bottlenecks: string[];
    actionPlan: string[];
  };
}
```

---

## 3. Escopo e Funcionalidades

### 3.1 Funcionalidades Core (MVP — já implementadas ou em finalização)

#### 3.1.1 Disparador de Análise
- Botão "Analisar" com ícone Sparkles na coluna de ações da tabela de campanhas.
- Abre o `CampaignAnalysisDrawer` com a campanha selecionada como contexto.

#### 3.1.2 Preparação de Contexto (Backend)
O endpoint `POST /api/v1/meta-ads/copilot-analyze` deve:
1. Receber `campaignId`, `accountId` e `organizationId` no body.
2. Buscar **breakdown diário** da campanha nos últimos 14 dias via Meta Graph API v20.0:
   - Campos: `spend`, `impressions`, `clicks`, `cpm`, `cpc`, `ctr`, `actions`, `action_values`
   - Breakdown: `time_increment=1` (dia a dia)
3. Calcular métricas derivadas por dia: `LPV`, `IC`, `purchases`, `revenue`, `CPA`, `ROAS`, `CTR`, `CPM`.
4. Montar payload de contexto JSON estruturado para o agente.

#### 3.1.3 Agente Especialista (Mastra + Groq)
- **Modelo:** `groq('llama-3.3-70b-versatile')` via `@mastra/core/agent`.
- **Escopo do Prompt:** Estritamente restrito ao domínio de "Tráfego Pago / Meta Ads". O agente não deve responder a perguntas fora desse domínio.
- **Output:** JSON validado via Zod com schema fixo (ver seção 3.1.5).

#### 3.1.4 Detecção de Padrões pelo Agente
O agente deve identificar e reportar os seguintes padrões:

| Padrão | Sinais | Diagnóstico |
|---|---|---|
| **Fadiga de Criativo** | CTR caindo ≥ 20% ao longo da semana + CPM/CPA subindo | Criativo saturando a audiência; trocar ou duplicar com variação |
| **Fuga no Funil: Clique → LPV** | Clicks altos, LPV < 60% dos clicks | Problema de carregamento de landing page ou discrepância UTM |
| **Fuga no Funil: LPV → IC** | LPV razoável, IC < 30% dos LPV | Oferta ou página de produto sem apelo; revisar copy/CTA |
| **Fuga no Funil: IC → Compra** | IC alto, purchases < 20% dos IC | Abandono de carrinho; revisar checkout, frete, forma de pagamento |
| **CPA acima do limite** | CPA > valor de referência passado como contexto | Campanha sem eficiência econômica; pausar ou revisar segmentação |
| **ROAS em queda** | ROAS decaindo 3+ dias consecutivos | Saturação de audiência ou aumento de concorrência no leilão |
| **Orçamento subutilizado** | Gasto < 70% do orçamento diário configurado | Segmentação muito restrita ou lance muito baixo |
| **Frequência alta** | Frequency > 3.5 nos últimos 7 dias | Audiência vendo o mesmo anúncio muitas vezes; ampliar audiência |

#### 3.1.5 Output Estruturado (Zod Schema)

```typescript
const analysisSchema = z.object({
  status: z.enum(["CRITICAL", "WARNING", "HEALTHY"]),
  summary: z.string().describe("Resumo executivo em 2-3 frases sobre a saúde geral da campanha"),
  bottlenecks: z.array(z.object({
    type: z.string().describe("Ex: 'Fadiga de Criativo', 'Fuga LPV→IC'"),
    severity: z.enum(["high", "medium", "low"]),
    description: z.string().describe("Diagnóstico detalhado em 1-2 frases"),
    metric: z.string().optional().describe("Métrica específica que evidencia o problema, ex: 'CTR: 0.8% → 0.3%'"),
  })),
  actionPlan: z.array(z.object({
    priority: z.number().int().min(1),
    action: z.string().describe("Ação prática e específica"),
    rationale: z.string().describe("Por que essa ação resolve o gargalo identificado"),
    effort: z.enum(["low", "medium", "high"]).describe("Esforço de implementação"),
  })),
});
```

> **Nota:** O schema atual no código usa uma versão simplificada. Este schema enriquecido (com `severity`, `metric`, `priority`, `rationale`, `effort`) deve ser evoluído na próxima iteração.

#### 3.1.6 Drawer de Análise (UI)

O `CampaignAnalysisDrawer` deve exibir:

1. **Header:** Nome da campanha + badge de status (`CRITICAL` vermelho, `WARNING` amarelo, `HEALTHY` verde).
2. **Resumo Executivo:** Parágrafo gerado pelo agente.
3. **Gráfico de Tendência:** `ComposedChart` (Recharts) com:
   - Eixo X: dias (últimos 14 dias)
   - Barras: Gasto diário (R$)
   - Linha: CPA ou Compras diárias
4. **Gargalos Identificados:** Lista de cards com ícone de alerta por severidade, descrição e métrica de evidência.
5. **Plano de Ação:** Lista ordenada por prioridade com label de esforço (baixo/médio/alto).
6. **Footer:** Timestamp da análise + aviso de que a IA pode cometer erros.

---

### 3.2 Fases de Implementação

#### Fase 1 — MVP (Status Atual)
- [x] Endpoint `POST /api/v1/meta-ads/copilot-analyze` funcional
- [x] Agente Mastra com Groq configurado
- [x] Drawer de análise com gráfico e output básico
- [ ] Refinar o schema Zod para output enriquecido (severity, priority, rationale)
- [ ] Refinar o prompt do agente para usar o schema enriquecido
- [ ] Melhorar exibição no Drawer para os campos novos do schema

#### Fase 2 — Profundidade (Próxima Iteração)
- [ ] **Análise em nível de AdSet:** Breakdown por Conjunto de Anúncios para identificar qual conjunto está com melhor/pior performance dentro da campanha
- [ ] **Análise em nível de Ad (Criativo):** Identificar qual anúncio específico está fadigando vs. quais estão performando
- [ ] **Contexto de Referência:** Permitir que o usuário informe um CPA-alvo e ROAS mínimo para que o agente calibre os diagnósticos
- [ ] **Histórico de Análises:** Armazenar análises passadas no banco para comparação (tendência de saúde da campanha ao longo do tempo)

#### Fase 3 — Inteligência Proativa (Futuro)
- [ ] **Alertas Automáticos:** Job cron que roda a análise periodicamente (ex: diariamente) e envia notificação se status mudar para `CRITICAL`
- [ ] **Recomendações Comparativas:** Benchmarks contra outras campanhas da mesma organização
- [ ] **Modo Conversacional:** Permite o usuário fazer perguntas de follow-up sobre a análise gerada

---

## 4. Especificações Técnicas

### 4.1 Endpoint de Análise

**Rota:** `POST /api/v1/meta-ads/copilot-analyze`
**Auth:** `requirePermission(request, 'org:whatsapp:manage')` (ou permissão específica de meta-ads)
**Rate Limit:** Preset conservador (análise de LLM é cara computacionalmente)

**Request Body:**
```typescript
{
  campaignId: string;       // Meta campaign ID
  accountId: string;        // Meta ad account ID (ex: "act_123456")
  organizationId: string;
  days?: number;            // Janela de análise (default: 14, max: 30)
  targetCpa?: number;       // CPA-alvo em R$ (opcional, melhora diagnóstico)
  targetRoas?: number;      // ROAS mínimo (opcional)
}
```

**Response:**
```typescript
{
  timeline: TimelineDay[];
  analysis: {
    status: "CRITICAL" | "WARNING" | "HEALTHY";
    summary: string;
    bottlenecks: Bottleneck[];
    actionPlan: ActionItem[];
  };
  meta: {
    campaignName: string;
    analyzedAt: string;      // ISO timestamp
    daysAnalyzed: number;
  };
}
```

### 4.2 Integração com Meta Graph API

**Versão:** `v20.0` (constante `META_GRAPH_API_VERSION`)
**Endpoint para timeline:** `GET /{campaignId}/insights`

Parâmetros:
```
fields=spend,impressions,clicks,cpm,cpc,ctr,reach,frequency,
       actions,action_values
&time_increment=1
&date_preset=last_14d
&level=campaign
```

**Mapeamento de `actions` para métricas de funil:**

| `action.action_type` | Métrica |
|---|---|
| `landing_page_view` | LPV (Landing Page Views) |
| `initiate_checkout` | IC (Initiate Checkout) |
| `purchase` | Compras |
| `add_to_cart` | Adds to Cart |
| `lead` | Leads |

### 4.3 Configuração do Agente Mastra

```typescript
import { Agent } from "@mastra/core/agent";
import { groq } from "@ai-sdk/groq";

const metaAdsAnalyst = new Agent({
  name: "metaAdsAnalyst",
  instructions: `
    Você é um especialista sênior em tráfego pago com foco em Meta Ads (Facebook e Instagram).
    Sua única função é analisar dados de performance de campanhas e fornecer diagnósticos precisos.

    REGRAS:
    - Responda APENAS sobre tráfego pago e Meta Ads. Recuse qualquer outro assunto.
    - Baseie TODOS os diagnósticos nos dados fornecidos. Nunca invente métricas.
    - Priorize gargalos com maior impacto financeiro.
    - Use linguagem direta e técnica, adequada para um gestor de tráfego experiente.
    - Planos de ação devem ser específicos e implementáveis imediatamente.

    CONTEXTO DE ANÁLISE:
    Você receberá um payload JSON com o histórico diário da campanha (spend, impressions,
    clicks, CPM, CTR, LPV, IC, purchases, revenue, CPA, ROAS) dos últimos N dias.
    Identifique tendências, padrões de fadiga, fugas no funil e ineficiências orçamentárias.
  `,
  model: groq("llama-3.3-70b-versatile"),
});
```

### 4.4 Considerações de Performance

- **Latência esperada:** 5-15 segundos (Groq tem latência baixa vs. outros providers).
- **Loading state:** Skeleton ou spinner no drawer durante a inferência — obrigatório.
- **Timeout:** Configurar timeout de 30s no fetch para evitar requests pendurados.
- **Cache:** Não cachear resultados de análise (dados mudam a cada hora na Meta API). Considerar cache de 30 minutos se latência for problema.
- **Streaming:** Avaliar uso de streaming da resposta para UX mais responsiva (Vercel AI SDK suporta via `streamText`).

### 4.5 Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Token Meta expirado | Retornar 401 com mensagem "Reconecte sua conta Meta nas configurações" |
| Campanha sem dados no período | Retornar 422 com mensagem "Campanha sem dados nos últimos X dias" |
| Timeout do LLM | Retornar 504 com mensagem "Análise indisponível. Tente novamente em instantes." |
| Erro de validação do schema Zod | Log interno + fallback para output parcial se possível |

---

## 5. UX e Interface

### 5.1 Fluxo do Usuário

```
1. Usuário acessa /dashboard/meta-ads/campaigns
2. Visualiza tabela de campanhas com métricas
3. Clica no botão "Analisar" (ícone Sparkles) na linha da campanha
4. Drawer abre com loading skeleton
5. Request é enviado para o backend (~5-15s)
6. Resultado renderizado: status badge, resumo, gráfico, gargalos, plano de ação
7. Usuário pode fechar e analisar outra campanha
```

### 5.2 Estados do Drawer

| Estado | UI |
|---|---|
| **Idle** | Drawer fechado |
| **Loading** | Skeleton com animação pulse; mensagem "Analisando campanha..." |
| **Success** | Resultado completo renderizado |
| **Error** | Toast de erro + mensagem no drawer com instrução de retry |

### 5.3 Acessibilidade e Responsividade

- O Sheet deve funcionar em mobile (largura 100% em telas < 768px).
- Botão "Analisar" deve ter `aria-label` descritivo com o nome da campanha.
- Status badge deve usar cor + texto (não apenas cor) para acessibilidade.

---

## 6. Restrições e Premissas

### 6.1 Restrições

- **Custo de inferência:** Cada análise consome tokens do Groq. Avaliar rate limiting por organização (ex: máximo 20 análises/dia por conta).
- **Escopo do agente:** O prompt deve conter o agente no domínio de Meta Ads. Testes de prompt injection devem ser realizados.
- **Dados históricos:** A análise depende de dados disponíveis na Meta Graph API. Campanhas pausadas ou muito novas (< 3 dias) terão análises limitadas.
- **LGPD/GDPR:** Os dados enviados ao LLM (Groq) são métricas agregadas de campanha, sem dados pessoais de usuários finais. Verificar ToS do Groq.

### 6.2 Premissas

- A integração OAuth com Meta já está funcionando e o token está disponível via `getDecryptedToken()`.
- O serviço de campanhas `metaCampaignsService.getCampaigns()` já retorna as métricas necessárias para a tabela; o endpoint de análise fará sua própria fetch da timeline diária.
- O Mastra e o SDK do Groq já estão instalados como dependências do projeto.

---

## 7. Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---|---|---|
| Taxa de uso da feature | ≥ 30% dos usuários com Meta Ads ativo usam o copiloto/mês | Analytics de eventos (botão clicado) |
| Satisfação com a análise | ≥ 4/5 estrelas no feedback inline | Componente de rating no drawer |
| Taxa de erro do LLM | < 5% das requisições | Logs de erro no endpoint |
| Latência p95 | < 20s | Monitoramento de tempo de resposta |
| Retenção de clientes Meta Ads | ↑ vs. baseline | Churn analysis por segmento |

---

## 8. Referências

### Arquivos do Projeto
- **Endpoint:** [src/app/api/v1/meta-ads/copilot-analyze/route.ts](src/app/api/v1/meta-ads/copilot-analyze/route.ts)
- **Drawer:** [src/components/dashboard/meta-ads/campaign-analysis-drawer.tsx](src/components/dashboard/meta-ads/campaign-analysis-drawer.tsx)
- **Tabela de Campanhas:** [src/app/dashboard/meta-ads/campaigns/client.tsx](src/app/dashboard/meta-ads/campaigns/client.tsx)
- **Colunas e Tipos:** [src/app/dashboard/meta-ads/campaigns/columns.tsx](src/app/dashboard/meta-ads/campaigns/columns.tsx)
- **Serviço de Campanhas:** [src/services/meta-ads/campaigns.service.ts](src/services/meta-ads/campaigns.service.ts)
- **Serviço de Token:** [src/services/meta-ads/access-token.service.ts](src/services/meta-ads/access-token.service.ts)
- **Guards de Auth:** [src/lib/auth/guards.ts](src/lib/auth/guards.ts)

### Documentação Externa
- [Meta Graph API — Campaign Insights](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/insights/)
- [Mastra — Agent Framework](https://mastra.ai/docs)
- [Groq — API Reference](https://console.groq.com/docs/overview)
- [Vercel AI SDK — Structured Output](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
