# PRD: Sign-up Unificado com Onboarding e Dados Estratégicos

## Visão Geral

Refatorar o fluxo de sign-up para um processo multi-step que unifica cadastro de usuário, empresa e coleta de dados estratégicos de negócio. O objetivo é capturar informações valiosas para BI desde o primeiro contato, enquanto oferece uma experiência de onboarding completa.

## Problema que Resolve

- Sign-up atual muito simples, perde oportunidade de coletar dados estratégicos
- Onboarding separado pode ser abandonado pelo usuário
- Dados valiosos (CNPJ, porte, segmento, ticket médio) só são coletados depois
- Falta de informações para segmentação e qualificação de clientes

## Objetivos

1. **Aumentar completude de dados**: 80%+ dos usuários com perfil completo
2. **Qualificar leads desde o início**: Saber ticket médio, volume de leads, investimento em ads
3. **Melhorar onboarding**: Experiência guiada em steps claros
4. **Habilitar BI estratégico**: Dados para segmentação, upsell e análise de churn

## Usuários

- **Novos usuários**: Passam pelo fluxo completo de sign-up
- **Dono do SaaS (Admin)**: Acessa dados agregados para BI e tomada de decisão

## Valor

- Dados estratégicos para segmentação de clientes
- Identificação de potencial de upsell
- Métricas calculadas automaticamente (conversão, CPL, CAC, ROAS)
- Melhor experiência de primeiro uso

---

# Core Features

## 1. Sign-up Multi-Step (4 Steps)

### Step 1: Criar sua conta
- Nome completo
- Email
- Senha + Confirmação de senha
- WhatsApp (opcional)

### Step 2: Sua empresa
- Toggle: "Tenho CNPJ" / "Ainda não tenho CNPJ"
- Se tem CNPJ: busca automática na Receita Federal
- Se não tem: nome da empresa manual

### Step 3: Perfil do negócio
- Quantidade de atendentes
- Leads por dia
- Ticket médio
- Faturamento mensal
- Canal principal de vendas
- Plataformas de anúncio (checkbox múltiplo)
- Investimento mensal em ads
- Principal dor/problema

### Step 4: Configurações finais
- Moeda
- Fuso horário
- Aceite de termos
- Como conheceu o WhaTrack

## 2. Busca de CNPJ Integrada

Reutilizar a lógica existente de `src/services/company/receitaws.ts` para buscar dados da empresa automaticamente no Step 2.

## 3. Métricas Calculadas

Com os dados coletados, calcular automaticamente:
- Taxa de conversão estimada
- Custo por Lead (CPL)
- Custo de Aquisição de Cliente (CAC)
- ROAS (Return on Ad Spend)
- Valor do Lead
- Leads por atendente
- Faturamento por atendente

## 4. OWNER_EMAIL para Role de Dono do SaaS

Variável de ambiente `OWNER_EMAIL` que define automaticamente `User.role = 'owner'` para o email configurado.

---

# User Experience

## Personas

### Novo Usuário
- Quer começar a usar o sistema rapidamente
- Precisa de orientação clara sobre o que preencher
- Pode não ter CNPJ ainda (MEI, autônomo)

### Dono do SaaS (Admin)
- Quer dados estratégicos sobre os clientes
- Precisa segmentar por potencial de receita
- Quer identificar oportunidades de upsell

## Key User Flows

### Flow 1: Sign-up com CNPJ
1. Usuário acessa /sign-up
2. Preenche dados pessoais (Step 1)
3. Informa CNPJ → sistema busca na Receita Federal
4. Confirma dados da empresa
5. Preenche perfil do negócio (Step 3)
6. Configura preferências e aceita termos (Step 4)
7. Conta criada → redirecionado para /dashboard

### Flow 2: Sign-up sem CNPJ
1. Usuário acessa /sign-up
2. Preenche dados pessoais (Step 1)
3. Marca "Ainda não tenho CNPJ"
4. Informa nome da empresa manualmente
5. Preenche perfil do negócio (Step 3)
6. Configura preferências e aceita termos (Step 4)
7. Conta criada → redirecionado para /dashboard

