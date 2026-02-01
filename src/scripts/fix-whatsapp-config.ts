import 'dotenv/config';
import { PrismaClient } from '../../prisma/generated/prisma/client';

async function fixWhatsAppConfig() {
    const prisma = new PrismaClient();

    const newToken = process.env.META_ACCESS_TOKEN;
    const wabaId = process.env.META_WABA_ID;
    const phoneId = process.env.META_PHONE_ID;

    if (!newToken || !wabaId || !phoneId) {
        console.error('❌ Variáveis META_ACCESS_TOKEN, META_WABA_ID ou META_PHONE_ID não definidas no .env');
        return;
    }

    console.log('Atualizando registro no banco de dados...');
    console.log('Novo Token (15 chars):', newToken.substring(0, 15) + '...');
    console.log('WABA ID:', wabaId);
    console.log('Phone ID:', phoneId);

    try {
        const result = await prisma.whatsAppConfig.updateMany({
            data: {
                accessToken: newToken,
                wabaId: wabaId,
                phoneId: phoneId,
            }
        });

        console.log('✅ Atualizado com sucesso!', result.count, 'registro(s)');
    } catch (error: any) {
        console.error('❌ Erro:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixWhatsAppConfig();
