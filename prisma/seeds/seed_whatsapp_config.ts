import type { PrismaClient } from '../generated/prisma/client'

/**
 * Seed de configuração WhatsApp para desenvolvimento.
 * 
 * Este seed lê as variáveis do .env (META_WABA_ID, META_PHONE_ID, META_ACCESS_TOKEN)
 * e cria uma configuração WhatsApp para a primeira organização existente.
 * 
 * Em produção, essas configurações serão inseridas via onboarding do cliente.
 */
export async function seedWhatsAppConfig(prisma: PrismaClient) {
    console.log('📱 Seeding WhatsApp config...')

    // Buscar credenciais do .env
    const wabaId = process.env.META_WABA_ID
    const phoneId = process.env.META_PHONE_ID
    const accessToken = process.env.META_ACCESS_TOKEN

    if (!wabaId || !phoneId || !accessToken) {
        console.log('⚠️  Variáveis META_WABA_ID, META_PHONE_ID ou META_ACCESS_TOKEN não encontradas no .env')
        console.log('   Pulando seed de WhatsApp config...')
        return
    }

    // Buscar a primeira organização existente
    const organization = await prisma.organization.findFirst({
        orderBy: { createdAt: 'asc' }
    })

    if (!organization) {
        console.log('⚠️  Nenhuma organização encontrada no banco de dados.')
        console.log('   Crie uma organização primeiro (via sign-up) e rode o seed novamente.')
        return
    }

    // Verificar se já existe uma config para essa org com esse phoneId
    const existingConfig = await prisma.whatsAppConfig.findFirst({
        where: {
            organizationId: organization.id,
            phoneId,
        }
    })

    let config
    if (existingConfig) {
        config = await prisma.whatsAppConfig.update({
            where: { id: existingConfig.id },
            data: {
                wabaId,
                phoneId,
                accessToken,
                status: 'connected',
            },
        })
    } else {
        config = await prisma.whatsAppConfig.create({
            data: {
                organizationId: organization.id,
                wabaId,
                phoneId,
                accessToken,
                status: 'connected',
            },
        })
    }

    console.log(`✅ WhatsApp config criado/atualizado para organização: ${organization.name}`)
    console.log(`   - WABA ID: ${wabaId}`)
    console.log(`   - Phone ID: ${phoneId}`)
    console.log(`   - Access Token: ${accessToken.substring(0, 12)}...`)
    console.log(`   - Status: ${config.status}`)
}