### Flow 3: Usuário Owner do SaaS
1. Usuário faz sign-up com email = OWNER_EMAIL
2. Sistema detecta e define User.role = 'owner'
3. Usuário tem acesso a funcionalidades administrativas

## UI/UX Considerations

### Progress Indicator
- Barra de progresso no topo
- Indicador de step atual (1 de 4)
- Botões Voltar/Próximo

### Validação em Tempo Real
- Validação de email único
- Validação de força de senha
- Confirmação de senha deve coincidir
- CNPJ com máscara e validação

### Responsividade
- Mobile-first design
- Steps empilhados em mobile
- Teclado numérico para campos de telefone/CNPJ

---

# Technical Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  /sign-up (multi-step)                                       │
│    ├── Step1AccountForm                                      │
│    ├── Step2CompanyForm                                      │
│    ├── Step3BusinessProfileForm                              │
│    └── Step4SettingsForm                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  POST /api/v1/auth/sign-up-complete                          │
│  GET  /api/v1/company/lookup?cnpj=xxx                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services                                  │
├─────────────────────────────────────────────────────────────┤
│  SignUpService                                               │
│    ├── Better Auth (criar usuário)                           │
│    ├── OrganizationService (criar org + member)              │
│    ├── CompanyService (salvar dados CNPJ)                    │
│    └── MetricsCalculator (calcular métricas)                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Novos Campos em Organization (Prisma Schema)

```prisma
model Organization {
  // ... campos existentes ...

  // ============================================
  // BUSINESS PROFILE (Step 3)
  // ============================================
  
  // Tamanho da operação
  attendantsCount    String?  // '1', '2-5', '6-10', '11-20', '21-50', '50+'
  
  // Volume de leads
  leadsPerDay        String?  // '1-5', '6-10', '11-20', '21-50', '51-100', '100+'
  
  // Potencial de receita
  avgTicket          String?  // 'ate_500', '500_1500', '1500_5000', '5000_15000', '15000+'
  monthlyRevenue     String?  // 'ate_10k', '10k_50k', '50k_100k', '100k_500k', '500k+'
  
  // Canal principal
  mainChannel        String?  // 'whatsapp', 'instagram', 'telefone', 'email', 'site'
  
  // Plataformas de anúncio (JSON array)
  adPlatforms        Json?    // { meta: true, google: true, tiktok: false, linkedin: false, youtube: false }
  
  // Investimento em Ads
  monthlyAdSpend     String?  // 'nenhum', 'ate_1k', '1k_5k', '5k_20k', '20k_50k', '50k+'
  
  // Dor principal
  mainPainPoint      String?  // 'leads_perdidos', 'sem_metricas', 'equipe_desorganizada', 'roi_desconhecido', 'outro'
  
  // Origem do lead
  referralSource     String?  // 'google', 'instagram', 'indicacao', 'youtube', 'linkedin', 'outro'

  // ============================================
  // MÉTRICAS CALCULADAS
  // ============================================
  
  estimatedConversionRate  Float?   // Taxa de conversão estimada (%)
  estimatedCPL             Float?   // Custo por lead (R$)
  estimatedCAC             Float?   // Custo de aquisição de cliente (R$)
  estimatedROAS            Float?   // Retorno sobre ads (x)
  estimatedLeadValue       Float?   // Valor do lead (R$)
  leadsPerAttendant        Float?   // Leads por atendente
  revenuePerAttendant      Float?   // Faturamento por atendente (R$)
}
```

### Atualização em User

```prisma
model User {
  // ... campos existentes ...
  
  role  UserRole  @default(user)  // owner, admin, user
}

enum UserRole {
  owner   // Dono do SaaS (definido por OWNER_EMAIL)
  admin   // Admin do sistema
  user    // Usuário comum
}
```

## APIs and Integrations

### Nova API: Sign-up Completo

```
POST /api/v1/auth/sign-up-complete
```

