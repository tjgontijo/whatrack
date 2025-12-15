/**
 * API Routes - /api/v1/organizations/[id]
 *
 * PATCH - Update an existing organization
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/auth/server";
import { createId } from "@paralleldrive/cuid2";
import { calculateMetrics } from "@/services/sign-up/metrics-calculator";

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

    // Atualizar organização (apenas campos que existem no schema)
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.companyName && { name: body.companyName }), // companyName -> name
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
          onboardingCompleted: body.onboardingCompleted !== undefined ? body.onboardingCompleted : undefined,
          onboardingCompletedAt: body.onboardingCompleted ? new Date() : undefined,
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
          onboardingCompleted: body.onboardingCompleted || false,
          onboardingCompletedAt: body.onboardingCompleted ? new Date() : null,
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
