import { z } from 'zod'

import { validateCnpj } from '@/lib/mask/cnpj'

function normalizeDocumentNumber(value: string): string {
  return value.replace(/\D/g, '')
}

function validateCpf(value: string): boolean {
  const digits = normalizeDocumentNumber(value)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i)
  }

  let firstCheck = (sum * 10) % 11
  if (firstCheck === 10) firstCheck = 0
  if (firstCheck !== Number(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i)
  }

  let secondCheck = (sum * 10) % 11
  if (secondCheck === 10) secondCheck = 0

  return secondCheck === Number(digits[10])
}

const companyLookupDataSchema = z.object({
  cnpj: z.string().min(14),
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional(),
  cnaeCode: z.string().optional(),
  cnaeDescription: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  tipo: z.string().optional(),
  porte: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  capitalSocial: z.number().optional(),
  situacao: z.string().optional(),
  dataAbertura: z.string().optional(),
  dataSituacao: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  qsa: z.array(z.object({ nome: z.string(), qual: z.string() })).optional(),
  atividadesSecundarias: z.array(z.object({ code: z.string(), text: z.string() })).optional(),
})

const individualSchema = z.object({
  entityType: z.literal('individual'),
  fullName: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  documentNumber: z.string().min(1, 'CPF é obrigatório'),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
})

const companySchema = z.object({
  entityType: z.literal('company'),
  documentNumber: z.string().min(1, 'CNPJ é obrigatório'),
  companyLookupData: companyLookupDataSchema.optional(),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
})

export const organizationOnboardingSchema = z
  .discriminatedUnion('entityType', [individualSchema, companySchema])
  .superRefine((value, ctx) => {
    const normalizedDocument = normalizeDocumentNumber(value.documentNumber)

    if (value.entityType === 'individual') {
      if (!validateCpf(normalizedDocument)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['documentNumber'],
          message: 'CPF inválido.',
        })
      }
      return
    }

    if (!validateCnpj(normalizedDocument)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentNumber'],
        message: 'CNPJ inválido.',
      })
    }

    if (!value.companyLookupData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyLookupData'],
        message: 'Dados da Receita Federal são obrigatórios para PJ.',
      })
      return
    }

    const lookupCnpj = normalizeDocumentNumber(value.companyLookupData.cnpj)
    if (lookupCnpj !== normalizedDocument) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyLookupData', 'cnpj'],
        message: 'CNPJ consultado difere do documento informado.',
      })
    }
  })

export type OrganizationOnboardingInput = z.infer<typeof organizationOnboardingSchema>

export function normalizeOnboardingDocument(value: string): string {
  return normalizeDocumentNumber(value)
}