**Request:**
```typescript
interface SignUpCompleteRequest {
  // Step 1: Account
  name: string
  email: string
  password: string
  phone?: string
  
  // Step 2: Company
  hasCnpj: boolean
  cnpj?: string           // Se hasCnpj = true
  companyName?: string    // Se hasCnpj = false
  
  // Step 3: Business Profile
  attendantsCount: string
  leadsPerDay: string
  avgTicket: string
  monthlyRevenue: string
  mainChannel: string
  adPlatforms: {
    meta: boolean
    google: boolean
    tiktok: boolean
    linkedin: boolean
    youtube: boolean
  }
  monthlyAdSpend?: string
  mainPainPoint: string
  
  // Step 4: Settings
  currency: string
  timezone: string
  acceptTerms: boolean
  referralSource: string
}
```

**Response 201:**
```json
{
  "user": {
    "id": "clx...",
    "name": "João Silva",
    "email": "joao@empresa.com",
    "role": "user"
  },
  "organization": {
    "id": "clx...",
    "name": "Empresa LTDA",
    "slug": "empresa-ltda"
  },
  "metrics": {
    "estimatedConversionRate": 12.5,
    "estimatedCPL": 16.67,
    "estimatedCAC": 133.33,
    "estimatedROAS": 15.0
  }
}
```

### API Existente: Lookup CNPJ

Reutilizar `GET /api/v1/company/lookup?cnpj={cnpj}`

## Environment Variables

```env
# Email do dono do SaaS - recebe role 'owner' automaticamente
OWNER_EMAIL=tjgontijo@gmail.com
```

---

# Frontend Components

## Estrutura de Arquivos

```
src/
├── app/
│   └── (auth)/
│       └── sign-up/
│           ├── page.tsx              # Página principal multi-step
│           └── components/
│               ├── SignUpWizard.tsx  # Orquestrador dos steps
│               ├── Step1Account.tsx  # Dados pessoais
│               ├── Step2Company.tsx  # Dados da empresa
│               ├── Step3Business.tsx # Perfil do negócio
│               ├── Step4Settings.tsx # Configurações
│               └── ProgressBar.tsx   # Indicador de progresso
├── lib/
│   └── validations/
│       └── sign-up.ts               # Schemas Zod
└── services/
    └── sign-up/
        └── metrics-calculator.ts    # Cálculo de métricas
```

## Schema de Validação (Zod)

```typescript
// src/lib/validations/sign-up.ts

import { z } from 'zod'

export const step1Schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export const step2Schema = z.object({
  hasCnpj: z.boolean(),
  cnpj: z.string().optional(),
  companyName: z.string().optional(),
}).refine((data) => {
  if (data.hasCnpj) {
    return data.cnpj && data.cnpj.replace(/\D/g, '').length === 14
  }
  return data.companyName && data.companyName.length >= 2
}, {
  message: 'Informe o CNPJ ou nome da empresa',
  path: ['cnpj'],
})

export const step3Schema = z.object({
  attendantsCount: z.enum(['1', '2-5', '6-10', '11-20', '21-50', '50+']),
  leadsPerDay: z.enum(['1-5', '6-10', '11-20', '21-50', '51-100', '100+']),
  avgTicket: z.enum(['ate_500', '500_1500', '1500_5000', '5000_15000', '15000+']),
  monthlyRevenue: z.enum(['ate_10k', '10k_50k', '50k_100k', '100k_500k', '500k+']),
  mainChannel: z.enum(['whatsapp', 'instagram', 'telefone', 'email', 'site']),
  adPlatforms: z.object({
    meta: z.boolean(),
    google: z.boolean(),
    tiktok: z.boolean(),
    linkedin: z.boolean(),
    youtube: z.boolean(),
  }),
  monthlyAdSpend: z.enum(['nenhum', 'ate_1k', '1k_5k', '5k_20k', '20k_50k', '50k+']).optional(),
  mainPainPoint: z.enum([
    'leads_perdidos',
    'sem_metricas',
    'equipe_desorganizada',
    'roi_desconhecido',
    'outro'
  ]),
})

export const step4Schema = z.object({
  currency: z.enum(['BRL', 'USD', 'EUR']),
  timezone: z.string().min(1),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos' }),
  }),
  referralSource: z.enum(['google', 'instagram', 'indicacao', 'youtube', 'linkedin', 'outro']),
})

export const signUpCompleteSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)

export type SignUpCompleteData = z.infer<typeof signUpCompleteSchema>
```

