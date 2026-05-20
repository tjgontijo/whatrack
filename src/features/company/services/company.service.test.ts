import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { saveOrganizationCompany, getOrganizationCompany } from './company.service'
import type { SaveCompanyInput } from '../schemas/company.schemas'

describe('company.service (Integration)', () => {
  let orgId: string
  let userId: string

  beforeEach(async () => {
    // 1. Create Organization
    const org = await prisma.organization.create({
      data: {
        name: 'Company Test Org',
        slug: `company-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id

    // 2. Create User (required for authorizedByUserId)
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Math.random().toString(36).substring(2, 9)}@example.com`,
      },
    })
    userId = user.id
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {})
    }
  })

  it('saves a new organization company and retrieves it', async () => {
    const input: SaveCompanyInput = {
      cnpj: '00.000.000/0001-91',
      razaoSocial: 'BANCO DO BRASIL SA',
      nomeFantasia: 'DIRECAO GERAL',
      cnaeCode: '64.10-7-00',
      cnaeDescription: 'Bancos múltiplos',
      municipio: 'BRASILIA',
      uf: 'DF',
      authorized: true,
      tipo: 'MATRIZ',
      porte: 'DEMAIS',
      capitalSocial: 1000000,
      email: 'contato@bb.com.br',
    }

    const result = await saveOrganizationCompany({
      organizationId: orgId,
      userId: userId,
      input,
    })

    expect(result.status).toBe(201)
    expect(result.data.cnpj).toBe('00000000000191') // Stripped
    expect(result.data.razaoSocial).toBe('BANCO DO BRASIL SA')

    const retrieved = await getOrganizationCompany(orgId)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.cnpj).toBe('00000000000191')
  })

  it('updates an existing organization company', async () => {
    const input1: SaveCompanyInput = {
      cnpj: '00000000000191',
      razaoSocial: 'OLD NAME',
      cnaeCode: '0000',
      cnaeDescription: 'DESC',
      municipio: 'CITY',
      uf: 'SP',
      authorized: true,
    }

    await saveOrganizationCompany({
      organizationId: orgId,
      userId: userId,
      input: input1,
    })

    const input2: SaveCompanyInput = {
      ...input1,
      razaoSocial: 'NEW NAME',
    }

    const result = await saveOrganizationCompany({
      organizationId: orgId,
      userId: userId,
      input: input2,
    })

    expect(result.status).toBe(200)
    expect(result.data.razaoSocial).toBe('NEW NAME')

    const retrieved = await getOrganizationCompany(orgId)
    expect(retrieved?.razaoSocial).toBe('NEW NAME')
  })
})
