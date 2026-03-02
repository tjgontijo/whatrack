# Investigação de Erro Billing - 2026-03-01 (Part 3)

## Status Atual
✅ **abc_dev_ funciona sim em produção** - o SDK é agnóstico ao ambiente

## O Problema Real

A chave `abc_dev_WRrZNEhf5Ke4WXZXC4TsfMGy` **deveria funcionar** em qualquer lugar (localhost, staging, produção).

Erro do servidor:
```
"AbacatePay checkout creation failed: 3 attempts were performed, all failed"
```

Isso significa que:
1. ✅ O SDK conseguiu inicializar
2. ✅ O SDK conseguiu fazer requisições (3 tentativas)
3. ❌ **TODAS as 3 tentativas falharam** - indicando erro na API do AbacatePay

## Possíveis Causas Reais

### 1. **Parâmetros Inválidos**
- `customerId` deve ser um UUID válido ou identificador da conta
- `externalId` formato incorreto
- `amount` em centavos (seu código está correto: `monthlyPrice` em centavos)
- Campos obrigatórios faltando

### 2. **Configuração Incorreta da Chave**
- A chave `abc_dev_...` pode estar **expirada ou revogada**
- A chave pode não ter **permissões para criar subscriptions**
- A chave está sendo enviada corretamente nos headers

### 3. **Rate Limit ou Throttle**
- AbacatePay pode estar bloqueando requisições repetitivas
- Limite de requisições por minuto atingido

## Próximos Passos para Debug

### Step 1: Verificar logs do Vercel
```bash
vercel logs --follow
```

Quando alguém tenta fazer checkout, você verá:
```json
{
  "[AbacatePay] Subscription creation response": { response: {...} },
  "[AbacatePay] Subscription creation failed": { response: {...} }
}
```

### Step 2: Testar a Chave Localmente

```bash
npm run dev
# Em outro terminal:
curl -X POST http://localhost:3000/api/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-session>" \
  -d '{"planType":"starter"}'
```

Os logs aparecerão no console do Next.js mostrando exatamente qual é o erro do AbacatePay.

### Step 3: Validar Estrutura Esperada pelo SDK

O SDK v2 espera:
```typescript
{
  amount: number,           // ✓ 9700 (R$ 97 em centavos)
  name: string,             // ✓ "WhaTrack Starter"
  description: string,      // ✓ "Para começar..."
  externalId: string,       // ✓ "org-{orgId}"
  method: "card" | "pix",   // ✓ "card"
  frequency: {
    cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "DAILY",  // ✓ "MONTHLY"
    dayOfProcessing: 1-31,   // ✓ 1
  },
  customerId: string,       // ? PODE SER O PROBLEMA
  retryPolicy: {
    maxRetry: number,       // ✓ 3
    retryEvery: number,     // ✓ 3
  },
}
```

## O Campo Suspeito: `customerId`

Você está usando `customerId: params.organizationId`, que é um UUID do seu banco.

**Pergunte-se:**
- O AbacatePay aceita qualquer string como customerId?
- Ou precisa ser um customer criado anteriormente na AbacatePay?

Se for a segunda opção, você precisa:
1. Criar um customer primeiro via `clients.create()`
2. Depois criar a subscription com aquele customer

## Solução Temporária: Remover customerId

Se `customerId` é obrigatório mas você não criou o customer:

```typescript
const subscription = await this.client.subscriptions.create({
  amount: planConfig.monthlyPrice,
  name: planConfig.name,
  description: planConfig.description,
  externalId: `org-${params.organizationId}`,
  method: 'card',
  frequency: {
    cycle: 'MONTHLY',
    dayOfProcessing: 1,
  },
  // ❌ Remova isto:
  // customerId: params.organizationId,
  retryPolicy: {
    maxRetry: 3,
    retryEvery: 3,
  },
} as any)
```

## Próxima Ação

**Faça deploy com as logs adicionadas:**

```bash
git push
# Espere o Vercel fazer deploy
```

Depois:
1. Tente fazer checkout na produção
2. Veja os logs no `vercel logs --follow`
3. Compartilhe comigo os logs de erro do AbacatePay

Com os logs, vamos ver exatamente qual é o problema!

---

**Status**: 🔍 Investigação em progresso - aguardando logs de erro da produção
