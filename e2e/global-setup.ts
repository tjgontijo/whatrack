import dotenv from 'dotenv'
import { setupTestDatabase, teardownTestDatabase } from './setup'

// Load shared environment variables and map test DB
dotenv.config({ path: '.env' })
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

export async function globalSetup() {
  console.log('\n🚀 Starting E2E test suite...')
  console.log('━'.repeat(50))

  // Setup test database
  await setupTestDatabase()

  console.log('━'.repeat(50))
  console.log('✅ Global setup complete\n')

  return async () => {
    // Cleanup after all tests
    console.log('\n🧹 Cleaning up after tests...')
    await teardownTestDatabase()
  }
}

export default globalSetup
