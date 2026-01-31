/**
 * API Routes - /api/v1/organizations/[id]
 *
 * PATCH - Update an existing organization
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/server/auth/server";
import { createId } from "@paralleldrive/cuid2";
import { calculateMetrics } from "@/services/onboarding-metrics/metrics-calculator";

/**
 * Gera slug único a partir do nome da empresa
 * - Normaliza para lowercase
 * - Remove acentos
 * - Substitui espaços por hífens
 * - Remove caracteres especiais
 * - Adiciona sufixo aleatório se houver duplicata
 */
async function generateUniqueSlug(
  name: string,
  excludeOrgId?: string
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s-]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Espaços → hífens
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-|-$/g, ""); // Remove hífens das pontas

  // Verificar se slug já existe
  const existing = await prisma.organization.findFirst({
    where: {
      slug: baseSlug,
      ...(excludeOrgId && { id: { not: excludeOrgId } }),
    },
  });

  // Se não existe, retornar base slug
  if (!existing) {
    return baseSlug;
  }

  // Se existe, adicionar sufixo aleatório de 4 caracteres
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${randomSuffix}`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrSyncUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verificar se o usuário é owner da organização
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: user.id,
        role: "owner",
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Você não tem permissão para atualizar esta organização" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Calcular métricas se temos os dados necessários
    let metrics = {};
    if (body.leadsPerDay && body.avgTicket && body.monthlyRevenue && body.attendantsCount) {
      metrics = calculateMetrics({
        leadsPerDay: body.leadsPerDay,
        avgTicket: body.avgTicket,
        monthlyRevenue: body.monthlyRevenue,
        attendantsCount: body.attendantsCount,
        monthlyAdSpend: body.monthlyAdSpend,
      });
    }

    // Gerar novo slug se companyName for fornecido
    let newSlug: string | undefined;
    if (body.companyName) {
      newSlug = await generateUniqueSlug(body.companyName, organizationId);
    }

    // Atualizar organização (apenas campos que existem no schema)
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.companyName && { name: body.companyName }), // companyName -> name
        ...(newSlug && { slug: newSlug }),
      },
    });

    // Criar ou atualizar OrganizationProfile com dados de negócio
    const existingProfile = await prisma.organizationProfile.findFirst({
      where: { organizationId },
    });

    if (existingProfile) {
      await prisma.organizationProfile.update({
        where: { id: existingProfile.id },
        data: {
          cpf: body.cpf || null,
          avgTicket: body.avgTicket || null,
          attendantsCount: body.attendantsCount || null,
          mainChannel: body.mainAcquisitionChannel || null,
          leadsPerDay: body.leadsPerDay || null,
          monthlyRevenue: body.monthlyRevenue || null,
          monthlyAdSpend: body.monthlyAdSpend || null,
          ...(body.onboardingStatus && { onboardingStatus: body.onboardingStatus }),
          ...(body.onboardingStatus === 'completed' && { onboardingCompletedAt: new Date() }),
          ...metrics,
        },
      });
    } else {
      await prisma.organizationProfile.create({
        data: {
          id: createId(),
          organizationId,
          cpf: body.cpf || null,
          avgTicket: body.avgTicket || null,
          attendantsCount: body.attendantsCount || null,
          mainChannel: body.mainAcquisitionChannel || null,
          leadsPerDay: body.leadsPerDay || null,
          monthlyRevenue: body.monthlyRevenue || null,
          monthlyAdSpend: body.monthlyAdSpend || null,
          ...(body.onboardingStatus && { onboardingStatus: body.onboardingStatus }),
          ...(body.onboardingStatus === 'completed' && { onboardingCompletedAt: new Date() }),
          ...metrics,
        },
      });
    }

    // Criar ou atualizar OrganizationCompany se temos dados de CNPJ
    if (body.cnpj && body.razaoSocial) {
      const companyData = {
        cnpj: body.cnpj,
        razaoSocial: body.razaoSocial,
        nomeFantasia: body.nomeFantasia || null,
        cnaeCode: body.cnaeCode || '',
        cnaeDescription: body.cnaeDescription || '',
        municipio: body.municipio || '',
        uf: body.uf || '',
        // Campos adicionais da Receita Federal
        tipo: body.tipo || null,
        porte: body.porte || null,
        naturezaJuridica: body.naturezaJuridica || null,
        capitalSocial: body.capitalSocial || null,
        situacao: body.situacao || null,
        dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : null,
        dataSituacao: body.dataSituacao ? new Date(body.dataSituacao) : null,
        logradouro: body.logradouro || null,
        numero: body.numero || null,
        complemento: body.complemento || null,
        bairro: body.bairro || null,
        cep: body.cep || null,
        email: body.email || null,
        telefone: body.telefone || null,
        qsa: body.qsa || null,
        atividadesSecundarias: body.atividadesSecundarias || null,
      };

      const existingCompany = await prisma.organizationCompany.findFirst({
        where: { organizationId },
      });

      if (existingCompany) {
        await prisma.organizationCompany.update({
          where: { id: existingCompany.id },
          data: companyData,
        });
      } else {
        await prisma.organizationCompany.create({
          data: {
            id: createId(),
            organizationId,
            ...companyData,
            authorizedByUserId: user.id,
          },
        });
      }
    }

    return NextResponse.json(
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
