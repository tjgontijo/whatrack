// src/lib/auth/auth-client.ts
import { createAuthClient } from "better-auth/react"
import {
  adminClient,
  organizationClient,
  magicLinkClient,
  emailOTPClient,
} from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : undefined),

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
