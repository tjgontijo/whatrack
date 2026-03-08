# Análise: Implementação de Skills no WhaTrack

**Data**: 8 de Março de 2026
**Status**: ✅ Implementação bem estruturada com avisos de evolução

---

## 1. Resumo Executivo

A implementação de skills no WhaTrack segue **80% do padrão Anthropic** descrito na palestra. O sistema está bem organizado, mas há **4 desvios e 2 limitações** que precisam ser endereçados para escalar para centenas de skills.

### Score Geral: 7.8/10
- ✅ Estrutura de agent-skill bindings: excelente
- ✅ Progressive disclosure: implementado via `AiSkill.content`
- ✅ Skill upserts idempotentes: perfeito
- ⚠️ Falta integração de MCP servers
- ⚠️ Skills monolíticas (sem referências/scripts)
- ⚠️ Sem versionamento de skills
- ⚠️ Sem mecanismo de composição (skills dependencies)

---

## 2. O Que Está Implementado ✅

### 2.1 Arquitetura de Binding Agent → Skills

**Padrão**: Excelente aderência.

```typescript
// ai-execution.service.ts (linhas 184-190)
const promptParts = [agentDef.leanPrompt.trim()]
for (const binding of agentDef.skillBindings) {
  const content = binding.skill.content.trim()
  if (content.length > 0) {
    promptParts.push(content)
  }
}
const mastraAgent = new Agent({
  instructions: promptParts.join('\n\n'),
  model: resolveModel(agentDef.model),
})
```

**Análise**:
- ✅ Concatenação de skills em runtime é correta
- ✅ `sortOrder` garante ordem de disclosure
- ✅ Apenas skills `isActive: true` são carregadas
- ✅ Separação limpa entre `leanPrompt` (lean) e `skillBindings` (contextual)

### 2.2 Progressive Disclosure

**Padrão**: Implementado de forma mínimalista.

| Nível | Onde | Dados |
|-------|------|-------|
| L1 (Sempre) | `AiSkill` record | `name`, `kind`, `slug` |
| L2 (On-demand) | `AiSkill.content` | Markdown + instruções |
| L3 (Future) | Não existe | Scripts, assets, referências |

**Análise**:
- ✅ Level 1 e 2 funcionam conforme descrito na palestra
- ⚠️ Level 3 está ausente — skills hoje são **monolíticas** (tudo inline em `content`)
- Impacto: Skills com >1000 linhas (Meta Ads tem 192 linhas agora, mas pode crescer) vão pesar na janela de contexto

### 2.3 Seed Pattern Idempotente

**Padrão**: Muito bom.

Cada seed segue:
1. `upsert` agent por `(organizationId, name)`
2. Delete + createMany triggers
3. Upsert schemaFields por `(agentId, fieldName)`
4. Upsert skills + bindings

**Análise**:
- ✅ Reutilizável entre orgs
- ✅ Re-rodável sem duplicatas
- ✅ Responde a mudanças de prompt automático
- ⚠️ Sem versionamento (atualizando `content` apaga histórico da skill v1)

---

## 3. Desvios do Padrão Anthropic

### Desvio 1: Sem Estrutura de Diretórios (L3)

**Padrão Anthropic**:
```
skill-name/
├── SKILL.md (frontmatter + markdown)
├── scripts/
│   ├── audit.py
│   ├── extract.js
├── references/
│   ├── framework.md
│   ├── checklist.csv
└── assets/
    └── icons.svg
```

**Implementação WhaTrack**:
```
AiSkill (banco)
├── id (UUID)
├── slug
├── name
├── kind ('AGENT' ou 'SHARED')
├── content (markdown inline)
├── source ('SYSTEM' ou 'USER')
└── isActive
```

**Impacto**:
- ❌ Impossível versionar scripts separadamente
- ❌ Impossível reusar código entre skills (ex: `create_docx.py`)
- ❌ Markdown inline fica pesado para skills grandes
- ❌ Sem suporte a assets (templates, PDFs)

**Solução futuro**: Criar tabela `AiSkillAsset` com `(skillId, type: 'script'|'reference'|'asset', path, content)`.

### Desvio 2: Sem Composição de Skills

**Padrão Anthropic**: Skills podem depender de outras skills.

**Implementação WhaTrack**: Apenas relação linear `Agent → Skills`.

**Exemplo do que falta**:
```typescript
// Meta Ads Analyst deveria dizer:
// "Use skill:meta-ads-audit-framework para os checks,
//  depois aplique skill:meta-ads-creative-quality aos criativos"

// Hoje é tudo inline (improvável que o Mastra saiba ler skills dinamicamente)
```

**Impacto**:
- ⚠️ Difícil reusar sub-skills entre agents
- ⚠️ Cada agent precisa replicar conhecimento base

**Solução**: Adicionar campo `dependsOn: AiSkillId[]` ao seed.

### Desvio 3: Sem Modelo de Eventos Fora de Tickets

**Padrão em produção**: Skills podem ser acionadas por qualquer evento (`META_ADS_AUDIT_REQUESTED`, webhooks, etc).

