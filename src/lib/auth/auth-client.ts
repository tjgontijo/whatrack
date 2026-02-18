// src/lib/auth/auth-client.ts
import { createAuthClient } from "better-auth/react"
import {
  adminClient,
  organizationClient,
  magicLinkClient,
  emailOTPClient,
} from "better-auth/client/plugins"

export const authClient = createAuthClient({
  // baseURL is intentionally omitted to use current origin in the browser,
  // preventing "Failed to fetch" errors if NEXT_PUBLIC_APP_URL is misconfigured.

  basePath: "/api/v1/auth",

  plugins: [
    adminClient(),
    organizationClient(),
    magicLinkClient(),
    emailOTPClient(),
  ],
})

// Exporta os hooks e funções do authClient
export const { useSession, signOut, changePassword } = authClient
