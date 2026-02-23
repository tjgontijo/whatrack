import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, organization } from 'better-auth/plugins'
import { randomUUID } from 'crypto'

import { prisma } from '../prisma'

const appBaseURL =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
if (!appBaseURL) throw new Error('[Auth] BETTER_AUTH_URL environment variable is required')
const OWNER_EMAIL = process.env.OWNER_EMAIL

import { auditService } from '../audit.service'

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
    database: {
      generateId: () => randomUUID(),
    },
  },

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },

  plugins: [admin(), organization()],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Audit Log - Register
          void auditService.log({
            userId: user.id,
            action: 'auth.register',
            resourceType: 'user',
            resourceId: user.id,
            after: { email: user.email, name: user.name },
          })

          // Se o email do usuário é o OWNER_EMAIL, atualiza para role 'owner'
          if (OWNER_EMAIL && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'owner' },
            })
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Audit Log - Login
          void auditService.log({
            organizationId: ((session as any).activeOrganizationId as string) || undefined,
            userId: session.userId,
            action: 'auth.login',
            resourceType: 'session',
            resourceId: session.id,
          })
        },
      },
    },
  },
})

export type Auth = typeof auth
