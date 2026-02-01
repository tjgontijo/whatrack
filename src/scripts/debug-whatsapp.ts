import 'dotenv/config';
import { PrismaClient } from '../../prisma/generated/prisma/client';

async function debugWhatsAppConfig() {
    console.log('=== DEPURAÇÃO COMPLETA ===\n');

    // 1. Verificar variáveis de ambiente
    console.log('1. VARIÁVEIS DE AMBIENTE (.env):');
    console.log('   META_ACCESS_TOKEN (15 chars):', process.env.META_ACCESS_TOKEN?.substring(0, 15) + '...');
    console.log('   META_WABA_ID:', process.env.META_WABA_ID);
    console.log('   META_PHONE_ID:', process.env.META_PHONE_ID);
    console.log('   META_APP_ID:', process.env.META_APP_ID);

    // 2. Verificar banco de dados
    console.log('\n2. BANCO DE DADOS (whatsapp_configs):');
    const prisma = new PrismaClient();

    try {
        const configs = await prisma.$queryRaw`SELECT id, "organizationId", "wabaId", "phoneId", LEFT("accessToken", 15) as token_prefix, status FROM "whatsapp_configs"`;

        if (Array.isArray(configs) && configs.length > 0) {
            console.log('   Registros encontrados:', configs.length);
            configs.forEach((c: any, i: number) => {
                console.log(`   [${i}] orgId: ${c.organizationId}`);
                console.log(`       wabaId: ${c.wabaId}`);
                console.log(`       phoneId: ${c.phoneId}`);
                console.log(`       token (15 chars): ${c.token_prefix}...`);
                console.log(`       status: ${c.status}`);
            });
        } else {
            console.log('   Nenhum registro encontrado.');
        }
    } catch (error: any) {
        console.log('   Erro ao consultar:', error.message);
    } finally {
        await prisma.$disconnect();
    }

    // 3. Testar chamada real para Meta
    console.log('\n3. TESTE DE CHAMADA PARA META API:');
    const token = process.env.META_ACCESS_TOKEN;
    const wabaId = process.env.META_WABA_ID;

    if (!token || !wabaId) {
        console.log('   ERRO: Token ou WABA ID não definidos no .env');
        return;
    }

    const url = `https://graph.facebook.com/v24.0/${wabaId}/phone_numbers`;
    console.log('   URL:', url);

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            console.log('   ✅ SUCESSO! Números encontrados:', data.data?.length);
            console.log('   Dados:', JSON.stringify(data.data, null, 2));
        } else {
            console.log('   ❌ ERRO DA META:', data.error?.message);
        }
    } catch (error: any) {
        console.log('   ❌ ERRO DE REDE:', error.message);
    }

    console.log('\n=== FIM DA DEPURAÇÃO ===');
}

debugWhatsAppConfig();
