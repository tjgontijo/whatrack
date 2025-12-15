import { describe, expect, it } from 'vitest'
import {
  lookupCnpjSchema,
  saveCompanySchema,
  companyResponseSchema,
} from '../schemas'

/**
 * RED Phase: Testes para schemas Zod da API de Company
 *
 * Schemas a serem implementados:
 * - lookupCnpjSchema: Validação de input para busca de CNPJ
 * - saveCompanySchema: Validação de input para salvar empresa
 * - companyResponseSchema: Validação de resposta da API
 */

describe('Company API Schemas', () => {
  describe('lookupCnpjSchema', () => {
    it('should validate valid CNPJ (14 digits)', () => {
      const result = lookupCnpjSchema.safeParse({ cnpj: '11222333000181' })
      expect(result.success).toBe(true)
    })

    it('should validate CNPJ with formatting', () => {
      const result = lookupCnpjSchema.safeParse({ cnpj: '11.222.333/0001-81' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid CNPJ (wrong length)', () => {
      const result = lookupCnpjSchema.safeParse({ cnpj: '1234567800019' })
      expect(result.success).toBe(false)
    })

    it('should reject empty CNPJ', () => {
      const result = lookupCnpjSchema.safeParse({ cnpj: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing CNPJ', () => {
      const result = lookupCnpjSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('saveCompanySchema', () => {
    const validCompany = {
      cnpj: '11222333000181',
      razaoSocial: 'EMPRESA TESTE LTDA',
      cnaeCode: '62.01-5-01',
      cnaeDescription: 'Desenvolvimento de software',
      municipio: 'SAO PAULO',
      uf: 'SP',
      authorized: true,
    }

    it('should validate valid company data with authorization', () => {
      const result = saveCompanySchema.safeParse(validCompany)
      expect(result.success).toBe(true)
    })

    it('should reject company without authorization checkbox', () => {
      const result = saveCompanySchema.safeParse({
        ...validCompany,
        authorized: false,
      })
      expect(result.success).toBe(false)
    })

    it('should reject company missing required fields', () => {
      const result = saveCompanySchema.safeParse({
        cnpj: '11222333000181',
        authorized: true,
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const result = saveCompanySchema.safeParse({
        ...validCompany,
        nomeFantasia: 'TESTE',
        tipo: 'MATRIZ',
        porte: 'MICRO EMPRESA',
        capitalSocial: 10000,
        logradouro: 'RUA TESTE',
        numero: '100',
        bairro: 'CENTRO',
        cep: '01000-000',
        email: 'teste@teste.com',
        telefone: '11999999999',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UF', () => {
      const result = saveCompanySchema.safeParse({
        ...validCompany,
        uf: 'INVALID',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('companyResponseSchema', () => {
    it('should validate company response with required fields', () => {
      const result = companyResponseSchema.safeParse({
        id: 'cuid123',
        organizationId: 'org123',
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'SAO PAULO',
        uf: 'SP',
        authorizedByUserId: 'user123',
        authorizedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })

    it('should validate company response with optional fields', () => {
      const result = companyResponseSchema.safeParse({
        id: 'cuid123',
        organizationId: 'org123',
        cnpj: '11222333000181',
        razaoSocial: 'EMPRESA TESTE',
        nomeFantasia: 'TESTE',
        cnaeCode: '62.01-5-01',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'SAO PAULO',
        uf: 'SP',
        tipo: 'MATRIZ',
        porte: 'MICRO EMPRESA',
        naturezaJuridica: 'Sociedade LTDA',
        capitalSocial: '10000.00',
        situacao: 'ATIVA',
        authorizedByUserId: 'user123',
        authorizedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })
  })
})
