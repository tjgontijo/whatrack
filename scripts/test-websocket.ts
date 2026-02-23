/**
 * Test WebSocket connection to Centrifugo
 * Run: npx tsx scripts/test-websocket.ts
 */

async function testWebSocket() {
  console.log('🔍 Testando WebSocket Centrifugo\n')

  const token = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
  const url = process.env.NEXT_PUBLIC_CENTRIFUGO_URL

  if (!token || !url) {
    console.error('❌ Variáveis de ambiente não definidas')
    console.log('Precisa de:')
    console.log('  - CENTRIFUGO_TOKEN_HMAC_SECRET_KEY')
    console.log('  - NEXT_PUBLIC_CENTRIFUGO_URL')
    return
  }

  console.log('URL:', url)
  console.log('Token Secret:', token.substring(0, 8) + '...\n')

  // Gerar JWT token como o frontend faz
  const { createHmac } = await import('crypto')

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600

  const claims = {
    sub: 'test-user',
    exp,
    iat: now,
    info: {
      organizationId: 'test-org',
    },
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const message = `${header}.${payload}`

  const signature = createHmac('sha256', token).update(message, 'utf-8').digest('base64url')

  const jwtToken = `${message}.${signature}`

  console.log('✅ JWT Token gerado\n')

  // Testar conexão HTTP (deve funcionar antes do WS)
  console.log('1️⃣ Testando HTTP API...')
  try {
    const response = await fetch('https://centrifugo.whatrack.com/api/info', {
      method: 'POST',
      headers: {
        Authorization: 'apikey 7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (response.ok) {
      console.log('✅ HTTP API funciona\n')
    } else {
      console.log('❌ HTTP API falhou:', response.status, '\n')
      return
    }
  } catch (error) {
    console.log('❌ Erro ao testar HTTP:', error, '\n')
    return
  }

  // Testar WebSocket
  console.log('2️⃣ Testando WebSocket...')
  console.log('URL:', url)
  console.log('Token:', jwtToken.substring(0, 20) + '...\n')

  try {
    const ws = new WebSocket(url, undefined, {
      headers: {
        // Note: headers don't work in browser, but might work in Node.js
      },
    })

    let connected = false

    ws.on('open', () => {
      console.log('✅ WebSocket aberto!\n')
      connected = true

      // Enviar connect command
      console.log('3️⃣ Enviando comando connect...')
      ws.send(
        JSON.stringify({
          id: 1,
          connect: {
            token: jwtToken,
          },
        })
      )
    })

    ws.on('message', (data: any) => {
      const message = JSON.parse(data.toString())
      console.log('📨 Mensagem recebida:')
      console.log(JSON.stringify(message, null, 2))

      if (message.connect) {
        console.log('\n✅✅✅ CONECTADO AO CENTRIFUGO COM SUCESSO!')
        console.log('client:', message.connect.client)
        console.log('version:', message.connect.version)
      }

      ws.close()
    })

    ws.on('error', (error) => {
      console.error('❌ Erro WebSocket:', error)
      console.log('\nDica: Se diz "no protocol handler found" ou similar,')
      console.log('o problema é que Node.js não tem suporte nativo para WebSocket.')
      console.log('Teste no navegador em vez disso!')
    })

    ws.on('close', () => {
      if (!connected) {
        console.log('❌ WebSocket não conseguiu conectar')
      }
    })

    // Timeout
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }, 5000)
  } catch (error) {
    console.error('❌ Erro ao criar WebSocket:', error)
  }
}

testWebSocket().catch(console.error)
