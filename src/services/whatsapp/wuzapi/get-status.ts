import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type GetWuzapiStatusParams = {
  instanceId: string
  organizationId: string
}

type StatusResult = {
  id: string
  instanceId: string
  name: string | null
  status: string
  connected: boolean
  loggedIn: boolean
  qrcode: string | null
  paircode: string | null
}

/**
 * Obtem o status atual de uma instancia WuzAPI
 *
 * Endpoint WuzAPI: GET /session/status
 * Header: token: {userToken}
 */
export async function getWuzapiInstanceStatus({
  instanceId,
  organizationId,
}: GetWuzapiStatusParams): Promise<StatusResult> {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    throw new Error('Instancia nao encontrada')
  }

  if (!instance.token) {
    throw new Error('Token da instancia nao encontrado')
  }

  const { baseUrl } = getWuzapiConfig()

  // Busca status
  const statusRes = await fetch(`${baseUrl}/session/status`, {
    headers: {
      Accept: 'application/json',
      token: instance.token,
    },
  })

  let connected = false
  let loggedIn = false
  let status = 'disconnected'

  // Log raw response for debugging
  const rawBody = await statusRes.text()
  console.log('[wuzapi] GET /session/status response:', statusRes.status, rawBody)

  if (statusRes.ok) {
    try {
      const statusData = JSON.parse(rawBody)
      console.log('[wuzapi] Parsed status data:', JSON.stringify(statusData))

      // WuzAPI response format: { code: 200, data: { connected: bool, loggedIn: bool }, success: bool }
      // Note: WuzAPI returns lowercase field names
      connected = statusData.data?.connected === true || statusData.data?.Connected === true
      loggedIn = statusData.data?.loggedIn === true || statusData.data?.LoggedIn === true

      console.log('[wuzapi] Extracted values - connected:', connected, 'loggedIn:', loggedIn)

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

      console.log('[wuzapi] Final status:', status)
    } catch (parseError) {
      console.error('[wuzapi] Failed to parse status response:', parseError)
    }
  } else {
    console.error('[wuzapi] Status request failed:', statusRes.status, rawBody)
  }

  // Busca QR code se aguardando QR
  let qrcode: string | null = null
  if (connected && !loggedIn) {
    try {
      const qrRes = await fetch(`${baseUrl}/session/qr`, {
        headers: {
          Accept: 'application/json',
          token: instance.token,
        },
      })

      if (qrRes.ok) {
        const qrData = await qrRes.json()
        qrcode = qrData.data?.QRCode || qrData.QRCode || null
      }
    } catch {
      // Ignora erro ao buscar QR
    }
  }

  return {
    id: instance.id,
    instanceId: instance.instanceId,
    name: instance.label,
    status,
    connected,
    loggedIn,
    qrcode,
    paircode: null,
  }
}
