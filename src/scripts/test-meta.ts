import 'dotenv/config';

async function testMetaConnection() {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const wabaId = process.env.META_WABA_ID;
    const version = process.env.META_API_VERSION || 'v24.0';

    console.log('--- Configuração Detectada ---');
    console.log('WABA ID:', wabaId);
    console.log('API Version:', version);
    console.log('Token (Primeiros 10 chars):', accessToken?.substring(0, 10) + '...');

    if (!accessToken || !wabaId) {
        console.error('ERRO: META_ACCESS_TOKEN ou META_WABA_ID não encontrados no .env');
        return;
    }

    const url = `https://graph.facebook.com/${version}/${wabaId}/phone_numbers`;
    console.log('\n--- Chamando Meta API ---');
    console.log('URL:', url);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCESSO!');
            console.log('Instâncias encontradas:', data.data?.length || 0);
            if (data.data) {
                data.data.forEach((p: any) => console.log(` - ${p.display_phone_number} (ID: ${p.id})`));
            }
        } else {
            console.log('❌ ERRO DA META:');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ ERRO NA REQUISIÇÃO:', error);
    }
}

testMetaConnection();
