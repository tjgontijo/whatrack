import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function debugWhatsAppConfig() {
    console.log('=== DEPURAÇÃO COMPLETA ===\n');

    // 1. Verificar variáveis de ambiente
    console.log('1. VARIÁVEIS DE AMBIENTE (.env):');
    console.log('   META_ACCESS_TOKEN (15 chars):', process.env.META_ACCESS_TOKEN?.substring(0, 15) + '...');
    console.log('   META_WABA_ID:', process.env.META_WABA_ID);
    console.log('   META_PHONE_ID:', process.env.META_PHONE_ID);
    console.log('   META_APP_ID:', process.env.META_APP_ID);

    // 3. Verificar Organizações e suas Configurações
    console.log('\n3. ORGANIZAÇÕES E CONFIGS:');
    try {
        const orgs = await prisma.organization.findMany({
            include: {
                whatsappConfig: true
            }
        });
        orgs.forEach(o => {
            console.log(`   - Org: ${o.name} (ID: ${o.id})`);
            if (o.whatsappConfig && o.whatsappConfig.length > 0) {
                o.whatsappConfig.forEach((conf, idx) => {
                    console.log(`       [Config #${idx + 1}]`);
                    console.log(`       - WhatsApp Config ID: ${conf.id}`);
                    console.log(`       - WABA ID: ${conf.wabaId}`);
                    console.log(`       - Phone ID: ${conf.phoneId}`);
                    console.log(`       - Status: ${conf.status}`);
                });
            } else {
                console.log('       - (Sem configuração de WhatsApp)');
            }
        });
    } catch (error: any) {
        console.log('   Erro ao consultar organizações:', error.message);
    }

    // 4. Verificar Membros e Usuários
    console.log('\n4. MEMBROS E USUÁRIOS:');
    try {
        const members = await prisma.member.findMany({
            include: { user: true }
        });
        members.forEach(m => {
            console.log(`   - Org ID: ${m.organizationId}, User: ${m.user.name} (Role: ${m.role})`);
        });
    } catch (error: any) {
        console.log('   Erro ao consultar membros:', error.message);
    }

    // 5. Verificar Sessões
    console.log('\n5. SESSÕES:');
    try {
        const sessions = await prisma.session.findMany();
        sessions.forEach(s => {
            console.log(`   - Session Token: ${s.token.substring(0, 10)}...`);
            console.log(`     Active Org ID: ${s.activeOrganizationId}`);
            console.log(`     Expires: ${s.expiresAt}`);
        });
    } catch (error: any) {
        console.log('   Erro ao consultar sessões:', error.message);
    }

    // 5. Testar chamada real para Meta
    console.log('\n5. TESTE DE CHAMADA PARA META API:');
    const token = process.env.META_ACCESS_TOKEN;
    const wabaId = process.env.META_WABA_ID;

    if (!token || !wabaId) {
        console.log('   ERRO: Token ou WABA ID não definidos no .env');
        return;
    }

    const url = `https://graph.facebook.com/v24.0/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,status,quality_rating,throughput`;
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
