import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'
import type { WhatsappInstance } from '@/lib/schema/whatsapp'

/**
 * Lista instancias WuzAPI de uma organizacao
 *
 * Busca no banco de dados local e opcionalmente atualiza status do provider
 */
export async function listWuzapiInstances(
  organizationId: string
): Promise<WhatsappInstance[]> {
  // Busca instancias locais com provider = wuzapi
  const instances = await prisma.whatsappInstance.findMany({
    where: {
      organizationId,
      provider: 'wuzapi',
    },
  })

  if (instances.length === 0) return []

  const { baseUrl } = getWuzapiConfig()

  // Busca status em tempo real de cada instancia
  const results = await Promise.all(
    instances.map(async (instance) => {
      let status = 'disconnected'
      let connected = false
      let qrcode: string | null = null

      let loggedIn = false

      if (instance.token) {
        try {
          const statusRes = await fetch(`${baseUrl}/session/status`, {
            headers: {
              Accept: 'application/json',
              token: instance.token,
            },
          })

          if (statusRes.ok) {
            const statusData = await statusRes.json()
            // WuzAPI returns lowercase field names: connected, loggedIn
            // Check both cases for compatibility
            connected = statusData.data?.connected === true || statusData.data?.Connected === true
            loggedIn = statusData.data?.loggedIn === true || statusData.data?.LoggedIn === true

            // Status logic:
            // - LoggedIn true = fully connected (can send/receive messages)
            // - Connected true but LoggedIn false = waiting for QR scan
            // - Connected false = disconnected
            if (loggedIn) {
              status = 'connected'
            } else if (connected) {
              status = 'waiting_qr'
            } else {
              status = 'disconnected'
            }
          }
        } catch (error) {
          console.error('[wuzapi] Erro ao buscar status:', error)
        }
      }

      return {
        id: instance.id,
        instanceId: instance.instanceId,
        label: instance.label || instance.instanceId,
        phone: instance.phone,
        status,
        connected,
        loggedIn,
        qrcode,
        paircode: null,
        createdAt: instance.createdAt?.toISOString() || null,
        updatedAt: instance.updatedAt?.toISOString() || null,
      }
    })
  )

  return results
}