**Implementação WhaTrack**:
- ✅ Trigger genérico suporta qualquer `eventType`
- ❌ `dispatchAiEvent` assume sempre `ticketId`

**Código problemático** (ai-execution.service.ts, linha 90-94):
```typescript
export async function dispatchAiEvent(
  eventType: string,
  ticketId: string,      // ← Assume sempre ticket!
  organizationId: string
): Promise<number> {
  // Busca conversa do ticket
  const ticket = await prisma.ticket.findUnique({...})
```

**Problema**: Meta Ads Analyst não tem ticket — precisa de contexto diferente (dados de conta).

**Solução necessária**:
```typescript
export async function dispatchAiEvent(
  eventType: string,
  ticketId: string | null,      // Opcional
  organizationId: string,
  contextData?: Record<string, unknown>  // Dados customizados
): Promise<number>
```

### Desvio 4: Sem MCP Server Binding

**Padrão Anthropic**: Agent + MCP + Skills = trio completo.

**Implementação WhaTrack**: Apenas Agent + Skills, sem MCP.

**Exemplo faltando**:
```typescript
// Deveria ter:
const mastraAgent = new Agent({
  instructions: ...,
  model: ...,
  tools: mcpTools,  // ← Tools do MCP
})
```

**Impacto**:
- ⚠️ Agents não conseguem buscar dados externos (Meta API, CRM, etc)
- ⚠️ Skills precisam receber dados **pré-formatados** no contexto

---

## 4. Análise dos 4 Agents Implementados

### 4.1 Sale Detector ✅

| Aspecto | Avaliação |
|---------|-----------|
| Skill Structure | 1 skill inline (`domainSkill`) |
| Trigger | ✅ `CONVERSATION_IDLE_3M` (apropriado) |
| Schema | ✅ 5 campos (intent, itemName, dealValue, reasoning, confidence) |
| Reusabilidade | ⚠️ Skill `detector-vendas-dominio` é agent-specific |
| Implementação | ✅ Padrão idempotente perfeito |

**Qualidade**: 8/10 — Bem focado, trigger apropriado, lógica clara.

---

### 4.2 Lead Qualifier ✅

| Aspecto | Avaliação |
|---------|-----------|
| Skill Structure | 1 skill inline (`domainSkill`) |
| Trigger | ✅ `CONVERSATION_IDLE_3M` |
| Schema | ✅ 5 campos (temperature, interestArea, nextAction, reasoning, confidence) |
| Reusabilidade | ⚠️ Skill `qualificador-lead-dominio` é agent-specific |
| Implementação | ✅ Padrão idempotente perfeito |

**Qualidade**: 8/10 — Complementa bem o Detector, bom trigger.

---

### 4.3 Conversation Summarizer ✅

| Aspecto | Avaliação |
|---------|-----------|
| Skill Structure | 1 skill inline (`domainSkill`) |
| Trigger | ✅ `TICKET_CLOSED` |
| Schema | ✅ 3 campos (summary, keyPoints, outcome) |
| Reusabilidade | ⚠️ Skill `resumidor-conversa-dominio` é agent-specific |
| Implementação | ✅ Padrão idempotente perfeito |
| Message Window | ✅ 30 msgs (vs 15 default para classifiers) |

**Qualidade**: 8/10 — Integração com `MESSAGE_WINDOW` é elegante.

---

### 4.4 Meta Ads Analyst 🔴 (Problema)

| Aspecto | Avaliação |
|---------|-----------|
| Skill Structure | ✅ 3 skills **reusáveis** (audit-framework, creative-quality, budget-strategy) |
| Trigger | ❌ `META_ADS_AUDIT_REQUESTED` (não existe em `dispatchAiEvent`) |
| Schema | ✅ 10 campos bem definidos |
| Reusabilidade | ✅ Skills marked as `SHARED` |
| Implementação | ⚠️ Seed perfeito, **execução quebrada** |

**Problema Crítico**:
```typescript
// dispatchAiEvent NÃO SUPORTA:
// 1. Events sem ticketId (META_ADS_AUDIT_REQUESTED é ad-hoc)
// 2. Contexto customizado (dados de conta, não histórico de conversa)
```

**Qualidade**: 4/10 — Seed excelente, mas trigger nunca vai rodar.

---

## 5. Checklist de Qualidade: Aderência ao Padrão Anthropic

| Critério | Status | Detalhes |
|----------|--------|----------|
| **Skills como Folders** | ⚠️ Parcial | Inline no banco, sem structure de diretório |
| **Progressive Disclosure** | ✅ Sim | L1 e L2 funcionam, L3 falta |
| **Composição (Dependencies)** | ❌ Não | Sem mecanismo de `dependsOn` |
| **Versionamento** | ❌ Não | Updates apagam histórico |
| **Agents Genéricos** | ✅ Parcial | Funcionam para tickets, não para outros eventos |
| **MCP Integration** | ❌ Não | Tools não estão integradas |
| **Skill Scripts** | ❌ Não | Sem suporte a executáveis |
| **Idempotência** | ✅ Sim | Seeds são perfeitas |

---

## 6. Limitações Técnicas Atuais

