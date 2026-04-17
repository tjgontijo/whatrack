import { execSync } from 'child_process'
import dotenv from 'dotenv'

const E2E_PRISMA_SCHEMA = 'prisma/schema.prisma'

export async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...')

  // Load test environment variables
  dotenv.config({ path: '.env.test', override: true })

  try {
    // Reset schema against dedicated Postgres test database.
    console.log('🔄 Resetting database schema...')
    execSync(`npx prisma db push --schema ${E2E_PRISMA_SCHEMA} --force-reset`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    })

    // Seed lookup/billing/system data required by signup and onboarding flows.
    console.log('🌱 Seeding database...')
    execSync('node --import tsx/esm prisma/seed.ts', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    })

    console.log('✅ Test database ready!')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }
}

export async function seedTestData() {
  // Intentionally disabled for now. Seed data will be recreated per test flow.
  return
}

export async function teardownTestDatabase() {
  console.log('🧹 Cleaning up test database...')
  // Optionally reset schema after tests if needed
  console.log('✅ Test cleanup complete')
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestDatabase().catch((error) => {
    console.error('Setup failed:', error)
    process.exit(1)
  })
}
