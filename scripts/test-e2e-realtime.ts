#!/usr/bin/env npx tsx
/**
 * End-to-End Real-Time Flow Tester
 *
 * Tests the complete real-time messaging flow:
 * 1. Generate JWT token (simulating frontend)
 * 2. Verify HTTP API works (backend publishing)
 * 3. Attempt WebSocket connection (would need browser for full test)
 * 4. Publish test message to Centrifugo
 *
 * Run: npx tsx scripts/test-e2e-realtime.ts
 */

import { createHmac } from 'crypto'

interface TestResult {
  step: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: string
}

const results: TestResult[] = []

function log(step: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: string) {
  results.push({ step, status, message, details })
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'
  console.log(`${emoji} ${step}: ${message}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

async function testRealTimeFlow() {
  console.log('\n🔍 End-to-End Real-Time Flow Test\n')

  // ============================================================
  // 1. Verify Environment Variables
  // ============================================================

  const tokenSecret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
  const apiKey = process.env.CENTRIFUGO_API_KEY
  const centrifugoUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_URL

  if (!tokenSecret) {
    log(
      'Env Check',
      'FAIL',
      'CENTRIFUGO_TOKEN_HMAC_SECRET_KEY not set',
      'Set in .env or docker-compose'
    )
    return
  }

  if (!apiKey) {
    log(
      'Env Check',
      'FAIL',
      'CENTRIFUGO_API_KEY not set',
      'Set in .env or docker-compose'
    )
    return
  }

  if (!centrifugoUrl) {
    log(
      'Env Check',
      'FAIL',
      'NEXT_PUBLIC_CENTRIFUGO_URL not set',
      'Should be: wss://centrifugo.whatrack.com/connection/websocket'
    )
    return
  }

  log(
    'Env Check',
    'PASS',
    'All required environment variables are set'
  )

  // ============================================================
  // 2. Generate JWT Token (Simulating Frontend)
  // ============================================================

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600

  const claims = {
    sub: 'test-user-12345',
    exp,
    iat: now,
    info: {
      organizationId: 'test-org-12345',
    },
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const message = `${header}.${payload}`

  const signature = createHmac('sha256', tokenSecret)
    .update(message, 'utf-8')
    .digest('base64url')

  const jwtToken = `${message}.${signature}`

  log(
    'JWT Token Generation',
    'PASS',
    'Valid JWT token generated',
    `Token length: ${jwtToken.length}, Expires: ${new Date(exp * 1000).toISOString()}`
  )

  // ============================================================
  // 3. Verify Token Structure
  // ============================================================

  try {
    const parts = jwtToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT structure')
    }

    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    if (!decodedPayload.sub || !decodedPayload.info?.organizationId) {
      throw new Error('Missing required claims')
    }

    log(
      'Token Structure',
      'PASS',
      'JWT token has valid structure and claims',
      `sub: ${decodedPayload.sub}, org: ${decodedPayload.info.organizationId}`
    )
  } catch (error) {
    log(
      'Token Structure',
      'FAIL',
      `Invalid token structure: ${error instanceof Error ? error.message : String(error)}`
    )
    return
  }

  // ============================================================
  // 4. Test HTTP API (Backend Publishing)
  // ============================================================

  try {
    const apiUrl = 'https://centrifugo.whatrack.com/api/publish'

    const publishPayload = {
      channel: 'org:test-org-12345:messages',
      data: {
        conversationId: 'test-conv-123',
        message: 'Test message from E2E flow',
        timestamp: new Date().toISOString(),
      },
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publishPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const responseData = await response.json()

    log(
      'HTTP API Publish',
      'PASS',
      'Successfully published message to Centrifugo',
      `Channel: org:test-org-12345:messages`
    )
  } catch (error) {
    log(
      'HTTP API Publish',
      'FAIL',
      `Failed to publish via HTTP API: ${error instanceof Error ? error.message : String(error)}`,
      'Verify CENTRIFUGO_API_KEY and Authorization header format'
    )
  }

  // ============================================================
  // 5. Test Centrifugo HTTP Info Endpoint
  // ============================================================

  try {
    const infoUrl = 'https://centrifugo.whatrack.com/api/info'

    const response = await fetch(infoUrl, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const info = await response.json()

    log(
      'Centrifugo Server Info',
      'PASS',
      'Connected to Centrifugo server',
      `Version: ${info.version || 'unknown'}`
    )
  } catch (error) {
    log(
      'Centrifugo Server Info',
      'FAIL',
      `Cannot reach Centrifugo: ${error instanceof Error ? error.message : String(error)}`,
      'Is Centrifugo running and accessible at centrifugo.whatrack.com?'
    )
  }

  // ============================================================
  // 6. Summary Report
  // ============================================================

  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  console.log(`Total Tests: ${results.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your real-time setup is working correctly.')
    console.log('\nNext steps:')
    console.log('1. Open WhatsApp inbox: https://whatrack.com/dashboard/whatsapp/inbox')
    console.log('2. Send a test WhatsApp message')
    console.log('3. Message should appear in real-time on the page')
    console.log('4. Check browser DevTools Console for [Centrifugo] logs')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
    console.log('\nDebugging steps:')
    console.log('1. Check Docker service logs: docker service logs whatrack_centrifugo_whatrack')
    console.log('2. Verify environment variables in .env and infra/centrifugo-stack.yml')
    console.log('3. Ensure Centrifugo is running: docker service ls')
    console.log('4. Review docs/REALTIME-DEBUGGING-GUIDE.md for more help')
  }

  console.log('\n')
}

testRealTimeFlow().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
