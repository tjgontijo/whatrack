import { prisma } from '@/lib/db/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import type { WhatsAppManualSendTemplateInput } from '@/schemas/whatsapp/whatsapp-schemas'

type ManualSendTemplateResult =
  | {
      success: true
      data: {
        configId: string
        phoneId: string
        displayPhone: string | null
        result: unknown
      }
    }
  | { success: false; error: string; status: number }

export async function sendManualTemplate(
  input: WhatsAppManualSendTemplateInput
): Promise<ManualSendTemplateResult> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { id: input.configId },
    select: {
      id: true,
      phoneId: true,
      accessToken: true,
      displayPhone: true,
    },
  })

  if (!config) {
    return { success: false, error: 'Instância não encontrada', status: 404 }
  }

  if (!config.phoneId) {
    return { success: false, error: 'Instância sem phoneId configurado', status: 400 }
  }

  const result = await MetaCloudService.sendTemplate({
    phoneId: config.phoneId,
    to: input.to,
    templateName: input.templateName,
    language: input.language,
    variables: input.variables,
    accessToken: MetaCloudService.getAccessTokenForConfig(config) || undefined,
  })

  return {
    success: true,
    data: {
      configId: config.id,
      phoneId: config.phoneId,
      displayPhone: config.displayPhone || null,
      result,
    },
  }
}
