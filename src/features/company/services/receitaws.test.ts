import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCnpjData, ReceitaWsError } from './receitaws'

describe('receitaws (Unit)', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockClear()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('successfully fetches and normalizes CNPJ data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        cnpj: '00.000.000/0001-91',
        nome: 'BANCO DO BRASIL SA',
        fantasia: 'DIRECAO GERAL',
        atividade_principal: [{ code: '64.10-7-00', text: 'Bancos múltiplos, com carteira comercial' }],
        municipio: 'BRASILIA',
        uf: 'DF',
        abertura: '01/01/1980',
        capital_social: '1000000,00',
        qsa: [{ nome: 'JOAO SILVA', qual: 'Presidente' }],
      }),
    })

    const result = await fetchCnpjData('00000000000191')

    expect(result.cnpj).toBe('00000000000191')
    expect(result.razaoSocial).toBe('BANCO DO BRASIL SA')
    expect(result.nomeFantasia).toBe('DIRECAO GERAL')
    expect(result.cnaeCode).toBe('64.10-7-00')
    expect(result.dataAbertura).toBeInstanceOf(Date)
    expect(result.capitalSocial).toBe(1000000)
    expect(result.qsa).toEqual([{ nome: 'JOAO SILVA', qual: 'Presidente' }])
  })

  it('throws INVALID_CNPJ error when API returns invalid cnpj status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ERROR',
        message: 'CNPJ inválido',
      }),
    })

    await expect(fetchCnpjData('123')).rejects.toThrowError(
      new ReceitaWsError('CNPJ inválido', 'INVALID_CNPJ')
    )
  })

  it('throws NOT_FOUND error when API returns not found status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ERROR',
        message: 'CNPJ não encontrado',
      }),
    })

    await expect(fetchCnpjData('99999999000199')).rejects.toThrowError(
      new ReceitaWsError('CNPJ não encontrado', 'NOT_FOUND')
    )
  })

  it('throws RATE_LIMIT error when API returns 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    await expect(fetchCnpjData('00000000000191')).rejects.toThrowError(
      new ReceitaWsError('Limite de consultas excedido. Aguarde um momento.', 'RATE_LIMIT')
    )
  })

  it('throws NETWORK_ERROR on fetch failure', async () => {
    const error = new Error('Failed to fetch')
    mockFetch.mockRejectedValueOnce(error)

    await expect(fetchCnpjData('00000000000191')).rejects.toThrowError(
      new ReceitaWsError('Erro de conexão ao consultar CNPJ', 'NETWORK_ERROR', error)
    )
  })
})
