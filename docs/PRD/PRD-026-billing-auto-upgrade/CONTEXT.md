# PRD-026: CONTEXT — Fluxos, Regras e Casos de Uso

---

## 1. Planos e Limites

Após implementação:

| Plano | Projetos Inclusos | Preço Mensal | Preço/Projeto Extra |
|-------|------------------|-------------|-------------------|
| Starter | 1 | R$ 97 | R$ 97/mês |
| Pro | 3 | R$ 197 | R$ 67/mês |
| Business | **5** | R$ 397 | R$ 47/mês |

**Nota:** Business muda de 10 → 5 projetos. Clientes com > 5 projetos receberão notificação.

---

## 2. Lógica de Auto-Upgrade

### 2.1 Quando Detectar?

Auto-upgrade é **detectado e processado na criação de novo projeto**.

```typescript
// Pseudocódigo
function onProjectCreated(userId, projectData) {
  const subscription = await getSubscription(userId);
  const currentPlan = subscription.currentPlan;
  const projectCount = await countUserProjects(userId);
  
  if (projectCount > currentPlan.includedProjects) {
    const newPlan = findSmallestPlanThatFits(projectCount);
    if (newPlan.code !== currentPlan.code) {
      await performAutoUpgrade(subscription, currentPlan, newPlan);
    }
  }
}
```

### 2.2 Qual Plano Escolher?

Sempre o **menor plano que comporta a quantidade de projetos**.

**Exemplo:**
- Cliente tem Starter (1 projeto incluso)
- Cria projeto 2 → Upgrade para Pro (3 projetos)
  - NÃO pula para Business (seria maior do que necessário)

**Sequência de planos por limite:**
```
Starter (1) → Pro (3) → Business (5)
```

### 2.3 E se o Cliente Tiver Mais Projetos que Business?

Hoje o Business é o máximo (5 projetos). Se cliente criar projeto 6+:

**Opção A (recomendada):** Permitir criação, usar Business, e marcar como caso especial (contato com sales)
**Opção B:** Bloquear criação (pior UX)

**Decisão:** Ir com **Opção A** — permitir, usar Business, gerar alerta para vendas

---

## 3. Histórico de Planos (BillingPlanHistory)

### 3.1 O Que Registrar

Cada mudança de plano gera entrada em `BillingPlanHistory`:

```
{
  subscriptionId: "sub_abc123",
  planId: "plan_pro",
  startedAt: 2026-04-16T10:30:00Z,
  endedAt: 2026-04-20T15:45:00Z,  // null se plano atual
  reason: "auto_upgrade",  // "manual", "auto_upgrade", "downgrade", "trial_to_paid"
  projectCountAtChange: 2,
  createdAt: 2026-04-16T10:30:00Z
}
```

### 3.2 Reasons (Razão da Mudança)

- `trial_to_paid` — Cliente saiu do trial e pagou por um plano
- `manual` — Mudança manual (admin ou futura feature de downgrade)
- `auto_upgrade` — Detectado automaticamente ao criar projeto
- `downgrade` — Futuro (não implementa agora)

### 3.3 Como Usar Histórico

**Para auditoria:**
```sql
SELECT * FROM BillingPlanHistory 
WHERE subscriptionId = 'sub_abc123' 
ORDER BY startedAt DESC;
```

Resultado:
```
2026-04-20 | Business | Auto-upgrade (4 projetos)
2026-04-10 | Pro      | Auto-upgrade (2 projetos)
2026-01-01 | Starter  | Trial-to-paid
```

---

## 4. Novo Invoice no Upgrade

### 4.1 Quando Criar?

Novo invoice é criado **imediatamente após detectar o upgrade**:

```
Cliente em Pro (R$ 197/mês) na data 2026-04-10
Cria projeto 4 em 2026-04-16 (6 dias depois)
  → Upgrade para Business (R$ 397/mês)
  → Invoice prorated gerado:
    - Crédito: 24 dias × (197/30) = R$ 157.60
    - Cobrança: 24 dias × (397/30) = R$ 316.80
    - Saldo: R$ 159.20 a cobrar
```

### 4.2 Fluxo no Asaas

1. Cancelar invoice anterior (se houver dias restantes)
2. Criar novo invoice com o novo amount (prorated)
3. Registrar em `BillingInvoice`
4. Atualizar `BillingSubscription.currentPlanId`

---

## 5. Casos de Uso

### UC1: Cliente Starter cria 2º projeto

**Precondição:** Cliente está em Starter (1 projeto incluso), ciclo está ativo

**Ação:** Clica em "Novo Projeto", preenche dados

**Sistema detecta:**
- Cliente tem 2 projetos agora
- 2 > 1 (limite do Starter)
- Menor plano que comporta: Pro (3 projetos)

**Resultado:**
```
✅ Projeto criado
✅ Plano atualizado: Starter → Pro
✅ Novo invoice criado (prorated)
✅ BillingPlanHistory registrado (auto_upgrade, 2 projetos)
✅ Email enviado: "Seu plano foi atualizado para Pro"
```

**Dashboard:**
```
Seu plano atual: Pro (3 projetos)
Próximo ciclo: 2026-05-16
Próxima cobrança: R$ 197/mês
```

### UC2: Cliente Pro cria 4º projeto

**Precondição:** Cliente em Pro (3 projetos), ciclo ativo

**Ação:** Cria projeto 4

