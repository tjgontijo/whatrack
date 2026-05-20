import path from 'node:path'
import dotenv from 'dotenv'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Load environment variables for the test environment
dotenv.config({ path: path.resolve(__dirname, '.env') })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@generated/prisma/client': path.resolve(__dirname, 'prisma/generated/prisma/index.js'),
      '@generated/prisma': path.resolve(__dirname, 'prisma/generated/prisma/index.js'),
      'server-only': path.resolve(__dirname, 'vitest.server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
