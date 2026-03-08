#!/usr/bin/env node

/**
 * Script para criar produtos e preços na Stripe automaticamente
 *
 * Uso:
 *   npx tsx scripts/setup-stripe-products.ts
 *
 * Este script:
 * 1. Cria 3 produtos (Starter, Pro, Agency)
 * 2. Cria preço mensal recorrente para cada um
 * 3. Salva os IDs no .env.local
 *
 * Requer: STRIPE_SECRET_KEY definida no .env
 */

import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-27',
})

interface ProductConfig {
  name: string
  description: string
  monthlyPrice: number
  envVar: string
}

const PRODUCTS: ProductConfig[] = [
  {
    name: 'Starter',
    description: '200 events/month - Perfect for getting started',
    monthlyPrice: 9700, // R$ 97,00 em centavos
    envVar: 'STRIPE_PRICE_STARTER',
  },
  {
    name: 'Pro',
    description: '500 events/month - Scale your usage',
    monthlyPrice: 19700, // R$ 197,00 em centavos
    envVar: 'STRIPE_PRICE_PRO',
  },
  {
    name: 'Agency',
    description: '5000 events/month - Enterprise-grade',
    monthlyPrice: 49700, // R$ 497,00 em centavos
    envVar: 'STRIPE_PRICE_AGENCY',
  },
]

async function createProduct(config: ProductConfig) {
  console.log(`\n📦 Creating product: ${config.name}...`)

  // 1. Criar produto
  const product = await stripe.products.create({
    name: config.name,
    description: config.description,
    type: 'service',
    metadata: {
      plan_type: config.name.toLowerCase(),
    },
  })

  console.log(`   ✅ Product created: ${product.id}`)

  // 2. Criar preço mensal recorrente
  console.log(`   💰 Creating monthly price...`)

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: config.monthlyPrice,
    currency: 'brl',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    billing_scheme: 'per_unit',
  })

  console.log(`   ✅ Price created: ${price.id}`)

  return {
    productId: product.id,
    priceId: price.id,
    envVar: config.envVar,
  }
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in environment')
    process.exit(1)
  }

  console.log('🚀 WhaTrack Stripe Products Setup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const results: Array<{ productId: string; priceId: string; envVar: string }> = []

  try {
    // Criar todos os produtos
    for (const config of PRODUCTS) {
      const result = await createProduct(config)
      results.push(result)
    }

    // Gerar .env.local com os resultados
    console.log('\n📝 Generating .env.local...\n')

    let envContent = ''
    for (const result of results) {
      envContent += `${result.envVar}=${result.priceId}\n`
      console.log(`${result.envVar}=${result.priceId}`)
    }

    const envPath = path.join(process.cwd(), '.env.local')

    // Ler conteúdo atual se existir
    let existingContent = ''
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, 'utf-8')
    }

    // Remover antigas linhas STRIPE_PRICE_*
    const updatedContent = existingContent
      .split('\n')
      .filter((line) => !line.startsWith('STRIPE_PRICE_'))
      .join('\n')
      .trim()

    // Escrever novo conteúdo
    const finalContent = `${updatedContent}\n\n${envContent}`
    fs.writeFileSync(envPath, finalContent)

    console.log(`\n✅ .env.local updated successfully`)
    console.log(`\nFile location: ${envPath}`)

    console.log('\n📋 Summary:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const result of results) {
      console.log(`Product: ${result.productId}`)
      console.log(`Price ID: ${result.priceId}`)
      console.log(`Env Var: ${result.envVar}\n`)
    }

    console.log('✨ Setup complete! Products are ready to use.')
    console.log('\nNext steps:')
    console.log('1. Verify the .env.local file was updated')
    console.log('2. Register the webhook in Stripe Dashboard:')
    console.log('   URL: https://your-domain.com/api/v1/billing/webhooks/stripe')
    console.log('3. Run: npm run build && npm run dev')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
