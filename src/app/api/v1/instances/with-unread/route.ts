import { NextResponse } from "next/server";
import { validateFullAccess } from "@/lib/auth/validate-organization-access";
import { listWhatsappInstances } from "@/services/whatsapp/uazapi/list-instances";

/**
 * GET /api/v1/instances/with-unread
 * Retorna instâncias do WhatsApp da organização com contagem de não lidas (placeholder)
 */
export async function GET(request: Request) {
  const access = await validateFullAccess(request);
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? "Acesso negado" },
      { status: 403 }
    );
  }

  try {
    const instances = await listWhatsappInstances(access.organizationId);

    // Ainda não temos contador de não lidas por instância; devolvemos 0
    const items = instances.map((instance) => ({
      id: instance.id ?? instance.instanceId ?? "",
      label: instance.label ?? null,
      phone: instance.phone ?? null,
      status: instance.status ?? null,
      unreadCount: 0,
    })).filter((item) => item.id);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/instances/with-unread] GET error", error);
    return NextResponse.json(
      { error: "Falha ao carregar instâncias" },
      { status: 500 }
    );
  }
}
