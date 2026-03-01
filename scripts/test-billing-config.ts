#!/usr/bin/env npx tsx
/**
 * Test script to verify billing configuration
 * Usage: npx tsx scripts/test-billing-config.ts
 */

import { env } from '@/lib/env/env'
import { providerRegistry } from '@/lib/payments/providers/provider-registry'
import { AbacatepayProvider } from '@/lib/payments/providers/abacatepay-provider'

async function testBillingConfig() {
  console.log('\n🏥 Billing Configuration Diagnostic\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log(
    `  ABACATEPAY_SECRET_KEY: ${env.ABACATEPAY_SECRET_KEY ? env.ABACATEPAY_SECRET_KEY.substring(0, 15) + '...' : 'MISSING'}`
  )
  console.log(
    `  ABACATEPAY_WEBHOOK_SECRET: ${env.ABACATEPAY_WEBHOOK_SECRET ? '✓ Present' : 'MISSING'}`
  )
  console.log(
    `  ABACATEPAY_WEBHOOK_URL: ${env.ABACATEPAY_WEBHOOK_URL || 'https://whatrack.com/api/v1/billing/webhook'}`
  )

  // Check credentials type
  const isDevKey = env.ABACATEPAY_SECRET_KEY.includes('abc_dev_')
  const isProdKey = env.ABACATEPAY_SECRET_KEY.includes('abc_')

  console.log('\n🔑 Credential Type:')
  console.log(`  Environment: ${process.env.NODE_ENV}`)
  console.log(`  Is Development Key: ${isDevKey ? '✓ YES' : '✗ NO'}`)
  console.log(`  Is Production Key: ${isProdKey && !isDevKey ? '✓ YES' : '✗ NO'}`)

  if (isDevKey && process.env.NODE_ENV === 'production') {
    console.log(
      '\n⚠️  WARNING: Using development key in production environment!'
    )
    console.log('   This will cause checkout failures.\n')
  }

  // Initialize provider
  console.log('🚀 Initializing AbacatePay Provider:')
  try {
    const provider = new AbacatepayProvider(env.ABACATEPAY_SECRET_KEY)
    console.log(`  Provider ID: ${provider.getProviderId()}`)
    console.log(`  Is Configured: ${provider.isConfigured()}`)

    // Test plan configurations
    console.log('\n💰 Available Plans:')
    const plans = ['starter', 'pro', 'agency']
    for (const plan of plans) {
      try {
        // Access private method via type assertion
        const config = (provider as any).getPlanConfig(plan)
        console.log(`  ${plan}: ${config.name} - R$ ${(config.monthlyPrice / 100).toFixed(2)}`)
      } catch (e) {
        console.log(`  ${plan}: Error loading plan`)
      }
    }
  } catch (error) {
    console.log(
      `  ✗ Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Recommendations
  console.log('\n💡 Recommendations:\n')

  if (isDevKey && process.env.NODE_ENV === 'production') {
    console.log('  1. Get production AbacatePay credentials from dashboard')
    console.log('  2. Update Vercel environment variables with real keys')
    console.log('  3. Redeploy the application')
    console.log('  4. Test checkout flow')
  } else if (isDevKey) {
    console.log('  ✓ Development environment correctly configured')
  } else {
    console.log('  ✓ Production environment correctly configured')
  }

  console.log('\n✅ Configuration check complete\n')
}

testBillingConfig().catch((error) => {
  console.error('Failed to run diagnostic:', error)
  process.exit(1)
})
