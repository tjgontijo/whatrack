import { z } from 'zod'

import { normalizeDocumentNumber, validateDocumentByType } from '@/lib/document/document-identity'
import { companyLookupDataSchema } from '@/schemas/organizations/organization-onboarding'

export const welcomeOnboardingSchema = z
  .object({
    organizationName: z.string().trim().min(2).max(120),
    identityType: z.enum(['pessoa_fisica', 'pessoa_juridica'], {
      message: 'Selecione o tipo fiscal',
    }),
    documentNumber: z.string().min(1, 'CPF/CNPJ é obrigatório'),
    companyLookupData: companyLookupDataSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const documentType = value.identityType === 'pessoa_juridica' ? 'cnpj' : 'cpf'
    const normalizedDocument = normalizeDocumentNumber(value.documentNumber)

    if (!validateDocumentByType(documentType, value.documentNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentNumber'],
        message: documentType === 'cnpj' ? 'CNPJ inválido.' : 'CPF inválido.',
      })
    }

    if (value.identityType !== 'pessoa_juridica' && value.companyLookupData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyLookupData'],
        message: 'Dados de empresa só podem ser enviados para pessoa jurídica.',
      })
    }

    if (!value.companyLookupData || !normalizedDocument) {
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

export type WelcomeOnboardingInput = z.infer<typeof welcomeOnboardingSchema>
