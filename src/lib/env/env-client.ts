import { z } from 'zod'

/**
 * Public environment variables schema.
 * Only variables prefixed with NEXT_PUBLIC_ should be defined here.
 * This file CAN be imported in Client Components.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('WhaTrack'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_OWNER_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_META_API_VERSION: z.string().default('v25.0'),
  NEXT_PUBLIC_META_APP_ID: z.string().min(1, 'NEXT_PUBLIC_META_APP_ID is required'),
  NEXT_PUBLIC_META_CONFIG_ID: z.string().min(1, 'NEXT_PUBLIC_META_CONFIG_ID is required'),
  NEXT_PUBLIC_CENTRIFUGO_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

// Use a partial parse for the client to avoid blocking the whole app if one public var is missing,
// or use safeParse and handle errors.
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_OWNER_EMAIL: process.env.NEXT_PUBLIC_OWNER_EMAIL,
  NEXT_PUBLIC_META_API_VERSION: process.env.NEXT_PUBLIC_META_API_VERSION,
  NEXT_PUBLIC_META_APP_ID: process.env.NEXT_PUBLIC_META_APP_ID,
  NEXT_PUBLIC_META_CONFIG_ID: process.env.NEXT_PUBLIC_META_CONFIG_ID,
  NEXT_PUBLIC_CENTRIFUGO_URL: process.env.NEXT_PUBLIC_CENTRIFUGO_URL,
  NODE_ENV: process.env.NODE_ENV,
})

if (!parsed.success) {
  console.error('[env-client] Invalid public environment variables:', parsed.error.flatten().fieldErrors)
}

export const envClient = parsed.success 
  ? parsed.data 
  : ({} as z.infer<typeof publicEnvSchema>)
