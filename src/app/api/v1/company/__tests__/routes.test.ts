import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getLookup } from '../lookup/route'
import { GET, POST } from '../route'

/**
 * RED Phase: Testes para API routes de Company
 *
 * Endpoints:
 * - GET /api/v1/company/lookup?cnpj=XXXXX - Busca dados na ReceitaWS
 * - POST /api/v1/company - Salva dados da empresa
 * - GET /api/v1/company - Busca dados salvos da organização
 */

// Mock de módulos
vi.mock('@/server/auth/validate-organization-access', () => ({
  validateFullAccess: vi.fn().mockResolvedValue({
    hasAccess: true,
    organizationId: 'test-org-id',
    userId: 'test-user-id',
  }),
}))

vi.mock('@/services/company/receitaws', () => ({
  fetchCnpjData: vi.fn().mockResolvedValue({
    cnpj: '11222333000181',
    razaoSocial: 'EMPRESA TESTE LTDA',
    nomeFantasia: 'TESTE',
    cnaeCode: '62.01-5-01',
    cnaeDescription: 'Desenvolvimento de software',
    municipio: 'SAO PAULO',
    uf: 'SP',
  }),
  ReceitaWsError: class ReceitaWsError extends Error {
    constructor(message: string, public code: string) {
      super(message)
    }
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organizationCompany: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => ({
        id: 'test-company-id',
        ...data.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorizedAt: new Date(),
      })),
      update: vi.fn(),
    },
  },
}))

describe('Company API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/company/lookup', () => {
    it('should return company data for valid CNPJ', async () => {
      const request = new NextRequest('http://localhost/api/v1/company/lookup?cnpj=11222333000181')

      const response = await getLookup(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cnpj).toBe('11222333000181')
      expect(data.razaoSocial).toBe('EMPRESA TESTE LTDA')
    })

    it('should return 400 for missing CNPJ', async () => {
      const request = new NextRequest('http://localhost/api/v1/company/lookup')

      const response = await getLookup(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid CNPJ format', async () => {
      const request = new NextRequest('http://localhost/api/v1/company/lookup?cnpj=invalid')

      const response = await getLookup(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/v1/company', () => {
    it('should save company data with authorization', async () => {
      const body = {
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE LTDA',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'SAO PAULO',
        uf: 'SP',
        authorized: true,
      }

      const request = new NextRequest('http://localhost/api/v1/company', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.cnpj).toBe('11222333000181')
    })

    it('should return 400 for missing authorization', async () => {
      const body = {
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE LTDA',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'SAO PAULO',
        uf: 'SP',
        authorized: false, // false não é permitido
      }

      const request = new NextRequest('http://localhost/api/v1/company', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing required fields', async () => {
      const body = {
        cnpj: '11222333000181',
        authorized: true,
      }

      const request = new NextRequest('http://localhost/api/v1/company', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/v1/company', () => {
    it('should return saved company data', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.organizationCompany.findUnique).mockResolvedValueOnce({
        id: 'test-company-id',
        organizationId: 'test-org-id',
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE',
        nomeFantasia: 'TESTE',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'SAO PAULO',
        uf: 'SP',
        tipo: 'MATRIZ',
        porte: 'MICRO EMPRESA',
        naturezaJuridica: null,
        capitalSocial: null,
        situacao: 'ATIVA',
        dataAbertura: null,
        dataSituacao: null,
        simplesOptante: false,
        simeiOptante: false,
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        cep: null,
        email: null,
        telefone: null,
        qsa: null,
        atividadesSecundarias: null,
        authorizedByUserId: 'test-user-id',
        authorizedAt: new Date(),
        fetchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/v1/company')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cnpj).toBe('11222333000181')
    })

    it('should return 404 when no company data exists', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.organizationCompany.findUnique).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/v1/company')

      const response = await GET(request)

      expect(response.status).toBe(404)
    })
  })
})
