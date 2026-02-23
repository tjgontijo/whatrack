#!/usr/bin/env npx tsx
/**
 * Test publishing a message to Centrifugo
 * This simulates what happens when a WhatsApp message arrives
 *
 * Run: npx tsx scripts/test-publish-message.ts
 */

import { createHmac } from 'crypto'

async function publishTestMessage() {
  console.log('📤 Testando publicação de mensagem no Centrifugo\n')

  const apiKey = process.env.CENTRIFUGO_API_KEY
  const organizationId = 'caf5eb44-6e27-4242-9e06-1c2c07a31ce6' // Use real org ID if testing

  if (!apiKey) {
    console.error('❌ CENTRIFUGO_API_KEY não definida')
    return
  }

  try {
    // 1. Publish message to messages channel
    console.log('1️⃣ Publicando para org:xxx:messages...')
    const messagePayload = {
      channel: `org:${organizationId}:messages`,
      data: {
        conversationId: 'conv-123456',
        message: `Test message at ${new Date().toISOString()}`,
        sender: 'test-user',
        timestamp: new Date().toISOString(),
      },
    }

    let response = await fetch('https://centrifugo.whatrack.com/api/publish', {
      method: 'POST',
      headers: {
        Authorization: `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Publish failed: ${response.status} - ${error}`)
    }

    console.log('✅ Mensagem publicada com sucesso!')
    console.log(`   Canal: org:${organizationId}:messages`)
    console.log(`   Dados: ${JSON.stringify(messagePayload.data)}\n`)

    // 2. Publish ticket update
    console.log('2️⃣ Publicando para org:xxx:tickets...')
    const ticketPayload = {
      channel: `org:${organizationId}:tickets`,
      data: {
        conversationId: 'conv-123456',
        status: 'open',
        updatedAt: new Date().toISOString(),
      },
    }

    response = await fetch('https://centrifugo.whatrack.com/api/publish', {
      method: 'POST',
      headers: {
        Authorization: `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Publish failed: ${response.status} - ${error}`)
    }

    console.log('✅ Atualização de ticket publicada com sucesso!')
    console.log(`   Canal: org:${organizationId}:tickets\n`)

    console.log('🎉 Ambas as publicações foram bem-sucedidas!')
    console.log('\n📋 Próximos passos:')
    console.log('1. Abra https://whatrack.com/centrifugo-test.html')
    console.log('2. Clique em "Conectar"')
    console.log('3. Clique em "Se Inscrever"')
    console.log('4. Execute este script novamente')
    console.log('5. Você deve ver a mensagem aparecer em tempo real no teste!')
  } catch (error) {
    console.error('❌ Erro ao publicar:', error instanceof Error ? error.message : String(error))
    console.log('\n📖 Dicas de debug:')
    console.log('- Verifique se CENTRIFUGO_API_KEY está correta em .env')
    console.log('- Verifique se Centrifugo está rodando: docker service ls')
    console.log('- Verifique os logs: docker service logs whatrack_centrifugo_whatrack')
  }
}

publishTestMessage().catch(console.error)
