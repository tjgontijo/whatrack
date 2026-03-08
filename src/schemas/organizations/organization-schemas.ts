import { z } from 'zod'
import { companyLookupDataSchema } from './organization-onboarding'

export const updateOrganizationSchema = z
  .object({
    name: z.string().min(2).max(140).optional(),
    organizationType: z.enum(['pessoa_fisica', 'pessoa_juridica']).nullable().optional(),
    documentType: z.enum(['cpf', 'cnpj']).nullable().optional(),
    documentNumber: z.string().max(32).nullable().optional(),
    companyLookupData: companyLookupDataSchema.nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export const organizationAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  resourceType: z.string().optional(),
})

export const updateOrganizationByIdSchema = z
  .object({
    name: z.string().optional(),
    companyName: z.string().optional(),
    onboardingStatus: z.enum(['pending', 'completed', 'skipped']).optional(),
    cpf: z.string().nullable().optional(),
    cnpj: z.string().nullable().optional(),
    razaoSocial: z.string().nullable().optional(),
    nomeFantasia: z.string().nullable().optional(),
    cnaeCode: z.string().nullable().optional(),
    cnaeDescription: z.string().nullable().optional(),
    municipio: z.string().nullable().optional(),
    uf: z.string().nullable().optional(),
    tipo: z.string().nullable().optional(),
    porte: z.string().nullable().optional(),
    naturezaJuridica: z.string().nullable().optional(),
    capitalSocial: z.union([z.number(), z.string()]).nullable().optional(),
    situacao: z.string().nullable().optional(),
    dataAbertura: z.string().nullable().optional(),
    dataSituacao: z.string().nullable().optional(),
    logradouro: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    telefone: z.string().nullable().optional(),
    avgTicket: z.string().nullable().optional(),
    attendantsCount: z.string().nullable().optional(),
    leadsPerDay: z.string().nullable().optional(),
    monthlyRevenue: z.string().nullable().optional(),
    monthlyAdSpend: z.string().nullable().optional(),
    mainAcquisitionChannel: z.string().nullable().optional(),
    qsa: z.unknown().optional(),
    atividadesSecundarias: z.unknown().optional(),
  })
  .passthrough()

export const updateOrganizationAiSettingsSchema = z
  .object({
    aiCopilotActive: z.boolean().optional(),
    aiCopilotInstructions: z.string().optional(),
  })
  .passthrough()

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type OrganizationAuditLogsQueryInput = z.infer<typeof organizationAuditLogsQuerySchema>
export type UpdateOrganizationByIdInput = z.infer<typeof updateOrganizationByIdSchema>
export type UpdateOrganizationAiSettingsInput = z.infer<typeof updateOrganizationAiSettingsSchema>
