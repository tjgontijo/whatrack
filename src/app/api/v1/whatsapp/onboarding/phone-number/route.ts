import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const PhoneNumberSchema = z.object({
  state: z.string().min(1, 'state is required'),
  phoneNumberId: z.string().min(1, 'phoneNumberId is required'),
  wabaId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = PhoneNumberSchema.safeParse(body)

    if (!validation.success) {
      return apiError('Invalid request body', 400)
    }

    const { state, phoneNumberId, wabaId } = validation.data

    logger.info(
      { body, state: state.substring(0, 10), phoneNumberId, wabaId },
      '[OnboardingPhoneNumber] 🔍 Recording data from Embedded Signup postMessage'
    )

    // Find the onboarding session first
    const onboarding = await prisma.whatsAppOnboarding.findUnique({
      where: { trackingCode: state },
    })

    if (!onboarding) {
      logger.warn(
        { state: state.substring(0, 10) },
        '[OnboardingPhoneNumber] ⚠️ No onboarding session found for this state'
      )
      return apiError('Onboarding session not found', 404)
    }

    // Update onboarding record
    const updated = await prisma.whatsAppOnboarding.update({
      where: { trackingCode: state },
      data: { 
        phoneNumberId,
        ...(wabaId ? { wabaId } : {})
      },
    })

    // If we have wabaId, we can proactively create the WhatsAppConnection and WhatsAppConfig!
    // This is crucial for the Hosted ES flow where the OAuth callback isn't hit.
    if (wabaId) {
      logger.info(`[OnboardingPhoneNumber] Processing WABA ${wabaId} for Hosted ES flow`)
      try {
        // 1. Ensure WhatsAppConnection exists (it might also be created by Webhook soon, but we do it now)
        await prisma.whatsAppConnection.upsert({
          where: {
            organizationId_wabaId: {
              organizationId: onboarding.organizationId,
              wabaId: wabaId,
            },
          },
          create: {
            organizationId: onboarding.organizationId,
            projectId: onboarding.projectId,
            wabaId: wabaId,
            status: 'active',
            connectedAt: new Date(),
            healthStatus: 'healthy',
            phoneNumberId,
          },
          update: {
            status: 'active',
            connectedAt: new Date(),
            healthStatus: 'healthy',
            disconnectedAt: null,
            phoneNumberId,
          },
        })

        // 2. We use MetaCloudService (which defaults to System User Token) to fetch phone details
        const { MetaCloudService } = await import('@/services/whatsapp/meta-cloud.service')
        
        let phones: Array<{ id: string; display_phone_number?: string; verified_name?: string }> = []
        try {
          phones = await MetaCloudService.listPhoneNumbers({ wabaId })
        } catch (e) {
          logger.warn({ err: e }, '[OnboardingPhoneNumber] Failed to fetch phones from Meta')
        }

        // 3. Filter exactly to the selected phone_number_id
        const targetPhone = phones.find(p => p.id === phoneNumberId)
        
        if (targetPhone) {
          // 4. Create the WhatsAppConfig for this phone
          await prisma.whatsAppConfig.upsert({
            where: { phoneId: phoneNumberId },
            create: {
              organizationId: onboarding.organizationId,
              projectId: onboarding.projectId,
              wabaId,
              phoneId: phoneNumberId,
              displayPhone: targetPhone.display_phone_number || 'Unknown',
              verifiedName: targetPhone.verified_name || 'WhatsApp Business',
              status: 'connected',
              tokenStatus: 'valid',
              connectedAt: new Date(),
            },
            update: {
              organizationId: onboarding.organizationId,
              projectId: onboarding.projectId,
              wabaId,
              displayPhone: targetPhone.display_phone_number || 'Unknown',
              verifiedName: targetPhone.verified_name || 'WhatsApp Business',
              status: 'connected',
              tokenStatus: 'valid',
            },
          })
          
          logger.info(`[OnboardingPhoneNumber] ✅ WhatsAppConfig created for phone ${phoneNumberId}`)
        } else {
          logger.warn(`[OnboardingPhoneNumber] ⚠️ Phone ${phoneNumberId} not found in WABA ${wabaId} via Meta API`)
        }
      } catch (err) {
        logger.error({ err }, '[OnboardingPhoneNumber] Error creating connection/config proactively')
      }
    }

    return apiSuccess({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[OnboardingPhoneNumber] Error')
    return apiError('Internal server error', 500, error)
  }
}