## Calculadora de Métricas

```typescript
// src/services/sign-up/metrics-calculator.ts

interface BusinessInputs {
  leadsPerDay: string
  avgTicket: string
  monthlyRevenue: string
  attendantsCount: string
  monthlyAdSpend?: string
}

interface CalculatedMetrics {
  estimatedConversionRate: number | null
  estimatedCPL: number | null
  estimatedCAC: number | null
  estimatedROAS: number | null
  estimatedLeadValue: number | null
  leadsPerAttendant: number | null
  revenuePerAttendant: number | null
}

// Mapas de conversão de ranges para valores médios
const LEADS_PER_DAY_MAP: Record<string, number> = {
  '1-5': 3,
  '6-10': 8,
  '11-20': 15,
  '21-50': 35,
  '51-100': 75,
  '100+': 150,
}

const AVG_TICKET_MAP: Record<string, number> = {
  'ate_500': 250,
  '500_1500': 1000,
  '1500_5000': 3250,
  '5000_15000': 10000,
  '15000+': 25000,
}

const MONTHLY_REVENUE_MAP: Record<string, number> = {
  'ate_10k': 5000,
  '10k_50k': 30000,
  '50k_100k': 75000,
  '100k_500k': 300000,
  '500k+': 750000,
}

const ATTENDANTS_MAP: Record<string, number> = {
  '1': 1,
  '2-5': 3,
  '6-10': 8,
  '11-20': 15,
  '21-50': 35,
  '50+': 75,
}

const AD_SPEND_MAP: Record<string, number> = {
  'nenhum': 0,
  'ate_1k': 500,
  '1k_5k': 3000,
  '5k_20k': 12500,
  '20k_50k': 35000,
  '50k+': 75000,
}

export function calculateMetrics(inputs: BusinessInputs): CalculatedMetrics {
  const leadsPerDay = LEADS_PER_DAY_MAP[inputs.leadsPerDay] || 0
  const avgTicket = AVG_TICKET_MAP[inputs.avgTicket] || 0
  const monthlyRevenue = MONTHLY_REVENUE_MAP[inputs.monthlyRevenue] || 0
  const attendants = ATTENDANTS_MAP[inputs.attendantsCount] || 1
  const adSpend = inputs.monthlyAdSpend ? AD_SPEND_MAP[inputs.monthlyAdSpend] || 0 : 0

  const leadsPerMonth = leadsPerDay * 30
  const salesPerMonth = avgTicket > 0 ? monthlyRevenue / avgTicket : 0

  // Taxa de conversão = Vendas / Leads
  const conversionRate = leadsPerMonth > 0 
    ? (salesPerMonth / leadsPerMonth) * 100 
    : null

  // CPL = Investimento / Leads
  const cpl = leadsPerMonth > 0 && adSpend > 0 
    ? adSpend / leadsPerMonth 
    : null

  // CAC = Investimento / Vendas
  const cac = salesPerMonth > 0 && adSpend > 0 
    ? adSpend / salesPerMonth 
    : null

  // ROAS = Faturamento / Investimento
  const roas = adSpend > 0 
    ? monthlyRevenue / adSpend 
    : null

  // Valor do Lead = Ticket * Conversão
  const leadValue = conversionRate !== null 
    ? avgTicket * (conversionRate / 100) 
    : null

  // Leads por atendente
  const leadsPerAttendant = leadsPerMonth / attendants

  // Faturamento por atendente
  const revenuePerAttendant = monthlyRevenue / attendants

  return {
    estimatedConversionRate: conversionRate ? Math.round(conversionRate * 100) / 100 : null,
    estimatedCPL: cpl ? Math.round(cpl * 100) / 100 : null,
    estimatedCAC: cac ? Math.round(cac * 100) / 100 : null,
    estimatedROAS: roas ? Math.round(roas * 100) / 100 : null,
    estimatedLeadValue: leadValue ? Math.round(leadValue * 100) / 100 : null,
    leadsPerAttendant: Math.round(leadsPerAttendant * 100) / 100,
    revenuePerAttendant: Math.round(revenuePerAttendant * 100) / 100,
  }
}
```

