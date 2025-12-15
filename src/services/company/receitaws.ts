import { stripCnpj } from '@/lib/mask/cnpj'

/**
 * Service para consulta de dados de CNPJ na API ReceitaWS
 * Documentação: https://receitaws.com.br/api
 *
 * Limite gratuito: 3 consultas/minuto
 */

const RECEITAWS_BASE_URL = 'https://receitaws.com.br/v1/cnpj'

export type ReceitaWsErrorCode =
  | 'INVALID_CNPJ'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'API_ERROR'

export class ReceitaWsError extends Error {
  constructor(
    message: string,
    public readonly code: ReceitaWsErrorCode,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ReceitaWsError'
  }
}

/**
 * Resposta da API ReceitaWS
 */
interface ReceitaWsResponse {
  status: 'OK' | 'ERROR'
  message?: string
  cnpj?: string
  nome?: string
  fantasia?: string
  atividade_principal?: Array<{ code: string; text: string }>
  atividades_secundarias?: Array<{ code: string; text: string }>
  municipio?: string
  uf?: string
  tipo?: string
  porte?: string
  natureza_juridica?: string
  capital_social?: string
  situacao?: string
  abertura?: string
  data_situacao?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  email?: string
  telefone?: string
  qsa?: Array<{ nome: string; qual: string }>
}

/**
 * Dados da empresa normalizados
 */
export interface CompanyData {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  cnaeCode: string
  cnaeDescription: string
  municipio: string
  uf: string
  tipo?: string
  porte?: string
  naturezaJuridica?: string
  capitalSocial?: number
  situacao?: string
  dataAbertura?: Date
  dataSituacao?: Date
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  email?: string
  telefone?: string
  qsa?: Array<{ nome: string; qual: string }>
  atividadesSecundarias?: Array<{ code: string; text: string }>
}

/**
 * Converte data no formato dd/mm/yyyy para Date
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined

  const [day, month, year] = dateStr.split('/')
  if (!day || !month || !year) return undefined

  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Converte string para número
 */
function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined

  const num = parseFloat(value.replace(',', '.'))
  return isNaN(num) ? undefined : num
}

/**
 * Busca dados de empresa pelo CNPJ na API ReceitaWS
 *
 * @param cnpj - CNPJ com ou sem formatação
 * @returns Dados da empresa normalizados
 * @throws ReceitaWsError em caso de erro
 */
export async function fetchCnpjData(cnpj: string): Promise<CompanyData> {
  const cleanCnpj = stripCnpj(cnpj)

  try {
    const response = await fetch(`${RECEITAWS_BASE_URL}/${cleanCnpj}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    // Rate limit
    if (response.status === 429) {
      throw new ReceitaWsError(
        'Limite de consultas excedido. Aguarde um momento.',
        'RATE_LIMIT'
      )
    }

    // Outros erros HTTP
    if (!response.ok) {
      throw new ReceitaWsError(
        `Erro ao consultar CNPJ: ${response.statusText}`,
        'API_ERROR'
      )
    }

    const data: ReceitaWsResponse = await response.json()

    // Verifica status da resposta
    if (data.status === 'ERROR') {
      const message = data.message?.toLowerCase() || ''

      if (message.includes('inválido')) {
        throw new ReceitaWsError('CNPJ inválido', 'INVALID_CNPJ')
      }

      if (message.includes('não encontrado') || message.includes('not found')) {
        throw new ReceitaWsError('CNPJ não encontrado', 'NOT_FOUND')
      }

      throw new ReceitaWsError(data.message || 'Erro na consulta', 'API_ERROR')
    }

    // Extrai atividade principal
    const atividadePrincipal = data.atividade_principal?.[0]

    // Normaliza resposta
    const companyData: CompanyData = {
      cnpj: cleanCnpj,
      razaoSocial: data.nome || '',
      nomeFantasia: data.fantasia || undefined,
      cnaeCode: atividadePrincipal?.code || '',
      cnaeDescription: atividadePrincipal?.text || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      tipo: data.tipo || undefined,
      porte: data.porte || undefined,
      naturezaJuridica: data.natureza_juridica || undefined,
      capitalSocial: parseNumber(data.capital_social),
      situacao: data.situacao || undefined,
      dataAbertura: parseDate(data.abertura),
      dataSituacao: parseDate(data.data_situacao),
      logradouro: data.logradouro || undefined,
      numero: data.numero || undefined,
      complemento: data.complemento || undefined,
      bairro: data.bairro || undefined,
      cep: data.cep || undefined,
      email: data.email || undefined,
      telefone: data.telefone || undefined,
      qsa: data.qsa && data.qsa.length > 0 ? data.qsa : undefined,
      atividadesSecundarias:
        data.atividades_secundarias && data.atividades_secundarias.length > 0
          ? data.atividades_secundarias
          : undefined,
    }

    return companyData
  } catch (error) {
    // Se já é um ReceitaWsError, repassa
    if (error instanceof ReceitaWsError) {
      throw error
    }

    // Erro de rede ou outro
    throw new ReceitaWsError(
      'Erro de conexão ao consultar CNPJ',
      'NETWORK_ERROR',
      error instanceof Error ? error : undefined
    )
  }
}
