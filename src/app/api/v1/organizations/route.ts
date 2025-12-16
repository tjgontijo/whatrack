/**
 * API Routes - /api/v1/organizations
 *
 * POST - Create a new organization
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/server/auth/server";
import { createId } from "@paralleldrive/cuid2";
import { calculateMetrics } from "@/services/sign-up/metrics-calculator";

export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getOrSyncUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    let slug = body.slug;
    if (!slug) {
      slug = body.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
    }

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      // Append random suffix to make it unique
      slug = `${slug}-${createId().slice(0, 6)}`;
    }

    // Calculate business metrics if we have the required data
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

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        id: createId(),
        name: body.name,
        slug,
        createdAt: new Date(),
      },
    });

    // Create OrganizationProfile
    await prisma.organizationProfile.create({
      data: {
        id: createId(),
        organizationId: organization.id,
        onboardingCompleted: body.onboardingCompleted || false,
      },
    });

    // Create OrganizationCompany se temos dados de CNPJ
    if (body.cnpj && body.razaoSocial) {
      await prisma.organizationCompany.create({
        data: {
          id: createId(),
          organizationId: organization.id,
          cnpj: body.cnpj,
          razaoSocial: body.razaoSocial,
          nomeFantasia: body.nomeFantasia || null,
          cnaeCode: body.cnaeCode || '',
          cnaeDescription: body.cnaeDescription || '',
          municipio: body.municipio || '',
          uf: body.uf || '',
          porte: body.porte || null,
          authorizedByUserId: user.id,
        },
      });
    }

    // Create member association (user as owner)
    await prisma.member.create({
      data: {
        id: createId(),
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
