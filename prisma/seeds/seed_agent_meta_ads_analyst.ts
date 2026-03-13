import type { PrismaClient } from '@generated/prisma/client'

/**
 * Agente: Meta Ads Analyst
 *
 * Analisa dados de contas Meta Ads usando framework de 46 checks adaptado do claude-ads.
 * Trigger: META_ADS_AUDIT_REQUESTED (evento ad-hoc, não baseado em ticket/conversa)
 *
 * Skills incluídas:
 * - meta-ads-audit-framework    → 46 checks por categoria com pesos e thresholds
 * - meta-ads-creative-quality   → detecção de fadiga e diversidade criativa
 * - meta-ads-budget-strategy    → alocação de budget e estratégia de lances
 *
 * O agente recebe os dados da conta formatados como contexto no prompt e retorna
 * um diagnóstico estruturado pronto para exibição no dashboard.
 */

const SKILLS = [
  {
    slug: 'meta-ads-audit-framework',
    name: 'Meta Ads — Framework de Auditoria (46 checks)',
    kind: 'SHARED' as const,
    sortOrder: 100,
    content: `## Framework de Auditoria Meta Ads (46 checks)

Você avalia contas Meta Ads usando quatro categorias com pesos definidos.
Aplique todos os checks relevantes aos dados fornecidos.

### Categoria 1: Pixel/CAPI Health (30% do score)

Thresholds obrigatórios:
- Pixel instalado e disparando: PASS = confirmado | FAIL = ausente ou inativo
- CAPI ativo: PASS = implementado | FAIL = ausente (risco de perda 30-40% de dados pós-iOS 14.5)
- Taxa de deduplicação: PASS ≥ 90% | WARNING 70-89% | FAIL < 70%
- EMQ (Event Match Quality) para Purchase: PASS ≥ 8.0 | WARNING 6.0-7.9 | FAIL < 6.0
- Parâmetros de EMQ priorizados: email, phone, name (nessa ordem de impacto)
- Eventos padrão configurados corretamente: ViewContent, AddToCart, InitiateCheckout, Purchase
- Conversões customizadas: verificar se há duplicidade ou conflito com eventos padrão

Severidade crítica (5x multiplicador):
- Pixel ausente → score 0 para esta categoria
- CAPI ausente → -15 pontos no score total
- Deduplicação < 70% → dados não confiáveis, alertar imediatamente

### Categoria 2: Creative Diversity & Fatigue (30% do score)

Thresholds:
- Formatos ativos: PASS ≥ 3 formatos (image, video, carousel, collection) | FAIL < 3
- Criativos por ad set: PASS ≥ 5 | WARNING 3-4 | FAIL < 3
- Fadiga criativa: FAIL se CTR caiu > 20% em 14 dias
- Frequência (prospecting): PASS < 3.0/7 dias | WARNING 3.0-5.0 | FAIL > 5.0
- Frequência (retargeting): PASS < 8.0 | WARNING 8.0-12.0 | FAIL > 12.0
- Cadência de refresh: campanhas com alto spend devem renovar criativos a cada 2-4 semanas
- Vídeo: verificar comprimento adequado por placement

Severidade crítica:
- Apenas 1 formato criativo → score máximo 50 nesta categoria
- Frequência > 5.0 em prospecting → fadiga severa, ação imediata

### Categoria 3: Account Structure (20% do score)

Thresholds:
- Campanhas em learning limited: PASS < 30% | WARNING 30-50% | FAIL > 50%
- Consolidação: PASS ≤ 5 campanhas por objetivo | WARNING 6-10 | FAIL > 10
- Budget relativo ao CPA alvo: campanha deve ter ≥ 5-10x CPA/dia para sair do learning
- CBO vs ABO: avaliar se a escolha é adequada ao estágio da conta
- Sobreposição de audience: verificar se há competição interna entre ad sets
- Advantage+: avaliar se Shopping e Audience estão configurados adequadamente

### Categoria 4: Audience & Targeting (20% do score)

Thresholds:
- Diversidade de custom audiences: PASS ≥ 3 listas ativas
- Lookalike testing: PASS = testando diferentes seed sizes (1%, 5%, 10%)
- Exclusões: verificar se compradores são excluídos de prospecting
- Retargeting window: avaliar janelas de 7, 14, 30 dias

### Cálculo do Score Final

Score = (Cat1 × 0.30) + (Cat2 × 0.30) + (Cat3 × 0.20) + (Cat4 × 0.20)

Grades:
- A: 90-100 → otimizações menores
- B: 75-89 → melhorias pontuais
- C: 60-74 → problemas significativos
- D: 40-59 → problemas graves
- F: < 40 → intervenção urgente

### Priorização de Achados

- CRITICAL: risco imediato de receita ou perda de dados (pixel/CAPI, deduplicação)
- HIGH: impacto significativo em performance (fadiga criativa, learning limited)
- MEDIUM: oportunidades de otimização
- LOW: boas práticas ausentes`,
  },
  {
    slug: 'meta-ads-creative-quality',
    name: 'Meta Ads — Qualidade Criativa e Fadiga',
    kind: 'SHARED' as const,
    sortOrder: 110,
    content: `## Avaliação de Qualidade Criativa — Meta Ads

### Detecção de Fadiga

Sinais de fadiga criativa (verificar nos dados fornecidos):
- CTR caiu > 20% nos últimos 14 dias vs período anterior → FADIGA CONFIRMADA
- Frequência > 3.0 em prospecting → risco de saturação
- CPM crescendo sem aumento de qualidade de audience → sinal de fadiga
- Engajamento (comentários, compartilhamentos) caindo proporcionalmente ao alcance

### Diversidade de Formatos

Requisitos por volume de spend:
- < R$3k/mês: mínimo 2 formatos
- R$3k-10k/mês: mínimo 3 formatos (image + video obrigatório)
- > R$10k/mês: mínimo 4 formatos incluindo carousel ou collection

Formatos disponíveis: Image estático, Vídeo, Carousel, Collection, Stories, Reels

### Padrões de Qualidade

Copy:
- Headline: máximo 40 caracteres visíveis no feed
- Primary text: 125 caracteres antes do "ver mais"
- Proposta de valor clara nos primeiros 3 segundos (vídeo)

Vídeo:
- Stories/Reels: vertical 9:16, máximo 60s
- Feed: quadrado 1:1 ou horizontal 16:9
- Primeiros 3 segundos devem ter hook visual forte

Mobile-first:
- Texto legível sem zoom
- CTA visível sem scroll
- Imagens com resolução mínima 1080px

### Quick Wins Criativos

Ações de alto impacto em menos de 15 minutos:
- Duplicar melhor anúncio com variação de headline
- Adicionar versão de vídeo curto (15s) de criativo estático de sucesso
- Testar CTA alternativo no criativo de maior alcance`,
  },
  {
    slug: 'meta-ads-budget-strategy',
    name: 'Meta Ads — Budget e Estratégia de Lances',
    kind: 'SHARED' as const,
    sortOrder: 120,
    content: `## Budget e Estratégia de Lances — Meta Ads

### Regra 70/20/10

Distribuição recomendada do orçamento total:
- 70% em canais/campanhas comprovados (ROAS > 1.5x)
- 20% em escalada de oportunidades identificadas
- 10% em testes (novos creativos, audiences, objetivos)

### Estratégias de Lance por Estágio

Campanhas com < 30 conversões/mês:
→ Maximize Conversions (sem target de CPA) para acumular dados

Campanhas com 30-50 conversões/mês:
→ Cost Cap com CPA target conservador (20-30% acima do CPA histórico)

Campanhas com > 50 conversões/mês:
→ Target CPA ou Target ROAS (quando ROAS tracking for confiável)

### Regra de Corte 3x (Kill Rule)

Pausar campanhas/ad sets quando:
- CPA > 3x do target → gasto ineficiente confirmado
- 0 conversões após gastar $100+ (ou 50+ cliques)
- CTR < 0.5% com ≥ 1000 impressões

### Escalada Segura

Nunca aumentar budget > 20% em uma única alteração.
Aguardar 3-5 dias antes de novo ajuste (respeitando janela de aprendizado).

Sinais para escalar:
- ROAS estável por 7+ dias
- CPA dentro do target por 5+ dias
- Frequência ainda < 2.5

### Diagnóstico de Distribuição

Verificar nos dados:
- Há campanhas consumindo > 60% do budget sem proporcional resultado?
- Budget diário é ≥ 5x o CPA alvo? (mínimo para saída do learning)
- Há sazonalidade relevante não considerada na distribuição?`,
  },
]

