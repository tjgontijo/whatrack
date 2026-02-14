import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service'

/**
 * Script para importar manualmente a conexão de produção
 * Uso: npx tsx src/scripts/import-prod.ts
 */
async function importProd() {
    const WABA_ID = '1371816490827359'
    const ORG_ID = 'vwthk3fmomeuf8w4ax3kt0pl' // Seu ID de organização

    console.log(`🚀 Iniciando importação do WABA ${WABA_ID}...`)

    try {
        const token = process.env.META_ACCESS_TOKEN
        if (!token) throw new Error('META_ACCESS_TOKEN não configurada no .env')

        // 1. Buscar detalhes na Meta
        const url = `https://graph.facebook.com/v24.0/${WABA_ID}/phone_numbers`
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(`Erro Meta: ${JSON.stringify(err)}`)
        }

        const { data } = await response.json()
        if (!data || data.length === 0) {
            throw new Error('Nenhum número de telefone encontrado neste WABA.')
        }

        const phone = data[0]
        console.log(`📱 Número encontrado: ${phone.display_phone_number} (ID: ${phone.id})`)

        // 2. Salvar no Banco
        const config = await prisma.whatsAppConfig.upsert({
            where: { phoneId: phone.id },
            update: {
                wabaId: WABA_ID,
                status: 'connected',
                verifiedName: phone.verified_name,
                displayPhone: phone.display_phone_number,
                updatedAt: new Date(),
            },
            create: {
                organizationId: ORG_ID,
                wabaId: WABA_ID,
                phoneId: phone.id,
                status: 'connected',
                verifiedName: phone.verified_name,
                displayPhone: phone.display_phone_number,
            }
        })

        console.log('✅ Configuração salva com sucesso no banco!')
        console.log('Dados salvos:', config)

    } catch (error) {
        console.error('❌ Falha na importação:', error)
    } finally {
        await prisma.$disconnect()
    }
}

importProd()
