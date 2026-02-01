import 'dotenv/config';

const API_VERSION = process.env.META_API_VERSION || 'v24.0';
const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}`;

async function activateTestNumber() {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_ID;
    const wabaId = process.env.META_WABA_ID;

    if (!accessToken || !phoneId || !wabaId) {
        console.error('❌ Variáveis META_ACCESS_TOKEN, META_PHONE_ID ou META_WABA_ID não definidas no .env');
        return;
    }

    console.log('=== ATIVAÇÃO DO NÚMERO DE TESTE ===\n');
    console.log('Phone ID:', phoneId);
    console.log('WABA ID:', wabaId);
    console.log('API Version:', API_VERSION);

    // ========================================
    // PASSO 1: Registrar o número de telefone
    // POST /{phone-number-id}/register
    // ========================================
    console.log('\n--- PASSO 1: Registrar Número ---');
    const registerUrl = `${GRAPH_API_URL}/${phoneId}/register`;
    console.log('URL:', registerUrl);

    try {
        const registerResponse = await fetch(registerUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                pin: '123456', // PIN de 6 dígitos (necessário para two-step verification)
            }),
        });

        const registerData = await registerResponse.json();

        if (registerResponse.ok) {
            console.log('✅ Número registrado com sucesso!');
            console.log('Resposta:', JSON.stringify(registerData, null, 2));
        } else {
            console.log('⚠️ Resposta do registro:');
            console.log(JSON.stringify(registerData, null, 2));
            // Continua mesmo com erro, pois pode já estar registrado
        }
    } catch (error: any) {
        console.error('❌ Erro no registro:', error.message);
    }

    // ========================================
    // PASSO 2: Assinar o App no Webhook
    // POST /{waba-id}/subscribed_apps
    // ========================================
    console.log('\n--- PASSO 2: Assinar App (Webhook) ---');
    const subscribeUrl = `${GRAPH_API_URL}/${wabaId}/subscribed_apps`;
    console.log('URL:', subscribeUrl);

    try {
        const subscribeResponse = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const subscribeData = await subscribeResponse.json();

        if (subscribeResponse.ok) {
            console.log('✅ App assinado com sucesso!');
            console.log('Resposta:', JSON.stringify(subscribeData, null, 2));
        } else {
            console.log('❌ Erro ao assinar app:');
            console.log(JSON.stringify(subscribeData, null, 2));
        }
    } catch (error: any) {
        console.error('❌ Erro na assinatura:', error.message);
    }

    // ========================================
    // PASSO 3: Verificar status final
    // GET /{phone-number-id}
    // ========================================
    console.log('\n--- PASSO 3: Verificar Status Final ---');
    const statusUrl = `${GRAPH_API_URL}/${phoneId}?fields=display_phone_number,verified_name,code_verification_status,name_status,status,account_mode`;
    console.log('URL:', statusUrl);

    try {
        const statusResponse = await fetch(statusUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        const statusData = await statusResponse.json();

        if (statusResponse.ok) {
            console.log('✅ Status do número:');
            console.log(JSON.stringify(statusData, null, 2));
        } else {
            console.log('❌ Erro ao verificar status:');
            console.log(JSON.stringify(statusData, null, 2));
        }
    } catch (error: any) {
        console.error('❌ Erro:', error.message);
    }

    console.log('\n=== ATIVAÇÃO CONCLUÍDA ===');
    console.log('Agora tente enviar uma mensagem de teste novamente!');
}

activateTestNumber();