const AGENT = {
  name: 'Meta Ads Analyst',
  icon: 'BarChart2',
  model: 'openai/gpt-4o-mini',
  leanPrompt: `Você é um especialista em performance de Meta Ads (Facebook e Instagram).

Você recebe dados estruturados de uma conta de anúncios e deve produzir um diagnóstico objetivo usando o framework de auditoria de 46 checks.

Regras:
- Baseie-se apenas nos dados fornecidos. Não invente métricas ausentes.
- Quando um dado estiver ausente, marque o check como "sem dados" e não penalize o score.
- Seja preciso nos números: score, porcentagens e thresholds.
- Priorize achados críticos (pixel/CAPI, deduplicação, fadiga severa) antes dos demais.
- Quick wins devem ser ações concretas, não recomendações genéricas.`,
  triggers: [
    {
      eventType: 'META_ADS_AUDIT_REQUESTED',
      conditions: {},
    },
  ],
  schemaFields: [
    {
      fieldName: 'healthScore',
      fieldType: 'NUMBER',
      description: 'Score geral da conta de 0 a 100 calculado pelo framework de 46 checks.',
      isRequired: true,
    },
    {
      fieldName: 'grade',
      fieldType: 'ENUM',
      description: 'Nota da conta: A (90-100), B (75-89), C (60-74), D (40-59), F (<40).',
      isRequired: true,
      options: ['A', 'B', 'C', 'D', 'F'],
    },
    {
      fieldName: 'pixelCapiScore',
      fieldType: 'NUMBER',
      description: 'Score da categoria Pixel/CAPI Health de 0 a 100.',
      isRequired: false,
    },
    {
      fieldName: 'creativeScore',
      fieldType: 'NUMBER',
      description: 'Score da categoria Creative Diversity & Fatigue de 0 a 100.',
      isRequired: false,
    },
    {
      fieldName: 'structureScore',
      fieldType: 'NUMBER',
      description: 'Score da categoria Account Structure de 0 a 100.',
      isRequired: false,
    },
    {
      fieldName: 'audienceScore',
      fieldType: 'NUMBER',
      description: 'Score da categoria Audience & Targeting de 0 a 100.',
      isRequired: false,
    },
    {
      fieldName: 'criticalFindings',
      fieldType: 'ARRAY',
      description:
        'Lista de problemas críticos que exigem ação imediata (risco de receita ou dados).',
      isRequired: true,
    },
    {
      fieldName: 'highPriorityFindings',
      fieldType: 'ARRAY',
      description: 'Lista de problemas de alta prioridade com impacto significativo em performance.',
      isRequired: false,
    },
    {
      fieldName: 'quickWins',
      fieldType: 'ARRAY',
      description: 'Lista de ações de alto impacto realizáveis em menos de 15 minutos.',
      isRequired: true,
    },
    {
      fieldName: 'summary',
      fieldType: 'STRING',
      description:
        'Resumo executivo em 2-3 frases do estado da conta e principal prioridade de ação.',
      isRequired: true,
    },
  ],
}

