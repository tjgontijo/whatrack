import { z } from 'zod'

// ============================================
// SIGN-UP SCHEMA (Simplificado)
// ============================================
export const signUpSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z
    .string()
    .email('Email inválido'),
  phone: z
    .string()
    .min(14, 'WhatsApp inválido') // (11) 99999-9999 = 15 chars, mínimo (11) 9999-9999 = 14
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Formato inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export type SignUpData = z.infer<typeof signUpSchema>

// ============================================
// ONBOARDING SCHEMAS (Steps no Dashboard)
// ============================================

// ============================================
// STEP 2: COMPANY
// ============================================
export const step2Schema = z.object({
  hasCnpj: z.boolean(),
  cnpj: z.string().optional(),
  companyName: z.string().optional(),
  // Dados preenchidos automaticamente via ReceitaWS
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cnaeCode: z.string().optional(),
  cnaeDescription: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  porte: z.string().optional(),
}).refine((data) => {
  if (data.hasCnpj) {
    return data.cnpj && data.cnpj.replace(/\D/g, '').length === 14
  }
  return data.companyName && data.companyName.length >= 2
}, {
  message: 'Informe o CNPJ ou nome da empresa',
  path: ['cnpj'],
})

export type Step2Data = z.infer<typeof step2Schema>

// ============================================
// STEP 3: BUSINESS PROFILE
// ============================================
export const attendantsOptions = [
  { value: '1', label: 'Só eu' },
  { value: '2-5', label: '2 a 5' },
  { value: '6-10', label: '6 a 10' },
  { value: '11-20', label: '11 a 20' },
  { value: '21-50', label: '21 a 50' },
  { value: '50+', label: 'Mais de 50' },
] as const

export const leadsPerDayOptions = [
  { value: '1-5', label: '1 a 5' },
  { value: '6-10', label: '6 a 10' },
  { value: '11-20', label: '11 a 20' },
  { value: '21-50', label: '21 a 50' },
  { value: '51-100', label: '51 a 100' },
  { value: '100+', label: 'Mais de 100' },
] as const

export const avgTicketOptions = [
  { value: 'ate_500', label: 'Até R$ 500' },
  { value: '500_1500', label: 'R$ 500 - R$ 1.500' },
  { value: '1500_5000', label: 'R$ 1.500 - R$ 5.000' },
  { value: '5000_15000', label: 'R$ 5.000 - R$ 15.000' },
  { value: '15000+', label: 'Acima de R$ 15.000' },
] as const

export const monthlyRevenueOptions = [
  { value: 'ate_10k', label: 'Até R$ 10.000' },
  { value: '10k_50k', label: 'R$ 10.000 - R$ 50.000' },
  { value: '50k_100k', label: 'R$ 50.000 - R$ 100.000' },
  { value: '100k_500k', label: 'R$ 100.000 - R$ 500.000' },
  { value: '500k+', label: 'Acima de R$ 500.000' },
] as const

export const mainChannelOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'site', label: 'Site' },
] as const

export const adPlatformOptions = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
  { value: 'youtube', label: 'YouTube Ads' },
] as const

export const monthlyAdSpendOptions = [
  { value: 'nenhum', label: 'Não invisto' },
  { value: 'ate_1k', label: 'Até R$ 1.000' },
  { value: '1k_5k', label: 'R$ 1.000 - R$ 5.000' },
  { value: '5k_20k', label: 'R$ 5.000 - R$ 20.000' },
  { value: '20k_50k', label: 'R$ 20.000 - R$ 50.000' },
  { value: '50k+', label: 'Acima de R$ 50.000' },
] as const

export const mainPainPointOptions = [
  { value: 'leads_perdidos', label: 'Perco leads por demora no atendimento' },
  { value: 'sem_metricas', label: 'Não sei de onde vêm minhas vendas' },
  { value: 'equipe_desorganizada', label: 'Minha equipe não segue processos' },
  { value: 'roi_desconhecido', label: 'Não sei o ROI dos meus anúncios' },
  { value: 'outro', label: 'Outro' },
] as const

export const step3Schema = z.object({
  attendantsCount: z.string().min(1, 'Selecione uma opção'),
  leadsPerDay: z.string().min(1, 'Selecione uma opção'),
  avgTicket: z.string().min(1, 'Selecione uma opção'),
  monthlyRevenue: z.string().min(1, 'Selecione uma opção'),
  mainChannel: z.string().min(1, 'Selecione uma opção'),
  adPlatforms: z.object({
    meta: z.boolean(),
    google: z.boolean(),
    tiktok: z.boolean(),
    linkedin: z.boolean(),
    youtube: z.boolean(),
  }),
  monthlyAdSpend: z.string().optional(),
  mainPainPoint: z.string().min(1, 'Selecione uma opção'),
})

export type Step3Data = z.infer<typeof step3Schema>

// ============================================
// STEP 4: SETTINGS
// ============================================
export const referralSourceOptions = [
  { value: 'google', label: 'Google' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'outro', label: 'Outro' },
] as const

export const currencyOptions = [
  { value: 'BRL', label: 'Real (R$)' },
  { value: 'USD', label: 'Dólar (US$)' },
  { value: 'EUR', label: 'Euro (€)' },
] as const

export const timezoneOptions = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
] as const

export const step4Schema = z.object({
  currency: z.string().min(1, 'Selecione uma moeda'),
  timezone: z.string().min(1, 'Selecione um fuso horário'),
  acceptTerms: z.literal(true, 'Você deve aceitar os termos'),
  referralSource: z.string().min(1, 'Selecione uma opção'),
})

export type Step4Data = z.infer<typeof step4Schema>

// ============================================
// COMPLETE SIGN-UP SCHEMA
// ============================================
export const signUpCompleteSchema = z.object({
  // Step 1
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
  phone: z.string().optional(),
  
  // Step 2
  hasCnpj: z.boolean().optional(),
  cnpj: z.string().optional(),
  companyName: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cnaeCode: z.string().optional(),
  cnaeDescription: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  porte: z.string().optional(),
  
  // Step 3
  attendantsCount: z.string(),
  leadsPerDay: z.string(),
  avgTicket: z.string(),
  monthlyRevenue: z.string(),
  mainChannel: z.string(),
  adPlatforms: z.object({
    meta: z.boolean(),
    google: z.boolean(),
    tiktok: z.boolean(),
    linkedin: z.boolean(),
    youtube: z.boolean(),
  }),
  monthlyAdSpend: z.string().optional(),
  mainPainPoint: z.string(),
  
  // Step 4
  currency: z.string(),
  timezone: z.string(),
  acceptTerms: z.literal(true, 'Você deve aceitar os termos'),
  referralSource: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export type SignUpCompleteData = z.infer<typeof signUpCompleteSchema>
