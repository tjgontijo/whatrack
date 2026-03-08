# PRD 10: Meta Ads Analyst Audit (Smoke-bloqueante)

**Status**: Planejamento
**Data**: 8 de Março de 2026
**Bloqueante**: Sim (smoke test PRD 09)
**Dependência**: PRD 05 (AI Copilot) — Meta Ads Analyst seed já existe

---

## 1. Objetivo

Integrar o **Meta Ads Analyst Agent** (46-check framework, já seedado) em um **endpoint dedicado** com UI moderna, permitindo auditar contas Meta Ads manualmente.

**Diferencial**: Não é "copilot genérico"; é auditoria estruturada com score, grade e recomendações específicas.

---

## 2. Escopo (MVP)

### Funcionalidades
- ✅ Novo endpoint: `POST /api/v1/meta-ads/audit`
- ✅ Função: `dispatchAiEventForAudit()` (nova)
- ✅ UI drawer redesenhado (mesmo visual, novos componentes)
- ✅ Quota enforcement (básico: query simples, sem tabela de custo)
- ✅ Resposta estruturada: score, grade, 4 category scores, findings, quick wins

### Fora do Escopo
- ❌ Dashboard de custos (vai para PRD 11)
- ❌ Tabela `AiInsightCost` (vai para PRD 11)
- ❌ Cron de overage (vai para PRD 11)
- ❌ Analytics avançadas

---

## 3. Arquitetura

### 3.1 Nova Função: `dispatchAiEventForAudit()`

**Arquivo**: `src/services/ai/ai-execution-audit.service.ts` (novo)

```typescript
export async function dispatchAiEventForAudit(
  eventType: string,
  organizationId: string,
  customContext: Record<string, unknown>
): Promise<AiInsight>
```

**Diferença de `dispatchAiEvent()`**:
- ✅ NÃO usa ticketId
- ✅ Recebe contexto customizado (dados de conta Meta Ads)
- ✅ Não busca histórico de conversa
- ✅ Retorna AiInsight (não count de executados)

**Fluxo**:
1. Busca agent por eventType
2. Formata contexto (sem ticket)
3. Roda Mastra agent
4. Cria AiInsight (não registra custo neste PRD)
5. Retorna resultado

### 3.2 Endpoint: `POST /api/v1/meta-ads/audit`

**Arquivo**: `src/app/api/v1/meta-ads/audit/route.ts` (novo)

**Request**:
```json
{ "accountId": "123456789" }
```

**Response** (200):
```json
{
  "insightId": "uuid",
  "healthScore": 87,
  "grade": "B",
  "pixelCapiScore": 92,
  "creativeScore": 81,
  "structureScore": 85,
  "audienceScore": 88,
  "criticalFindings": ["CAPI event matching < 8.0"],
  "highPriorityFindings": [...],
  "quickWins": ["Duplicar melhor criativo"],
  "summary": "Conta em bom estado..."
}
```

**Lógica**:
1. Validar `manage:ai`
2. Check quota (query rápida: contar `AiInsight` com eventType `META_ADS_AUDIT_REQUESTED` este mês)
   - Se STARTER: max 5 calls/mês → reject com 429 se atingiu
3. Buscar dados da conta Meta Ads (via connection existente)
4. Formatar contexto
5. Chamar `dispatchAiEventForAudit()`
6. Retornar resultado

### 3.3 Helper: `meta-ads-context.service.ts`

**Arquivo**: `src/services/meta-ads/meta-ads-context.service.ts` (novo)

```typescript
export function formatContextForAudit(accountData: {
  accountId: string
  accountName: string
  spend: number
  roas: number
  pixelStatus: string
  capiStatus: string
  campaigns: Array<any>
  audiences: Array<any>
  creatives: Array<any>
}): Record<string, unknown>
```

**Output**: Dados estruturados prontos para o agent (não markdown string, porque agent já tem skills que formatam).

---

## 4. UI: Redesenho da Drawer

### Componente: `campaign-analysis-drawer.tsx`

**Mudanças**:
- Header: "Auditoria de Meta Ads" (em vez de "Agente Analítico")
- Remove timeline de 14 dias
- Adiciona:
  - **Grade Card**: A-F com cor (A=verde, F=vermelho)
  - **Category Scores**: 4 cards com valores 0-100 (Pixel/CAPI, Creative, Structure, Audience)
  - **Findings Sections**: Críticos (vermelho), Alta Prioridade (amarelo), Quick Wins (verde)
  - **Summary**: Executivo em 2-3 linhas

