/**
 * API Routes - /api/v1/organizations
 *
 * POST - Create a new organization from explicit onboarding (PF/PJ)
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { getOrSyncUser } from '@/server/auth/server'
import {
  normalizeOnboardingDocument,
  organizationOnboardingSchema,
} from '@/schemas/organization-onboarding'

const onboardingStatuses = [
  { name: 'pending', description: 'Onboarding iniciado e aguardando conclusão.' },
  { name: 'completed', description: 'Onboarding concluído com sucesso.' },
  { name: 'skipped', description: 'Onboarding pulado pelo usuário.' },
] as const

async function ensureOnboardingStatuses() {
  await Promise.all(
    onboardingStatuses.map((status) =>
      prisma.onboardingStatus.upsert({
        where: { name: status.name },
        create: status,
        update: {},
      })
    )
  )
}

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let slug = baseSlug || 'organization'
  const exists = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (exists) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`
  }

  return slug
}

function parseOptionalDate(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function resolveOrganizationName(input: {
  entityType: 'individual' | 'company'
  userName: string | null | undefined
  userEmail: string
  companyName?: string
  legalName?: string
}) {
  if (input.entityType === 'company') {
    const fromCompany = input.legalName?.trim() || input.companyName?.trim()
    if (fromCompany) return fromCompany
  }

  const fromUser = input.userName?.trim()
  if (fromUser) return fromUser

  const fromEmail = input.userEmail.split('@')[0]?.trim()
  if (fromEmail) return fromEmail

  return 'Minha Organização'
}

export async function POST(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingMembership = await prisma.member.findFirst({
      where: { userId: user.id },
      select: { id: true, organizationId: true },
    })

    if (existingMembership) {
      return NextResponse.json(
        {
          error: 'Usuário já pertence a uma organização.',
          organizationId: existingMembership.organizationId,
        },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = organizationOnboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const normalizedDocument = normalizeOnboardingDocument(parsed.data.documentNumber)
    const companyData =
      parsed.data.entityType === 'company' ? parsed.data.companyLookupData : undefined

    await ensureOnboardingStatuses()

    const organizationName = resolveOrganizationName({
      entityType: parsed.data.entityType,
      userName: user.name,
      userEmail: user.email,
      companyName: companyData?.nomeFantasia,
      legalName: companyData?.razaoSocial,
    })
    const slug = await generateUniqueSlug(organizationName)

    if (parsed.data.entityType === 'company') {
      const uf = companyData?.uf?.trim().toUpperCase() ?? ''
      if (uf.length !== 2) {
        return NextResponse.json(
          { error: 'UF inválida nos dados da Receita Federal.' },
          { status: 400 }
        )
      }
    }

    const organization = await prisma.$transaction(async (tx) => {
      const createdOrganization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          createdAt: new Date(),
        },
      })

      await tx.member.create({
        data: {
          organizationId: createdOrganization.id,
          userId: user.id,
          role: 'owner',
          createdAt: new Date(),
        },
      })

      if (parsed.data.entityType === 'individual') {
        await tx.organizationProfile.create({
          data: {
            organizationId: createdOrganization.id,
            cpf: normalizedDocument,
            onboardingStatus: 'completed',
            onboardingCompletedAt: new Date(),
          },
        })
      } else {
        const company = companyData!
        await tx.organizationProfile.create({
          data: {
            organizationId: createdOrganization.id,
            onboardingStatus: 'completed',
            onboardingCompletedAt: new Date(),
          },
        })

        await tx.organizationCompany.create({
          data: {
            organizationId: createdOrganization.id,
            cnpj: normalizedDocument,
            razaoSocial: company.razaoSocial,
            nomeFantasia: company.nomeFantasia || null,
            cnaeCode: company.cnaeCode || '',
            cnaeDescription: company.cnaeDescription || '',
            municipio: company.municipio || '',
            uf: (company.uf || '').toUpperCase(),
            tipo: company.tipo || null,
            porte: company.porte || null,
            naturezaJuridica: company.naturezaJuridica || null,
            capitalSocial:
              typeof company.capitalSocial === 'number' ? new Prisma.Decimal(company.capitalSocial) : null,
            situacao: company.situacao || null,
            dataAbertura: parseOptionalDate(company.dataAbertura),
            dataSituacao: parseOptionalDate(company.dataSituacao),
            logradouro: company.logradouro || null,
            numero: company.numero || null,
            complemento: company.complemento || null,
            bairro: company.bairro || null,
            cep: company.cep || null,
            email: company.email || null,
            telefone: company.telefone || null,
            qsa: company.qsa ? (company.qsa as unknown as Prisma.InputJsonValue) : undefined,
            atividadesSecundarias: company.atividadesSecundarias
              ? (company.atividadesSecundarias as unknown as Prisma.InputJsonValue)
              : undefined,
            authorizedByUserId: user.id,
          },
        })
      }

      return createdOrganization
    })

    return NextResponse.json(
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        entityType: parsed.data.entityType,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Documento já cadastrado em outra organização.' },
        { status: 409 }
      )
    }

    console.error('Failed to create organization:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
