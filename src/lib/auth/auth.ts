import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import { randomUUID } from 'crypto'

import { prisma } from '../prisma'

const appBaseURL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL

if (!appBaseURL) {
  throw new Error(
    '[auth] Missing NEXT_PUBLIC_APP_URL/APP_URL. Configure it in the environment variables (e.g. https://whatrack.com).',
  )
}

const OWNER_EMAIL = process.env.OWNER_EMAIL

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appBaseURL,
  basePath: '/api/v1/auth',
  trustHost: true,
  
  session: {
    cookieCache: {
      enabled: true,
    },
  },
  
  advanced: {
    crossSubDomainCookies: {
      enabled: appBaseURL.includes('localhost') ? false : true,
    },
    generateId: () => randomUUID(),
  },

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },

  plugins: [
    admin(),
    organization()
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Se o email do usuário é o OWNER_EMAIL, atualiza para role 'owner'
          if (OWNER_EMAIL && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'owner' },
            })
            // Em produção, não exibe email em logs por segurança
          }
        },
      },
    },
  },
})

export type Auth = typeof auth
