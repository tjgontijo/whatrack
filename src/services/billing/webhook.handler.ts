import { NextRequest, NextResponse } from 'next/server'
import { BillingSubscriptionStatus, BillingPaymentMethod } from '@generated/prisma/client'
import { BillingAsaasConfigService } from './asaas-config.service'
import { BillingAuditService } from './audit.service'
import { BillingPaymentService } from './payment.service'
import { mapPixAutomaticFailureReason } from '@/lib/billing/pix-failure.helper'
import { billingLog } from './logger'
import { prisma } from '@/lib/db/prisma'

function getAuthorization(payload: any) {
  return payload.authorization ?? payload.pixAutomaticAuthorization ?? null
}

export class BillingWebhookHandler {
  static async process(request: NextRequest) {
    const { webhookToken } = await BillingAsaasConfigService.getRuntimeConfig()
    const authToken = request.headers.get('asaas-access-token')

    if (!webhookToken || authToken !== webhookToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const eventId = payload.id
    const eventName = payload.event

    if (eventId && (await BillingAuditService.isDuplicate(eventId))) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }

    try {
      switch (eventName) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_OVERDUE':
        case 'PAYMENT_DELETED':
        case 'PAYMENT_REFUNDED':
          if (payload.payment?.id) {
            await BillingPaymentService.syncPaymentFromWebhook(payload.payment)
          }
          break

        case 'PIX_AUTOMATIC_AUTHORIZATION_AUTHORIZED':
        case 'PIX_AUTOMATIC_AUTHORIZATION_AUTHORIZED_AND_CONFIRMED':
        case 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED': {
          const authorization = getAuthorization(payload)
          if (authorization?.id) {
            await prisma.billingSubscription.updateMany({
              where: { asaasId: authorization.id },
              data: {
                status: BillingSubscriptionStatus.ACTIVE,
                isActive: true,
                failureReason: null,
                failureCount: 0,
                purchaseDate: new Date(),
                expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
              },
            })

            billingLog('info', 'PIX Automático authorization activated', {
              authId: authorization.id,
            })
          }
          break
        }

        case 'PIX_AUTOMATIC_AUTHORIZATION_DENIED':
        case 'PIX_AUTOMATIC_AUTHORIZATION_CANCELED':
        case 'PIX_AUTOMATIC_AUTHORIZATION_CANCELLED':
        case 'PIX_AUTOMATIC_AUTHORIZATION_EXPIRED':
        case 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED':
        case 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED':
        case 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED': {
          const authorization = getAuthorization(payload)
          if (authorization?.id) {
            const failureReason = mapPixAutomaticFailureReason(eventName, payload.reason)
            const subscription = await prisma.billingSubscription.findFirst({
              where: { asaasId: authorization.id },
            })

            if (subscription) {
              await prisma.billingSubscription.update({
                where: { id: subscription.id },
                data: {
                  status: BillingSubscriptionStatus.FAILED,
                  isActive: false,
                  failureReason,
                  failureCount: { increment: 1 },
                  lastFailureAt: new Date(),
                  lastFailureMessage: payload.reason || eventName,
                },
              })

              billingLog('warn', 'PIX Automático authorization failed', {
                authId: authorization.id,
                failureReason,
                eventName,
              })
            }
          }
          break
        }

        default:
          billingLog('info', 'Ignoring unhandled billing webhook event', { eventName })
      }

      if (eventId) {
        await BillingAuditService.log({
          action: `WEBHOOK_${eventName}`,
          entity: 'BillingSubscription',
          entityId: eventId,
          asaasEventId: eventId,
          newState: payload,
        })
      }

      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      billingLog('error', 'Billing webhook processing failed', {
        eventId,
        eventName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
  }
}
