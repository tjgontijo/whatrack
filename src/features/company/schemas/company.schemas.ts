import { z } from 'zod'

import { isValidCnpjFormat } from '@/lib/mask/cnpj'

const validUFs = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export const lookupCnpjSchema = z.object({
  cnpj: z
    .string()
    .min(1, 'CNPJ é obrigatório')
    .refine((value) => isValidCnpjFormat(value), {
      message: 'CNPJ deve ter 14 dígitos',
    }),
})

export const saveCompanySchema = z.object({
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  cnaeCode: z.string().min(1, 'Código CNAE é obrigatório'),
  cnaeDescription: z.string().min(1, 'Descrição CNAE é obrigatória'),
  municipio: z.string().min(1, 'Município é obrigatório'),
  uf: z.enum(validUFs, { message: 'UF inválida' }),
  authorized: z.boolean().refine((value) => value === true, {
    message: 'É necessário autorizar a consulta de dados',
  }),
  nomeFantasia: z.string().optional(),
  tipo: z.string().optional(),
  porte: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  capitalSocial: z.number().optional(),
  situacao: z.string().optional(),
  dataAbertura: z.coerce.date().optional(),
  dataSituacao: z.coerce.date().optional(),
  simplesOptante: z.boolean().optional(),
  simeiOptante: z.boolean().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  qsa: z
    .array(
      z.object({
        nome: z.string(),
        qual: z.string(),
      })
    )
    .optional(),
  atividadesSecundarias: z
    .array(
      z.object({
        code: z.string(),
        text: z.string(),
      })
    )
    .optional(),
})

export type LookupCnpjInput = z.infer<typeof lookupCnpjSchema>
export type SaveCompanyInput = z.infer<typeof saveCompanySchema>
