import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { historySyncAlertsService } from '@/services/whatsapp/history-sync-alerts.service'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/v1/whatsapp/history-sync-alerts
 *
 * Endpoint para verificações periódicas de sincronização
 * Ideal para ser chamado por um Cron Job a cada 5 minutos
 *
 * Requer token de autenticação para evitar abuso
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar token de autenticação
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.HISTORY_SYNC_ALERT_TOKEN

    if (!expectedToken) {
      logger.error('[HistorySyncAlertsAPI] HISTORY_SYNC_ALERT_TOKEN não configurado')
      return apiError('Alert token not configured', 500)
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return apiError('Unauthorized', 401)
    }

    // Executar verificações periódicas
    await historySyncAlertsService.runPeriodicChecks()

    return NextResponse.json(
      {
        success: true,
        message: 'History sync alerts check completed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, '[HistorySyncAlertsAPI] Error running alerts check')

    return apiError('Failed to run alerts check', 500, error)
  }
}

/**
 * GET /api/v1/whatsapp/history-sync-alerts/status
 *
 * Endpoint para verificar status dos alerts
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar query param para ativar/desativar
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'run') {
      // Executar verificações manualmente
      const authHeader = req.headers.get('authorization')
      const expectedToken = process.env.HISTORY_SYNC_ALERT_TOKEN

      if (authHeader !== `Bearer ${expectedToken}`) {
        return apiError('Unauthorized', 401)
      }

      await historySyncAlertsService.runPeriodicChecks()

      return NextResponse.json(
        {
          success: true,
          message: 'Alerts check triggered',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    // Status da saúde dos alertas
    return NextResponse.json(
      {
        status: 'operational',
        service: 'history-sync-alerts',
        timestamp: new Date().toISOString(),
        checks: [
          {
            name: 'Sync Timeouts',
            description: 'Verifica históricos pendentes há mais de 30min',
          },
          {
            name: 'Sync Failures',
            description: 'Monitora falhas de sincronização',
          },
          {
            name: 'Inactive History Leads',
            description: 'Detecta leads de histórico sem atividade',
          },
        ],
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, '[HistorySyncAlertsAPI] Error checking status')

    return apiError('Failed to check status', 500, error)
  }
}