---

# UX Flow Visual

## Step 1: Criar sua conta

```
┌─────────────────────────────────────────────────────────────┐
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Passo 1 de 4             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Criar sua conta                                            │
│  Comece gratuitamente. Não é necessário cartão.             │
│                                                             │
│  Nome completo                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ João Silva                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Email                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ joao@empresa.com                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Senha                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Confirmar senha                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  WhatsApp (opcional)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ (11) 99999-9999                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                          [Próximo →]        │
│                                                             │
│  Já tem uma conta? Fazer login                              │
└─────────────────────────────────────────────────────────────┘
```

## Step 2: Sua empresa

```
┌─────────────────────────────────────────────────────────────┐
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░  Passo 2 de 4             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sua empresa                                                │
│  Vamos buscar os dados automaticamente                      │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐      │
│  │ ● Tenho CNPJ          │  │ ○ Ainda não tenho     │      │
│  └───────────────────────┘  └───────────────────────┘      │
│                                                             │
│  CNPJ                                                       │
│  ┌─────────────────────────────────────┐  ┌──────────────┐ │
│  │ 44.935.969/0001-20                  │  │   Buscar     │ │
│  └─────────────────────────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─ Dados encontrados ─────────────────────────────────┐   │
│  │                                                      │   │
│  │  Razão Social                                        │   │
│  │  CLINICA ESTETICA BELLA LTDA                        │   │
│  │                                                      │   │
│  │  Nome Fantasia                                       │   │
│  │  Bella Estética                                      │   │
│  │                                                      │   │
│  │  CNAE                                                │   │
│  │  96.02-5/02 - Atividades de estética e cuidados     │   │
│  │                                                      │   │
│  │  Porte                                               │   │
│  │  MICRO EMPRESA                                       │   │
│  │                                                      │   │
│  │  Localização                                         │   │
│  │  São Paulo / SP                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│                                [← Voltar] [Próximo →]       │
└─────────────────────────────────────────────────────────────┘
```

## Step 3: Perfil do negócio

```
┌─────────────────────────────────────────────────────────────┐
│  ████████████░░░░░░░░░░░░░░░░░░░░  Passo 3 de 4             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Perfil do seu negócio                                      │
│  Essas informações nos ajudam a personalizar sua experiência│
│                                                             │
│  Quantos atendentes você tem?                               │
│  ┌────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌────┐            │
│  │Só eu│ │2-5 │ │6-10 │ │11-20 │ │21-50 │ │50+ │            │
│  └────┘ └────┘ └─────┘ └──────┘ └──────┘ └────┘            │
│                                                             │
│  Quantos leads você recebe por dia?                         │
│  ┌────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌───────┐ ┌─────┐        │
│  │1-5 │ │6-10 │ │11-20 │ │21-50 │ │51-100 │ │100+ │        │
│  └────┘ └─────┘ └──────┘ └──────┘ └───────┘ └─────┘        │
│                                                             │
│  Qual seu ticket médio?                                     │
│  ┌─────────┐ ┌───────────┐ ┌─────────────┐ ┌────────────┐  │
│  │Até R$500│ │R$500-1.500│ │R$1.500-5.000│ │R$5.000-15k │  │
│  └─────────┘ └───────────┘ └─────────────┘ └────────────┘  │
│  ┌──────────┐                                               │
│  │R$15.000+ │                                               │
│  └──────────┘                                               │
│                                                             │
│  Faturamento mensal aproximado?                             │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐ │
│  │Até R$10k│ │R$10k-50k │ │R$50k-100k │ │R$100k-500k     │ │
│  └─────────┘ └──────────┘ └───────────┘ └────────────────┘ │
│  ┌──────────┐                                               │
│  │R$500k+   │                                               │
│  └──────────┘                                               │
│                                                             │
│  Principal canal de vendas?                                 │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ ┌──────┐   │
│  │WhatsApp │ │Instagram │ │Telefone │ │Email  │ │Site  │   │
│  └─────────┘ └──────────┘ └─────────┘ └───────┘ └──────┘   │
│                                                             │
│  Em quais plataformas você anuncia? (selecione todas)       │
│  ☑ Meta (Facebook/Instagram)                                │
│  ☑ Google Ads                                               │
│  ☐ TikTok Ads                                               │
│  ☐ LinkedIn Ads                                             │
│  ☐ YouTube Ads                                              │
│                                                             │
│  Investimento mensal em anúncios?                           │
│  ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐  │
│  │Nenhum   │ │Até R$1k│ │R$1k-5k │ │R$5k-20k │ │R$20k+  │  │
│  └─────────┘ └────────┘ └────────┘ └─────────┘ └────────┘  │
│                                                             │
│  Qual sua maior dor hoje?                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▼ Selecione...                                       │   │
│  │   • Perco leads por demora no atendimento            │   │
│  │   • Não sei de onde vêm minhas vendas                │   │
│  │   • Minha equipe não segue processos                 │   │
│  │   • Não sei o ROI dos meus anúncios                  │   │
│  │   • Outro                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                [← Voltar] [Próximo →]       │
└─────────────────────────────────────────────────────────────┘
```