**Sistema detecta:**
- Cliente tem 4 projetos agora
- 4 > 3 (limite do Pro)
- Menor plano que comporta: Business (5 projetos)

**Resultado:**
```
✅ Projeto criado
✅ Plano atualizado: Pro → Business
✅ Novo invoice criado (prorated)
✅ BillingPlanHistory registrado (auto_upgrade, 4 projetos)
✅ Email enviado: "Seu plano foi atualizado para Business"
```

### UC3: Cliente Pro cria 3º projeto (sem upgrade)

**Precondição:** Cliente em Pro (3 projetos), ciclo ativo

**Ação:** Cria projeto 3

**Sistema detecta:**
- Cliente tem 3 projetos agora
- 3 ≤ 3 (limite do Pro)
- **Sem upgrade necessário**

**Resultado:**
```
✅ Projeto criado
⚪ Plano mantém: Pro
⚪ Sem novo invoice
⚪ Sem BillingPlanHistory entry
```

### UC4: Ajuste Business (10 → 5 projetos)

**Cenário:** Temos clientes com Business hoje (com até 10 projetos)

**Ação:** Reduzir limite para 5 projetos

**Para clientes com > 5 projetos:**
- Enviar email: "Seu plano Business mudou para 5 projetos. Você tem 7. Até end of current cycle você mantém acesso."
- Flag no subscription (optional): `hasCachedProjects=true`
- Próximo ciclo: Mesmo que client mantenha 7 projetos, será upgrade automático (não existe plano maior que Business)
- Solução: Contatar vendas ou deletar projetos

---

## 6. Fluxo de Transição (Trial → Pago)

**Contexto:** Cliente saindo do trial e comprando primeiro plano

**Precondição:**
- Cliente em trial com até 1 projeto (limitado)
- Após compra, limite é liberado para o plano escolhido
- Método de pagamento: **Cartão de crédito apenas**

**Fluxo:**
1. Cliente em trial com 1 projeto
2. Contrata plano Starter (1 projeto) via cartão
3. `BillingPlanHistory` criada com reason: `trial_to_paid`
4. Limite segue para 1 (Starter)
5. Invoice criado e enviado via email

**Se tiver criado múltiplos projetos durante trial (não deve, mas...):**
- Assumir que trial foi com limite de 1
- Na compra, contar projetos atuais
- Se > 1, fazer upgrade automático conforme UC1/UC2

---

## 7. Notificações

### 7.1 Email de Auto-Upgrade

**Dispara:** Imediatamente após upgrade

```
Assunto: Seu plano foi atualizado para [NEW_PLAN]

Olá [Name],

Ao criar um novo projeto, detectamos que sua operação 
cresceu além do limite do plano [OLD_PLAN].

Seu novo plano é [NEW_PLAN] com [LIMIT] projetos.

Próxima cobrança: [DATE] por R$ [AMOUNT]

Dúvidas? Responda este email ou acesse seu dashboard.

Abraço,
Whatrack
```

---

## 8. Dashboard - Billing (Novo)

### 8.1 Seção: Card do Plano Ativo (SaaS-style)

Exibe o plano vigente em um card limpo e moderno:

```
┌─────────────────────────────────────────────┐
│ PRO PLAN                    ✓ Ativo          │
├─────────────────────────────────────────────┤
│                                             │
│ Você está usando 2 de 3 projetos inclusos   │
│ ████████░░░ 67%                             │
│                                             │
│ Recursos inclusos:                          │
│ • 3 projetos                                │
│ • 1 WhatsApp por projeto                    │
│ • 1 conta Meta Ads por projeto              │
│ • Dashboard completo                        │
│ • Suporte prioritário                       │
│                                             │
│ R$ 197,00/mês • Próximo ciclo: 01/06/2026  │
│                                             │
│ [Upgrade para Business] [Mudar plano] [...] │
└─────────────────────────────────────────────┘
```

**Detalhes do componente:**
- Badge de status no topo direito ("Ativo", "Pendente", "Vencido")
- Progress bar visual de uso vs limite (apenas para projetos)
- Features em bullet list (limpo, sem "✓" com ícones)
- Info compacta: preço + próximo ciclo em uma linha
- CTAs: Upgrade, Mudar plano, Ver histórico
- Padrão SaaS (Stripe, Slack, GitHub, Vercel)

### 8.2 Seção: Histórico de Mudanças (Futuro)

```
Histórico de Planos:

2026-04-16 — Pro
Auto-upgrade (criou projeto 2)
R$ 197/mês

2026-01-01 — Starter
Criação de conta
R$ 97/mês
```

---

## 9. Restrições e Invariantes

1. **Cada subscription tem um único plano vigente** (não pode ter 2)
2. **BillingPlanHistory nunca é deletado** (auditoria)
3. **Auto-upgrade só acontece ao criar projeto** (não em background)
4. **Upgrade só para cima, nunca para baixo** (sem downgrade automático)
5. **Cliente sempre consegue criar projeto** (não há bloqueio)
6. **Prorating é obrigatório** (sempre aplicar, mesmo que pequeno)

---

## 10. Dados Esperados na Implementação

**Ao fim desta feature:**

- 100% das mudanças de plano registradas em `BillingPlanHistory`
- 100% dos upgrades geram novo invoice
- 0 clientes com "projetos extras" sem corresponder a novo plano
- Dashboard mostra plano corrente com precisão

