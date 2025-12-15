import { z } from 'zod'
import { isValidCnpjFormat } from '@/lib/mask/cnpj'

/**
 * Schemas Zod para API de Company Data
 */

// Lista de UFs válidas do Brasil
const validUFs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/**
 * Schema para busca de CNPJ
 */
export const lookupCnpjSchema = z.object({
  cnpj: z
    .string()
    .min(1, 'CNPJ é obrigatório')
    .refine((val) => isValidCnpjFormat(val), {
      message: 'CNPJ deve ter 14 dígitos',
    }),
})

export type LookupCnpjInput = z.infer<typeof lookupCnpjSchema>

/**
 * Schema para salvar empresa
 * Requer checkbox de autorização (authorized) como true
 */
export const saveCompanySchema = z.object({
  // Campos obrigatórios
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  cnaeCode: z.string().min(1, 'Código CNAE é obrigatório'),
  cnaeDescription: z.string().min(1, 'Descrição CNAE é obrigatória'),
  municipio: z.string().min(1, 'Município é obrigatório'),
  uf: z.enum(validUFs, { message: 'UF inválida' }),

  // Checkbox de autorização - deve ser true para salvar
  authorized: z
    .boolean()
    .refine((val) => val === true, {
      message: 'É necessário autorizar a consulta de dados',
    }),

  // Campos opcionais (frontend)
  nomeFantasia: z.string().optional(),

  // Campos opcionais (BI)
  tipo: z.string().optional(),
  porte: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  capitalSocial: z.number().optional(),
  situacao: z.string().optional(),
  dataAbertura: z.coerce.date().optional(),
  dataSituacao: z.coerce.date().optional(),
  simplesOptante: z.boolean().optional(),
  simeiOptante: z.boolean().optional(),

  // Endereço
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),

  // Contato
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),

  // JSON fields
  qsa: z.array(z.object({
    nome: z.string(),
    qual: z.string(),
  })).optional(),
  atividadesSecundarias: z.array(z.object({
    code: z.string(),
    text: z.string(),
  })).optional(),
})

export type SaveCompanyInput = z.infer<typeof saveCompanySchema>

/**
 * Schema para resposta da API (empresa salva)
 */
export const companyResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable().optional(),
  cnaeCode: z.string(),
  cnaeDescription: z.string(),
  municipio: z.string(),
  uf: z.string(),

  // BI fields
  tipo: z.string().nullable().optional(),
  porte: z.string().nullable().optional(),
  naturezaJuridica: z.string().nullable().optional(),
  capitalSocial: z.union([z.string(), z.number()]).nullable().optional(),
  situacao: z.string().nullable().optional(),
  dataAbertura: z.string().nullable().optional(),
  dataSituacao: z.string().nullable().optional(),
  simplesOptante: z.boolean().optional(),
  simeiOptante: z.boolean().optional(),

  // Endereço
  logradouro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),

  // Contato
  email: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),

  // JSON fields
  qsa: z.any().nullable().optional(),
  atividadesSecundarias: z.any().nullable().optional(),

  // Compliance
  authorizedByUserId: z.string(),
  authorizedAt: z.string(),

  // Controle
  fetchedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CompanyResponse = z.infer<typeof companyResponseSchema>
