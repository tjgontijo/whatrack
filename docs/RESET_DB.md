# Database Reset Script Guide

The `scripts/reset-db.sh` script performs a complete clean database reset for development environments.

## What It Does

### 1. **Clears Build Artifacts & Cache** 🧹
```bash
rm -rf .next .turbo node_modules/.cache prisma/generated
rm -rf public/sw.js public/manifest.webmanifest public/*.map public/*.js
npm cache clean --force
```
- Removes Next.js build output
- Clears Turbopack cache
- Removes generated Prisma client
- Removes service worker and sourcemaps

### 2. **Reinstalls Dependencies** 📦
```bash
npm install
```
- Ensures all packages are up-to-date
- Rebuilds node_modules from package.json

### 3. **Resets PostgreSQL Database** 🗄️
```bash
# Drops entire schema
DROP SCHEMA IF EXISTS public CASCADE;

# Creates new schema
CREATE SCHEMA public;

# Creates required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Extensions created:**
- **pgcrypto**: UUID generation and encryption functions
- **vector**: For AI embeddings (future use)
- **unaccent**: For accent-insensitive text search

### 4. **Removes Migrations & Regenerates** 📝
```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init
```
- Removes all migration history files
- Creates a fresh "init" migration from current schema
- Applies migration to database

### 5. **Generates Prisma Client** 🔄
```bash
npx prisma generate
```
- Regenerates type-safe Prisma client from schema

### 6. **Seeds Initial Data** 🌱
```bash
TRUNCATE_DB=1 npx prisma db seed
```
- Populates database with initial data
- The `TRUNCATE_DB=1` flag tells seed script to start fresh

### 7. **Builds Application** 🚀
```bash
npm run build
```
- Compiles TypeScript
- Bundles application
- Verifies no compilation errors

## Usage

```bash
# Make executable (first time only)
chmod +x scripts/reset-db.sh

# Run the script
./scripts/reset-db.sh
```

## When to Use

Use this script when you need:
- ✅ Complete clean development state
- ✅ Test migrations work from scratch
- ✅ Reset corrupted database state
- ✅ Start over with seed data
- ✅ Verify all migrations apply correctly

**Do NOT use this in production!** 🚨

## What Gets Deleted

| Item | Deleted | Effect |
|------|---------|--------|
| `.next/` | ✅ | Forces full rebuild |
| `prisma/generated/` | ✅ | Regenerates Prisma client |
| `prisma/migrations/` | ✅ | Recreates from schema |
| PostgreSQL schema | ✅ | All data is lost |
| `.turbo/` cache | ✅ | Clears build cache |
| Service worker | ✅ | Clears browser cache markers |
| Source maps | ✅ | Removes debug info |

## Database State After Reset

After running the script, your database will:
- ✅ Have empty schema (no tables)
- ✅ Have all required PostgreSQL extensions installed
- ✅ Be populated with seed data (if seed.ts exists)
- ✅ Have generated Prisma client

## Troubleshooting

### Script fails with "PostgreSQL connection error"
```bash
# Check if database is accessible
psql $DATABASE_URL -c "SELECT version();"

# If connection fails, verify DATABASE_URL in .env
echo $DATABASE_URL
```

### "Cannot drop schema" error
```
ERROR: cannot drop schema public because other objects depend on it
```
Solutions:
1. Wait a moment and try again (locks may be clearing)
2. Kill other connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'your_db';`
3. Check if `npx prisma db push` is still running

### Seed fails but migrations succeed
```bash
# Manually check if seed.ts exists
ls -la prisma/seed.ts

# Run seed separately
TRUNCATE_DB=1 npx prisma db seed
```

### Build fails after reset
```bash
# Try again (sometimes timing issue)
npm run build

# Or rebuild Prisma client
npx prisma generate && npm run build
```

## Performance Notes

- **Duration**: Typically 30-60 seconds depending on internet speed
- **Network**: Downloads npm packages (can take time on slow connections)
- **Database**: PostgreSQL operations are fast (drop/create schema takes ~1s)

## Script Safety Features

The script includes several safety mechanisms:

1. **`set -euo pipefail`**: Stops immediately on any error
2. **`trap` handler**: Catches errors and displays clear error message
3. **Idempotent cleanup**: Uses `|| true` so missing files don't cause failures
4. **Conditional seed**: Checks if `seed.ts` exists before running
5. **Build verification**: Ensures application compiles before completing

## Advanced: Partial Reset

If you only want to reset the database (not rebuild everything):

```bash
# Drop and recreate schema only
npx prisma db execute --stdin <<'EOF'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
EOF

# Recreate migrations and seed
npx prisma migrate dev --name init
TRUNCATE_DB=1 npx prisma db seed
```

## Environment Variables

The script uses these environment variables:

- **`DATABASE_URL`**: PostgreSQL connection string (from .env)
- **`TRUNCATE_DB`**: Set to `1` during seed to start fresh

## References

- [Prisma Migrate Docs](https://www.prisma.io/docs/orm/prisma-migrate)
- [Prisma Seeding](https://www.prisma.io/docs/orm/prisma-migrate/seed/seeding)
- [PostgreSQL Extensions](https://www.postgresql.org/docs/current/contrib.html)