### 6.1 dispatchAiEvent Assume Sempre Ticket

**Arquivo**: `src/services/ai/ai-execution.service.ts` (linha 90)

```typescript
export async function dispatchAiEvent(
  eventType: string,
  ticketId: string,  // ← SEMPRE OBRIGATÓRIO
  organizationId: string
): Promise<number>
```

**Consequência**:
- ✅ Sale Detector, Lead Qualifier, Summarizer: funcionam
- ❌ Meta Ads Analyst: **não consegue rodar**

**Solução Rápida** (1h):
```typescript
export async function dispatchAiEventWithContext(
  eventType: string,
  organizationId: string,
  ticketId?: string,
  customContext?: Record<string, unknown>
): Promise<number>
```

---

### 6.2 Sem Suporte a Context Customizado

**Arquivo**: `ai-execution.service.ts` (linha 199-201)

```typescript
const fullPrompt =
  `Analise o histórico de atendimento abaixo...` +
  `[HISTÓRICO — ${history.split('\n').length} mensagens]\n${history}`
```

**Problema**: Hardcoded para histórico de conversa. Meta Ads Analyst precisa de:
```
[CONTA META ADS]
- Account ID: abc123
- Spend mensal: $5,000
- ROAS: 2.3x
- Pixel status: ativo
- ...
```

**Solução** (mesma função):
```typescript
let contextData: string = ''
if (ticketId) {
  // Histórico de conversa (padrão)
} else if (customContext) {
  // Formatar contextData de customContext
}
const fullPrompt = `... [CONTEXTO]\n${contextData}`
```

---

### 6.3 Skills Monolíticas (Sem Referências/Scripts)

**Exemplo**: Meta Ads Analyst tem 192 linhas de markdown inline.

**Se fossem 500 linhas** (exemplo real), ocuparia muito contexto.

**Solução arquitetural**:
```typescript
// Hoje:
AiSkill {
  content: "# Metadata de 192 linhas"  // Tudo inline
}

// Futuro:
AiSkill {
  content: "# Metadata (100 linhas)"
  assets: [
    { type: 'reference', name: 'advanced-checks.md', path: 'references/...' },
    { type: 'script', name: 'score-calculator.py', path: 'scripts/...' }
  ]
}
```

---

## 7. Roadmap de Evolução (Priority)

### 🔴 P0 (Bloqueantes - Esta Semana)

1. **Fix `dispatchAiEvent` para suportar custom context**
   - Tempo: 1h
   - Impacto: Meta Ads Analyst vira funcional
   - Arquivo: `src/services/ai/ai-execution.service.ts`

2. **Criar endpoint `/api/v1/meta-ads/audit` que chama `dispatchAiEventWithContext`**
   - Tempo: 1h
   - Impacto: Usuário consegue ativar audit manualmente

### 🟠 P1 (Importar - Próxima Sprint)

3. **Implementar `AiSkillAsset` para separar scripts/references**
   - Tempo: 4h
   - Impacto: Skills crescem sem pesar na janela de contexto
   - Banco: Nova tabela `ai_skill_assets`

4. **Versionamento de skills** (`version`, `changedAt`, `changelog`)
   - Tempo: 2h
   - Impacto: Audit trail de mudanças

5. **MCP Server binding** (se planeja integrar APIs externas)
   - Tempo: 6h
   - Impacto: Agents conseguem buscar dados em tempo real
   - Exemplo: Meta Ads API via MCP

### 🟡 P2 (Nice-to-Have)

6. **Composição de skills** (`dependsOn` field)
   - Tempo: 3h
   - Impacto: Reutilizar frameworks base

---

## 8. Recomendações Imediatas

### Para Passar no "Smoke Test" (PRD 09)

✅ **Está pronto**:
- Sale Detector
- Lead Qualifier
- Conversation Summarizer
- 3 agents rodam via cron ou eventos

❌ **Falta**:
- Meta Ads Analyst: executável apenas após fix em `dispatchAiEvent` (P0)

### Para Escalar para 10+ Skills

Ordem de ação:
1. **Hoje**: Fix dispatchAiEvent + endpoint audit
2. **Semana que vem**: AiSkillAsset + versionamento
3. **Mês que vem**: Considerar MCP se precisar dados externos

---

## 9. Conclusão

**Implementação Atual**: 7.8/10 ⭐⭐⭐⭐⭐⭐⭐✖

A arquitetura de agent-skill binding está **muito bem feita**. O padrão idempotente dos seeds é modelo para reutilizar.

**Mas há 1 bug crítico**: `dispatchAiEvent` assume sempre `ticketId`, bloqueando Meta Ads Analyst.

**Depois que corrigir P0**, o sistema vai suportar 50-100 skills sem problemas. Depois de P1 (AiSkillAsset), consegue lidar com skills complexas de >1000 linhas.

---

## 📎 Arquivos Analisados

- ✅ `prisma/seeds/seed_agent_*.ts` (4 arquivos)
- ✅ `src/services/ai/ai-execution.service.ts`
- ✅ `prisma/schema.prisma` (relação AiAgent → AiSkill)