**Endpoint chamado**: `/api/v1/meta-ads/audit` (em vez de `copilot-analyze`)

**Estrutura**:
```tsx
// Antes: CopilotAnalysisResult (genérico)
// Depois: MetaAdsAnalystResult (estruturado)
interface MetaAdsAnalystResult {
  insightId: string
  healthScore: number  // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  pixelCapiScore?: number
  creativeScore?: number
  structureScore?: number
  audienceScore?: number
  criticalFindings: string[]
  highPriorityFindings?: string[]
  quickWins: string[]
  summary: string
}
```

---

## 5. Quota Enforcement (Básico)

**MVP**: Query simples, sem nova tabela

```typescript
async function checkAndEnforceQuota(organizationId: string): Promise<boolean> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const monthlyCount = await prisma.aiInsight.count({
    where: {
      organizationId,
      eventType: 'META_ADS_AUDIT_REQUESTED',
      createdAt: { gte: monthStart }
    }
  })

  const subscription = await prisma.billingSubscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include: { planTemplate: true }
  })

  const quota = {
    'FREE': 0,
    'STARTER': 5,
    'GROWTH': 50,
    'PROFESSIONAL': 500
  }[subscription?.planTemplate?.tier || 'STARTER'] || 5

  return monthlyCount < quota
}
```

Se quota atingida → retorna `429 Quota exceeded`.

---

## 6. Implementação (Step-by-Step)

### Passo 1: Criar `dispatchAiEventForAudit()` (1h)
- Arquivo: `src/services/ai/ai-execution-audit.service.ts`
- Implementação conforme seção 3.1
- Sem tracking de custo por enquanto

### Passo 2: Criar `meta-ads-context.service.ts` (1h)
- Busca dados via Meta Ads API (usar connection existente)
- Formata para contexto legível pelo agent
- Exemplo: account name, spend, ROAS, pixel/CAPI status, campaigns, audiences, creatives

### Passo 3: Criar endpoint `/api/v1/meta-ads/audit` (1h)
- Validação de acesso
- Quota check
- Fetch data + format context
- Chamar `dispatchAiEventForAudit()`
- Retornar resultado

### Passo 4: Redesenhar `campaign-analysis-drawer.tsx` (2h)
- Remove timeline
- Adiciona Grade Card
- Adiciona 4 category score cards
- Adiciona Findings sections
- Integra novo endpoint

### Passo 5: Testes (1h)
- POST `/api/v1/meta-ads/audit` com account real
- Validar resposta estruturada
- Testar quota enforcement
- Smoke test: drawer abre, carrega auditoria, exibe resultado

---

## 7. Dependências Técnicas

- ✅ `seed_agent_meta_ads_analyst.ts` (já existe, 3 skills + agent)
- ✅ `MetaAdsConnection` (já existe)
- ✅ Meta Ads API client (já integrado)
- ✅ `apiFetch` com `ORGANIZATION_HEADER` (já implementado)

---

## 8. Validação Obrigatória

Antes de marcar como DONE:

```bash
npm run lint        # Sem erros
npm run test        # Testes novos passam (quota, context format)
```

Testes a criar:
- `src/services/ai/ai-execution-audit.service.spec.ts` (mock agent)
- `src/services/meta-ads/meta-ads-context.service.spec.ts` (format context)

---

## 9. Critério de Conclusão

- ✅ Endpoint funcional, retorna score + grade + findings
- ✅ Drawer carrega e exibe resultado
- ✅ Quota enforcement bloqueando audits acima do limite
- ✅ Nenhuma tabela nova de custo
- ✅ Testes passando
- ✅ Lint sem erros
- ✅ Nenhuma modificação em `dispatchAiEvent()` original (mantém tickets intocados)

---

## 10. Estimativa

| Componente | Tempo |
|-----------|-------|
| `dispatchAiEventForAudit()` | 1h |
| `meta-ads-context.service.ts` | 1h |
| Endpoint audit | 1h |
| Redesenho drawer | 2h |
| Testes | 1h |
| **Total** | **6h** |

---

## Próximas Ações

1. ✅ Plano aprovado
2. ⬜ Implementar 6h
3. ⬜ Validar (npm run lint + test)
4. ⬜ Smoke test PRD 09
5. ➡️ Depois: PRD 11 (AI Cost Tracking)
