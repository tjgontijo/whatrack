import { prisma } from './src/lib/db/prisma'
import { MetaCloudService } from './src/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from './src/lib/whatsapp/token-crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function run() {
  const configId = '9f04dc7e-a7fd-4f4f-9880-8ad9744dea83' // The pending Dra Tatiana Gontijo
  const config = await prisma.whatsAppConfig.findUnique({
    where: { id: configId },
  })

  if (!config) {
    console.log('Config not found')
    return
  }

  const plainToken = resolveAccessToken(config.accessToken)

  if (!plainToken) {
    console.log('Failed to decrypt token')
    return
  }

  try {
    const debug = await MetaCloudService.debugToken(plainToken)
    console.log('--- DEBUG TOKEN ---')
    console.log(JSON.stringify(debug, null, 2))

    const sharedPhones = await MetaCloudService.getSharedPhoneNumbers(plainToken)
    console.log('--- SHARED PHONES ---')
    console.log(sharedPhones)

    const wabaId = config.wabaId!
    const wabas = await MetaCloudService.listWabas(plainToken)
    console.log('--- WABAS ---')
    console.log(wabas)

    const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken: plainToken })
    console.log('--- PHONES FOR WABA', wabaId, '---')
    console.log(phones)
  } catch (error) {
    console.error('ERROR during API calls:', error)
  }
}

run().catch(console.error).finally(() => process.exit(0))
