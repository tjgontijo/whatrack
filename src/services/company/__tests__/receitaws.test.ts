import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fetchCnpjData, ReceitaWsError } from '../receitaws'

/**
 * RED Phase: Testes para service ReceitaWS
 *
 * Funções a serem implementadas:
 * - fetchCnpjData: Busca dados da empresa na API ReceitaWS
 * - Tratamento de erros específicos (CNPJ inválido, not found, rate limit)
 * - Parsing e normalização da resposta
 */

// Mock do fetch global
const mockFetch = vi.fn()

describe('ReceitaWS Service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('fetchCnpjData', () => {
    it('should fetch and return company data for valid CNPJ', async () => {
      const mockResponse = {
        status: 'OK',
        cnpj: '11.222.333/0001-81',
        nome: 'EMPRESA TESTE LTDA',
        fantasia: 'TESTE',
        atividade_principal: [
          { code: '62.01-5-01', text: 'Desenvolvimento de programas de computador sob encomenda' },
        ],
        municipio: 'SAO PAULO',
        uf: 'SP',
        tipo: 'MATRIZ',
        porte: 'MICRO EMPRESA',
        natureza_juridica: '206-2 - Sociedade Empresária Limitada',
        capital_social: '10000.00',
        situacao: 'ATIVA',
        abertura: '01/01/2020',
        data_situacao: '01/01/2020',
        logradouro: 'RUA TESTE',
        numero: '100',
        complemento: 'SALA 1',
        bairro: 'CENTRO',
        cep: '01000-000',
        email: 'contato@teste.com.br',
        telefone: '(11) 1234-5678',
        qsa: [
          { nome: 'SOCIO TESTE', qual: 'Sócio-Administrador' },
        ],
        atividades_secundarias: [
          { code: '62.02-3-00', text: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchCnpjData('11222333000181')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://receitaws.com.br/v1/cnpj/11222333000181',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      )

      expect(result).toEqual({
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE LTDA',
        nomeFantasia: 'TESTE',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de programas de computador sob encomenda',
        municipio: 'SAO PAULO',
        uf: 'SP',
        tipo: 'MATRIZ',
        porte: 'MICRO EMPRESA',
        naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
        capitalSocial: 10000,
        situacao: 'ATIVA',
        dataAbertura: expect.any(Date),
        dataSituacao: expect.any(Date),
        logradouro: 'RUA TESTE',
        numero: '100',
        complemento: 'SALA 1',
        bairro: 'CENTRO',
        cep: '01000-000',
        email: 'contato@teste.com.br',
        telefone: '(11) 1234-5678',
        qsa: [{ nome: 'SOCIO TESTE', qual: 'Sócio-Administrador' }],
        atividadesSecundarias: [
          { code: '62.02-3-00', text: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
        ],
      })
    })

    it('should handle CNPJ with formatting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'OK',
          cnpj: '11.222.333/0001-81',
          nome: 'EMPRESA TESTE',
          atividade_principal: [{ code: '00.00-0-00', text: 'Teste' }],
          municipio: 'SP',
          uf: 'SP',
        }),
      })

      await fetchCnpjData('11.222.333/0001-81')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://receitaws.com.br/v1/cnpj/11222333000181',
        expect.any(Object)
      )
    })

    it('should throw ReceitaWsError for invalid CNPJ response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'ERROR',
          message: 'CNPJ inválido',
        }),
      })

      try {
        await fetchCnpjData('12345678000199')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ReceitaWsError)
        expect((e as ReceitaWsError).code).toBe('INVALID_CNPJ')
      }
    })

    it('should throw ReceitaWsError for CNPJ not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'ERROR',
          message: 'CNPJ não encontrado',
        }),
      })

      await expect(fetchCnpjData('11222333000181')).rejects.toThrow(ReceitaWsError)
    })

    it('should throw ReceitaWsError for rate limit (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      try {
        await fetchCnpjData('11222333000181')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ReceitaWsError)
        expect((e as ReceitaWsError).code).toBe('RATE_LIMIT')
      }
    })

    it('should throw ReceitaWsError for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetchCnpjData('11222333000181')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ReceitaWsError)
        expect((e as ReceitaWsError).code).toBe('NETWORK_ERROR')
      }
    })

    it('should handle missing optional fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'OK',
          cnpj: '11.222.333/0001-81',
          nome: 'EMPRESA MINIMA',
          atividade_principal: [{ code: '00.00-0-00', text: 'Atividade' }],
          municipio: 'CIDADE',
          uf: 'UF',
          // Campos opcionais ausentes
        }),
      })

      const result = await fetchCnpjData('11222333000181')

      expect(result.nomeFantasia).toBeUndefined()
      expect(result.capitalSocial).toBeUndefined()
      expect(result.qsa).toBeUndefined()
    })
  })
})
