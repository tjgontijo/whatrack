import 'server-only'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

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

  // 1. App & Infrastructure
  APP_NAME: z.string().default('WhaTrack'),
  NEXT_PUBLIC_APP_NAME: z.string().default('WhaTrack'),
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_OWNER_EMAIL: z.string().email().optional(),

  // 2. Authentication (better-auth)
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),

  // 3. Database & Cache
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),

  // 4. AI / LLM Services
  GOOGLE_API_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // 5. Meta & WhatsApp Cloud API
  META_APP_ID: z.string().min(1, 'META_APP_ID is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  META_API_VERSION: z.string().default('v25.0'),
  NEXT_PUBLIC_META_API_VERSION: z.string().default('v25.0'),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'META_WEBHOOK_VERIFY_TOKEN is required'),

  NEXT_PUBLIC_META_APP_ID: z.string().min(1, 'NEXT_PUBLIC_META_APP_ID is required'),
  NEXT_PUBLIC_META_CONFIG_ID: z.string().min(1, 'NEXT_PUBLIC_META_CONFIG_ID is required'),

  META_WABA_ID: z.string().min(1).optional(),
  META_PHONE_ID: z.string().min(1).optional(),
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),

  META_ADS_APP_ID: z.string().min(1, 'META_ADS_APP_ID is required'),
  META_ADS_APP_SECRET: z.string().min(1).optional(),
  META_ADS_APP_CONFIG_ID: z.string().min(1).optional(),
  META_ADS_APP_TOKEN: z.string().min(1).optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // 6. Real-time Communication (Centrifugo)
  CENTRIFUGO_URL: z.string().url('CENTRIFUGO_URL must be a valid URL'),
  CENTRIFUGO_API_KEY: z.string().min(1, 'CENTRIFUGO_API_KEY is required'),
  CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: z.string().min(1, 'CENTRIFUGO_TOKEN_HMAC_SECRET_KEY is required'),
  CENTRIFUGO_ADMIN_PASSWORD: z.string().min(1).optional(),
  CENTRIFUGO_ADMIN_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_CENTRIFUGO_URL: z.string().url(),

  // 7. Payments & Billing
  ABACATEPAY_SECRET_KEY: z.string().min(1, 'ABACATEPAY_SECRET_KEY is required'),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(1, 'ABACATEPAY_WEBHOOK_SECRET is required'),
  ABACATEPAY_WEBHOOK_URL: z.string().url().optional(),
  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_SUCCESS_URL: z.string().url().optional(),

  // 8. Email Service (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().optional(),

  // 9. Security, Encryption & Jobs
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
  ENCRYPTION_KEYS: z.string().min(1, 'ENCRYPTION_KEYS is required'),
  ENCRYPTION_CURRENT_VERSION: z.string().default('v1'),

  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 characters'),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate env vars at module load time (fail-fast)
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  logger.error('[env] Missing or invalid environment variables:')
  Object.entries(parsed.error.flatten().fieldErrors).forEach(([key, errors]) => {
    logger.error(`  ${key}: ${errors?.join(', ')}`)
  })
  throw new Error('[env] Invalid environment configuration. Check logs above.')
}

export const env = parsed.data
