import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'
import { provisionWuzapiWebhook } from './provision-webhook'
import { syncWuzapiContacts } from './sync-contacts'

type ConnectWuzapiInstanceParams = {
  instanceId: string
  organizationId: string
}

type ConnectResult = {
  status: 'connected' | 'waiting_qr'
  jid?: string
  qr?: string | null
  pairCode?: string | null
}

/**
 * Conecta uma instancia ao WhatsApp via WuzAPI
 *
 * Endpoints WuzAPI:
 * - POST /session/connect (inicia conexao)
 * - GET /session/qr (obtem QR code se necessario)
 *
 * Header: token: {userToken}
 */
export async function connectWuzapiInstance({
  instanceId,
  organizationId,
}: ConnectWuzapiInstanceParams): Promise<ConnectResult> {
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

  // 1. Tenta conectar
  const connectRes = await fetch(`${baseUrl}/session/connect`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token: instance.token,
    },
    body: JSON.stringify({
      Subscribe: ['Message', 'ReadReceipt', 'Presence', 'ChatPresence'],
      Immediate: true,
    }),
  })

  const rawConnectBody = await connectRes.text()
  console.log('[wuzapi] POST /session/connect response:', connectRes.status, rawConnectBody)

  let connectData: Record<string, unknown>
  try {
    connectData = JSON.parse(rawConnectBody)
  } catch {
    console.error('[wuzapi] Failed to parse connect response')
    throw new Error('Resposta inválida do WuzAPI')
  }

  // Trata "already connected" como sucesso
  // WuzAPI pode retornar: { code: 500, error: "already connected", success: false }
  if (!connectRes.ok) {
    if (connectData.error === 'already connected') {
      console.log('[wuzapi] Already connected, returning success')
      // Buscar status real para obter o jid
      const statusRes = await fetch(`${baseUrl}/session/status`, {
        headers: { Accept: 'application/json', token: instance.token },
      })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        console.log('[wuzapi] Status after already connected:', JSON.stringify(statusData))
        if (statusData.data?.LoggedIn === true) {
          // Sincroniza contatos em background
          syncWuzapiContacts({
            organizationId,
            instanceId,
            token: instance.token,
          }).catch((err) => {
            console.error('[wuzapi] Erro ao sincronizar contatos:', err)
          })
          return { status: 'connected', jid: undefined }
        }
      }
      return { status: 'connected', jid: undefined }
    }
    console.error('[wuzapi] Falha ao conectar:', connectRes.status, connectData)
    throw new Error(`Falha ao conectar WuzAPI: ${connectRes.status}`)
  }

  // 2. Verifica se já está logado (LoggedIn = autenticado no WhatsApp)
  // Resposta esperada: { code: 200, data: { details: "Connected!", jid: "...", ... }, success: true }
  const data = connectData.data as Record<string, unknown> | undefined
  if (data?.jid) {
    console.log('[wuzapi] Connected with jid:', data.jid)
    
    // Sincroniza contatos em background (fire-and-forget)
    syncWuzapiContacts({
      organizationId,
      instanceId,
      token: instance.token,
    }).catch((err) => {
      console.error('[wuzapi] Erro ao sincronizar contatos:', err)
    })
    
    return {
      status: 'connected',
      jid: data.jid as string,
    }
  }

  console.log('[wuzapi] No jid in connect response, will fetch QR code')

  // 3. Busca QR Code (com retry pois pode demorar um pouco para gerar)
  let qrCode: string | null = null
  const maxRetries = 3
  const retryDelay = 500 // ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }

    const qrRes = await fetch(`${baseUrl}/session/qr`, {
      headers: {
        Accept: 'application/json',
        token: instance.token,
      },
    })

    if (qrRes.ok) {
      const qrData = await qrRes.json()
      console.log('[wuzapi] QR response:', JSON.stringify(qrData))
      qrCode = qrData.data?.QRCode || qrData.QRCode || null
      if (qrCode) break
    } else {
      const errorBody = await qrRes.text()
      console.error(`[wuzapi] QR fetch failed (attempt ${attempt + 1}):`, qrRes.status, errorBody)
    }
  }

  if (!qrCode) {
    console.warn('[wuzapi] QR code nao obtido apos retries')
  }

  // 4. Provisiona webhook (fire-and-forget)
  provisionWuzapiWebhook({ organizationId, instanceId }).catch((err) => {
    console.error('[wuzapi] Erro ao provisionar webhook:', err)
  })

  return {
    status: 'waiting_qr',
    qr: qrCode,
    pairCode: null,
  }
}
