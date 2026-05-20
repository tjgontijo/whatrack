import path from 'node:path'
import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths() as PluginOption, react() as PluginOption],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@generated/prisma/client': path.resolve(__dirname, 'prisma/generated/prisma/index.js'),
      '@generated/prisma': path.resolve(__dirname, 'prisma/generated/prisma/index.js'),
      'server-only': path.resolve(__dirname, 'vitest.server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/whatsapp/uazapi/**/*.ts'],
      exclude: ['**/__tests__/**', '**/index.ts', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 60,
        statements: 80,
      },
    },
  },
})
