import { getUazapiConfig } from './config'
import type { WhatsappInstance } from '@/schemas/whatsapp'
import { prisma } from '@/lib/prisma'

/**
 * Consulta diretamente o provedor e devolve as instâncias.
 * Não persiste nada localmente.
 */
export async function listWhatsappInstances(organizationId: string): Promise<WhatsappInstance[]> {
  const { baseUrl, adminToken } = getUazapiConfig()

  // Lista vínculos locais para saber quais instâncias pertencem à organização
  const links = await prisma.whatsappInstance.findMany({
    where: { organizationId },
  })

  console.log(`[listWhatsappInstances] Instâncias no banco para org ${organizationId}:`, links.map(l => ({ id: l.id, instanceId: l.instanceId, label: l.label })))

  if (links.length === 0) {
    console.log(`[listWhatsappInstances] Nenhuma instância encontrada no banco para org ${organizationId}`)
    return []
  }

  try {
    console.log(`[listWhatsappInstances] Consultando UAZAPI em ${baseUrl}/instance/all`)
    const response = await fetch(`${baseUrl}/instance/all`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        admintoken: adminToken,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[listWhatsappInstances] Falha ao consultar UAZAPI: ${response.status}`)
      console.log(`[listWhatsappInstances] Retornando instâncias do banco como fallback`)
      // Fallback: retornar instâncias do banco se API falhar
      return links.map((link) => ({
        id: link.instanceId,
        instanceId: link.instanceId,
        label: link.label ?? 'WhatsApp',
        phone: link.phone,
        status: 'disconnected',
        connected: false,
        loggedIn: false,
        qrcode: null,
        paircode: null,
        createdAt: link.createdAt?.toISOString() ?? null,
        updatedAt: link.updatedAt?.toISOString() ?? null,
      }))
    }

    const payload = await response.json()
    console.log(`[listWhatsappInstances] Resposta da API:`, JSON.stringify(payload).substring(0, 500))
    
    const apiInstances = Array.isArray(payload)
      ? payload as UazapiInstance[]
      : Array.isArray((payload as InstanceListResponse)?.instances)
        ? (payload as InstanceListResponse).instances ?? []
        : []

    console.log(`[listWhatsappInstances] Instâncias da API (detalhado):`, apiInstances.map(i => ({ 
      id: i.id, 
      instanceId: i.instanceId, 
      name: i.name,
      systemName: i.systemName
    })))
    
    console.log(`[listWhatsappInstances] Links no banco:`, links.map(l => ({ 
      id: l.id,
      instanceId: l.instanceId, 
      label: l.label
    })))

    const allowedIds = new Set(
      links.map((link) => link.instanceId),
    )

    const result = apiInstances
      .map((item) => {
        const status = normalizeStatus(item)
        // Tentar encontrar o link pelo ID da API ou pelo instanceId armazenado
        const link = links.find((lnk) => lnk.instanceId === item.id || lnk.instanceId === item.instanceId)
        
        // Se encontrou um link, usar o instanceId do banco; senão usar o ID da API
        const resolvedId = link?.instanceId ?? item.id ?? item.instanceId ?? ''

        return {
          id: resolvedId,
          instanceId: resolvedId,
          label: link?.label ?? item.name ?? item.profileName ?? item.systemName ?? resolvedId ?? 'WhatsApp',
          phone: link?.phone ?? item.systemName ?? item.id ?? null,
          status,
          connected: item.connected ?? (status === 'connected' || status === 'open'),
          loggedIn: item.loggedIn ?? undefined,
          qrcode: item.qrcode ?? null,
          paircode: item.paircode ?? null,
          createdAt: item.created ?? null,
          updatedAt: item.updated ?? null,
        }
      })
      .filter((item) => {
        // Filtrar apenas instâncias que têm um link no banco (estão autorizadas)
        const isAllowed = allowedIds.has(item.instanceId)
        console.log(`[listWhatsappInstances] Filtrando instância ${item.id}: isAllowed=${isAllowed}`)
        return Boolean(item.id) && isAllowed
      })

    console.log(`[listWhatsappInstances] Instâncias retornadas:`, result.map(r => ({ id: r.id, label: r.label })))
    return result
  } catch (error) {
    console.error('[listWhatsappInstances] Erro de rede ao consultar UAZAPI', error)
    console.log(`[listWhatsappInstances] Retornando instâncias do banco como fallback após erro`)
    // Fallback: retornar instâncias do banco se houver erro de rede
    return links.map((link) => ({
      id: link.instanceId,
      instanceId: link.instanceId,
      label: link.label ?? 'WhatsApp',
      phone: link.phone,
      status: 'disconnected',
      connected: false,
      loggedIn: false,
      qrcode: null,
      paircode: null,
      createdAt: link.createdAt?.toISOString() ?? null,
      updatedAt: link.updatedAt?.toISOString() ?? null,
    }))
  }
}

function normalizeStatus(item: UazapiInstance): string {
  const status = item.status?.toLowerCase()
  if (!status) return 'disconnected'
  if (status === 'connected' || status === 'open') return 'connected'
  if (status === 'connecting') return 'connecting'
  return status
}

type InstanceListResponse = {
  instances?: UazapiInstance[]
}

type UazapiInstance = {
  id?: string
  instanceId?: string
  name?: string
  profileName?: string
  systemName?: string
  status?: string
  connected?: boolean
  loggedIn?: boolean
  qrcode?: string | null
  paircode?: string | null
  created?: string | null
  updated?: string | null
  lastDisconnect?: string | null
  lastDisconnectReason?: string | null
}