## Step 4: Configurações

```
┌─────────────────────────────────────────────────────────────┐
│  ████████████████░░░░░░░░░░░░░░░░  Passo 4 de 4             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quase lá!                                                  │
│  Últimas configurações para começar                         │
│                                                             │
│  Moeda                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Real (R$)                                        ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Fuso horário                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Brasília (GMT-3)                                 ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Como conheceu o WhaTrack?                                  │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────┐  │
│  │Google  │ │Instagram │ │Indicação │ │YouTube  │ │Outro│  │
│  └────────┘ └──────────┘ └──────────┘ └─────────┘ └─────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Aceito os termos de uso e política de privacidade │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                [← Voltar] [Criar conta]     │
└─────────────────────────────────────────────────────────────┘
```

---

# Development Roadmap

## Phase 1: Foundation

### 1.1 Database Schema
- Adicionar campos de business profile em Organization
- Adicionar campos de métricas calculadas
- Gerar migration

### 1.2 Validações Zod
- Criar schemas para cada step
- Schema completo para sign-up

### 1.3 Calculadora de Métricas
- Implementar função de cálculo
- Testes unitários

## Phase 2: Backend

### 2.1 API Sign-up Completo
- Endpoint POST /api/v1/auth/sign-up-complete
- Transação atômica: User + Organization + Member + Company
- Verificação de OWNER_EMAIL para role

### 2.2 Hook Better Auth
- Adicionar verificação de OWNER_EMAIL no afterCreate

## Phase 3: Frontend

### 3.1 Componentes de Step
- Step1Account (com confirmação de senha)
- Step2Company (com busca CNPJ)
- Step3Business (com checkboxes de plataformas)
- Step4Settings

### 3.2 Wizard Orquestrador
- Gerenciamento de estado entre steps
- Validação por step
- Progress bar

### 3.3 Integração
- Chamada à API de sign-up
- Tratamento de erros
- Redirect para dashboard

## Phase 4: Polish

### 4.1 UX Improvements
- Animações de transição entre steps
- Loading states
- Feedback visual de validação

### 4.2 Testes
- Testes E2E do fluxo completo
- Testes de integração da API

---

# Logical Dependency Chain

