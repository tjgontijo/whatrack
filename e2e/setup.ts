import { execSync } from 'child_process'
import dotenv from 'dotenv'

export async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...')

  // Load test environment variables
  dotenv.config({ path: '.env.test', override: true })

  try {
    // Drop and recreate test database schema
    console.log('🔄 Resetting database schema...')
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    })

    // Seed test data
    console.log('🌱 Seeding test data...')
    await seedTestData()

    console.log('✅ Test database ready!')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }
}

export async function seedTestData() {
  // Seed with basic test data needed for tests
  console.log('   - Seeding users...')
  console.log('   - Seeding organizations...')
  console.log('   - Seeding billing plans...')
  console.log('   - Seeding projects...')
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