export async function seedAgentMetaAdsAnalyst(prisma: PrismaClient, organizationId: string) {
  // 1. Upsert shared skills
  const skillIds: string[] = []

  for (const skill of SKILLS) {
    const record = await prisma.aiSkill.upsert({
      where: { organizationId_slug: { organizationId, slug: skill.slug } },
      update: {
        name: skill.name,
        content: skill.content,
        kind: skill.kind,
        source: 'SYSTEM',
        isActive: true,
      },
      create: {
        organizationId,
        slug: skill.slug,
        name: skill.name,
        content: skill.content,
        kind: skill.kind,
        source: 'SYSTEM',
        isActive: true,
      },
      select: { id: true },
    })

    skillIds.push(record.id)
  }

  // 2. Upsert agent
  const agentRecord = await prisma.aiAgent.upsert({
    where: { organizationId_name: { organizationId, name: AGENT.name } },
    update: {
      icon: AGENT.icon,
      leanPrompt: AGENT.leanPrompt,
      model: AGENT.model,
    },
    create: {
      organizationId,
      name: AGENT.name,
      icon: AGENT.icon,
      leanPrompt: AGENT.leanPrompt,
      model: AGENT.model,
      isActive: false, // ativado manualmente após configurar a integração Meta
    },
  })

  // 3. Triggers
  await prisma.aiTrigger.deleteMany({ where: { agentId: agentRecord.id } })
  await prisma.aiTrigger.createMany({
    data: AGENT.triggers.map((t) => ({
      agentId: agentRecord.id,
      eventType: t.eventType,
      conditions: t.conditions,
    })),
  })

  // 4. Schema fields
  for (const field of AGENT.schemaFields) {
    await prisma.aiSchemaField.upsert({
      where: { agentId_fieldName: { agentId: agentRecord.id, fieldName: field.fieldName } },
      update: {
        fieldType: field.fieldType,
        description: field.description,
        isRequired: field.isRequired,
        options: field.options ?? undefined,
      },
      create: {
        agentId: agentRecord.id,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        description: field.description,
        isRequired: field.isRequired ?? true,
        options: field.options ?? undefined,
      },
    })
  }

  // 5. Skill bindings (na ordem de sortOrder das skills)
  for (let i = 0; i < SKILLS.length; i++) {
    const skillId = skillIds[i]
    const sortOrder = SKILLS[i].sortOrder

    await prisma.aiAgentSkill.upsert({
      where: { agentId_skillId: { agentId: agentRecord.id, skillId } },
      update: { sortOrder, isActive: true },
      create: { agentId: agentRecord.id, skillId, sortOrder, isActive: true },
    })
  }
}
