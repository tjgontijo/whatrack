/**
 * Script de diagnóstico para testar o fluxo completo de real-time
 *
 * Executa: npx tsx scripts/test-realtime-flow.ts
 */

async function testCentrifugoConnection() {
  console.log('\n========================================')
  console.log('TESTE 1: Conexão com Centrifugo HTTP API')
  console.log('========================================\n')

  const url = process.env.CENTRIFUGO_URL
  const apiKey = process.env.CENTRIFUGO_API_KEY

  console.log('CENTRIFUGO_URL:', url || '❌ NÃO DEFINIDO')
  console.log('CENTRIFUGO_API_KEY:', apiKey ? '✅ Definido' : '❌ NÃO DEFINIDO')

  if (!url || !apiKey) {
    console.error('\n❌ Variáveis de ambiente não configuradas!')
    return false
  }

  // Teste 1: Verificar se o Centrifugo está acessível
  console.log('\n1.1 Testando acesso ao Centrifugo...')
  try {
    const infoResponse = await fetch(`${url}/api/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${apiKey}`,
      },
      body: JSON.stringify({}),
    })

    console.log('Status:', infoResponse.status)
    const infoText = await infoResponse.text()
    console.log('Response:', infoText)

    if (infoResponse.ok) {
      console.log('✅ Centrifugo acessível!')
    } else {
      console.log('❌ Centrifugo retornou erro:', infoResponse.status)
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao conectar:', error)
    return false
  }

  // Teste 2: Publicar mensagem de teste
  console.log('\n1.2 Testando publicação no namespace "org"...')
  const testChannel = 'org:test-org:debug'
  const testData = { test: true, timestamp: new Date().toISOString() }

  try {
    const publishResponse = await fetch(`${url}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${apiKey}`,
      },
      body: JSON.stringify({
        channel: testChannel,
        data: testData,
      }),
    })

    console.log('Status:', publishResponse.status)
    const publishText = await publishResponse.text()
    console.log('Response:', publishText)

    if (publishResponse.ok) {
      console.log('✅ Publicação funcionando!')
      return true
    } else {
      console.log('❌ Publicação falhou:', publishResponse.status)
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao publicar:', error)
    return false
  }
}

async function testPublishToCentrifugoFunction() {
  console.log('\n========================================')
  console.log('TESTE 2: Função publishToCentrifugo')
  console.log('========================================\n')

  // Importar a função
  const { publishToCentrifugo } = await import('../src/lib/centrifugo/server')

  const testChannel = 'org:test-org-id:messages'
  const testData = {
    type: 'message_created',
    conversationId: 'test-conversation',
    messageId: 'test-message',
    body: 'Teste de publicação',
    timestamp: new Date().toISOString(),
  }

  console.log('Canal:', testChannel)
  console.log('Dados:', JSON.stringify(testData, null, 2))

  try {
    const result = await publishToCentrifugo(testChannel, testData)

    if (result) {
      console.log('\n✅ publishToCentrifugo() retornou true!')
      return true
    } else {
      console.log('\n❌ publishToCentrifugo() retornou false!')
      return false
    }
  } catch (error) {
    console.error('\n❌ Erro na função:', error)
    return false
  }
}

async function checkEnvironmentVariables() {
  console.log('\n========================================')
  console.log('TESTE 0: Variáveis de Ambiente')
  console.log('========================================\n')

  const vars = [
    'CENTRIFUGO_URL',
    'CENTRIFUGO_API_KEY',
    'CENTRIFUGO_TOKEN_HMAC_SECRET_KEY',
    'NEXT_PUBLIC_CENTRIFUGO_URL',
  ]

  let allOk = true

  for (const v of vars) {
    const value = process.env[v]
    if (value) {
      // Mostrar parcialmente para debug
      const masked = v.includes('KEY') || v.includes('SECRET')
        ? value.substring(0, 8) + '...'
        : value
      console.log(`✅ ${v}: ${masked}`)
    } else {
      console.log(`❌ ${v}: NÃO DEFINIDO`)
      allOk = false
    }
  }

  return allOk
}

async function main() {
  console.log('🔍 DIAGNÓSTICO DO FLUXO REAL-TIME')
  console.log('==================================')
  console.log('Data:', new Date().toISOString())

  // Carregar .env
  const dotenv = await import('dotenv')
  dotenv.config()

  const envOk = await checkEnvironmentVariables()
  if (!envOk) {
    console.log('\n⚠️ Corrija as variáveis de ambiente antes de continuar')
  }

  const centrifugoOk = await testCentrifugoConnection()

  if (centrifugoOk) {
    await testPublishToCentrifugoFunction()
  }

  console.log('\n========================================')
  console.log('RESUMO')
  console.log('========================================')
  console.log('\nPróximos passos para debug:')
  console.log('1. Verifique os logs do servidor quando uma mensagem chega')
  console.log('2. Procure por: [MessageHandler] Publishing X events to Centrifugo')
  console.log('3. Procure por: [Centrifugo] Published to channel: org:xxx:messages')
  console.log('4. No browser DevTools, verifique se WebSocket está conectado')
  console.log('5. No browser Console, procure por: [Centrifugo] Message event:')
}

main().catch(console.error)
