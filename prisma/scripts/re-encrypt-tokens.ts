/**
 * Re-encryption Migration Script
 *
 * Re-encrypts all MetaConnection tokens from an old key version to the current version.
 *
 * Usage:
 *   npx tsx prisma/scripts/re-encrypt-tokens.ts
 *
 * Environment variables required:
 *   DATABASE_URL                  — PostgreSQL connection string
 *   TOKEN_ENCRYPTION_KEY          — v1 key (64-char hex)
 *   ENCRYPTION_KEYS               — JSON with all key versions: {"v1":"hex...","v2":"hex..."}
 *   ENCRYPTION_CURRENT_VERSION    — Target version for re-encryption (e.g. "v2")
 *
 * This script is idempotent — tokens already on the current version are skipped.
 */

import { PrismaClient } from '../../prisma/generated/prisma'
import { encryption } from '../../src/lib/encryption'

const prisma = new PrismaClient()

async function main() {
  console.log('[ReEncrypt] Starting token re-encryption migration...')
  console.log(`[ReEncrypt] Target version: ${process.env.ENCRYPTION_CURRENT_VERSION || 'v1'}`)

  const connections = await prisma.metaConnection.findMany({
    select: { id: true, accessToken: true },
  })

  console.log(`[ReEncrypt] Found ${connections.length} MetaConnection records`)

  let skipped = 0
  let migrated = 0
  let failed = 0

  for (const conn of connections) {
    if (encryption.isCurrentVersion(conn.accessToken)) {
      skipped++
      continue
    }

    try {
      // Decrypt with old key, re-encrypt with current key
      const plaintext = encryption.decrypt(conn.accessToken)
      const newCiphertext = encryption.encrypt(plaintext)

      await prisma.metaConnection.update({
        where: { id: conn.id },
        data: { accessToken: newCiphertext },
      })

      migrated++
      if (migrated % 10 === 0) {
        console.log(`[ReEncrypt] Migrated ${migrated}/${connections.length - skipped} tokens...`)
      }
    } catch (err) {
      console.error(`[ReEncrypt] Failed to re-encrypt connection ${conn.id}:`, err)
      failed++
    }
  }

  console.log(`\n[ReEncrypt] Done.`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped (already current): ${skipped}`)
  console.log(`  Failed: ${failed}`)

  if (failed > 0) {
    console.error('[ReEncrypt] Some tokens failed — check logs and retry')
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error('[ReEncrypt] Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
