import 'server-only'
import { z } from 'zod'

/**
 * Centralized environment variables schema.
 * All env vars must be defined here with proper validation.
 * This ensures fail-fast on startup instead of runtime errors.
 */
const envSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // App
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Authentication (better-auth)
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  OWNER_EMAIL: z.string().email().optional(),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),

  // Centrifugo (real-time)
  CENTRIFUGO_URL: z.string().url('CENTRIFUGO_URL must be a valid URL'),
  CENTRIFUGO_API_KEY: z.string().min(1, 'CENTRIFUGO_API_KEY is required'),
  CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: z.string().min(1, 'CENTRIFUGO_TOKEN_HMAC_SECRET_KEY is required'),
  NEXT_PUBLIC_CENTRIFUGO_URL: z.string().url(),

  // Meta / WhatsApp
  META_APP_ID: z.string().min(1, 'META_APP_ID is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),
  META_API_VERSION: z.string().default('v19.0'),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'META_WEBHOOK_VERIFY_TOKEN is required'),
  META_ADS_APP_ID: z.string().min(1, 'META_ADS_APP_ID is required'),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  NEXT_PUBLIC_META_APP_ID: z.string().min(1, 'NEXT_PUBLIC_META_APP_ID is required'),
  NEXT_PUBLIC_META_CONFIG_ID: z.string().min(1, 'NEXT_PUBLIC_META_CONFIG_ID is required'),

  // Encryption
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
  ENCRYPTION_KEYS: z.string().min(1, 'ENCRYPTION_KEYS is required'),
  ENCRYPTION_CURRENT_VERSION: z.string().default('v1'),

  // Jobs / Cron
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 characters'),
  HISTORY_SYNC_ALERT_TOKEN: z.string().min(1, 'HISTORY_SYNC_ALERT_TOKEN is required'),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),

  // Payment — Billing (AbacatePay) — Subscription Recurring Credit Card
  ABACATEPAY_SECRET_KEY: z.string().min(1, 'ABACATEPAY_SECRET_KEY is required'),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(1, 'ABACATEPAY_WEBHOOK_SECRET is required'),

  // Public env vars (AbacatePay public key for frontend)
  NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY is required'),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate env vars at module load time (fail-fast)
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('[env] Missing or invalid environment variables:')
  Object.entries(parsed.error.flatten().fieldErrors).forEach(([key, errors]) => {
    console.error(`  ${key}: ${errors?.join(', ')}`)
  })
  throw new Error('[env] Invalid environment configuration. Check logs above.')
}

export const env = parsed.data