```
1. Database Schema (migration)
   └── Base para tudo

2. Validações Zod
   └── Necessário para frontend e backend
   └── Depende de: 1

3. Calculadora de Métricas
   └── Pode ser desenvolvido em paralelo
   └── Depende de: 1

4. API Sign-up Completo
   └── Core do backend
   └── Depende de: 1, 2, 3

5. Hook OWNER_EMAIL
   └── Verificação de role
   └── Depende de: 4

6. Componentes de Step (frontend)
   └── Pode iniciar em paralelo com backend
   └── Depende de: 2

7. Wizard Orquestrador
   └── Junta todos os steps
   └── Depende de: 6

8. Integração Frontend-Backend
   └── Conecta tudo
   └── Depende de: 4, 7

9. Testes e Polish
   └── Finalização
   └── Depende de: 8
```

---

# Risks and Mitigations

## Technical Challenges

### Risk: Complexidade do formulário multi-step
- **Mitigação**: Usar react-hook-form com mode: 'onChange' para validação em tempo real
- **Mitigação**: Salvar estado em localStorage para recuperar em caso de refresh

### Risk: Rate limit da ReceitaWS
- **Mitigação**: Debounce na busca de CNPJ
- **Mitigação**: Cache de resultados já buscados
- **Mitigação**: Mensagem clara quando rate limited

### Risk: Abandono no meio do fluxo
- **Mitigação**: Salvar progresso parcial
- **Mitigação**: Email de recuperação de cadastro incompleto (futuro)

## MVP Definition

O MVP inclui:
1. ✅ 4 steps funcionais
2. ✅ Busca de CNPJ integrada
3. ✅ Coleta de dados de business profile
4. ✅ Cálculo de métricas
5. ✅ OWNER_EMAIL para role de owner

NÃO inclui no MVP:
- Recuperação de cadastro incompleto
- Email de boas-vindas personalizado
- A/B testing de campos

---

# Appendix

## Opções de Campos

### attendantsCount
| Valor | Label |
|-------|-------|
| 1 | Só eu |
| 2-5 | 2 a 5 |
| 6-10 | 6 a 10 |
| 11-20 | 11 a 20 |
| 21-50 | 21 a 50 |
| 50+ | Mais de 50 |

### leadsPerDay
| Valor | Label |
|-------|-------|
| 1-5 | 1 a 5 |
| 6-10 | 6 a 10 |
| 11-20 | 11 a 20 |
| 21-50 | 21 a 50 |
| 51-100 | 51 a 100 |
| 100+ | Mais de 100 |

### avgTicket
| Valor | Label |
|-------|-------|
| ate_500 | Até R$ 500 |
| 500_1500 | R$ 500 - R$ 1.500 |
| 1500_5000 | R$ 1.500 - R$ 5.000 |
| 5000_15000 | R$ 5.000 - R$ 15.000 |
| 15000+ | Acima de R$ 15.000 |

### monthlyRevenue
| Valor | Label |
|-------|-------|
| ate_10k | Até R$ 10.000 |
| 10k_50k | R$ 10.000 - R$ 50.000 |
| 50k_100k | R$ 50.000 - R$ 100.000 |
| 100k_500k | R$ 100.000 - R$ 500.000 |
| 500k+ | Acima de R$ 500.000 |

### mainChannel
| Valor | Label |
|-------|-------|
| whatsapp | WhatsApp |
| instagram | Instagram |
| telefone | Telefone |
| email | Email |
| site | Site |

### monthlyAdSpend
| Valor | Label |
|-------|-------|
| nenhum | Não invisto |
| ate_1k | Até R$ 1.000 |
| 1k_5k | R$ 1.000 - R$ 5.000 |
| 5k_20k | R$ 5.000 - R$ 20.000 |
| 20k_50k | R$ 20.000 - R$ 50.000 |
| 50k+ | Acima de R$ 50.000 |

### mainPainPoint
| Valor | Label |
|-------|-------|
| leads_perdidos | Perco leads por demora no atendimento |
| sem_metricas | Não sei de onde vêm minhas vendas |
| equipe_desorganizada | Minha equipe não segue processos |
| roi_desconhecido | Não sei o ROI dos meus anúncios |
| outro | Outro |

### referralSource
| Valor | Label |
|-------|-------|
| google | Google |
| instagram | Instagram |
| indicacao | Indicação |
| youtube | YouTube |
| linkedin | LinkedIn |
| outro | Outro |
