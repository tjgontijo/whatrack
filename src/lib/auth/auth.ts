import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, organization } from 'better-auth/plugins'
import { randomUUID } from 'crypto'

import { prisma } from '../db/prisma'
import { requireEnv } from '../env/require-env.server'
import { authDeliveryService } from '@/services/delivery/auth-delivery'
import { auditService } from '../../services/audit/audit.service'
import { logger } from '@/lib/utils/logger'

const appBaseURL = requireEnv('BETTER_AUTH_URL')
const betterAuthSecret = requireEnv('BETTER_AUTH_SECRET')
const OWNER_EMAIL = process.env.OWNER_EMAIL

export const auth = betterAuth({
  secret: betterAuthSecret,
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
    sendResetPassword: async ({ user, url }) => {
      logger.info({ context: {
        event: 'auth.request_password_reset',
        userId: user.id,
        email: user.email,
      } }, '[auth] request_password_reset')

      const result = await authDeliveryService.send({
        email: user.email,
        type: 'password-reset',
        data: {
          url,
          name: user.name,
          expiresIn: 60,
        },
      })

      if (!result.success) {
        logger.error({ err: {
          event: 'auth.request_password_reset_delivery_failed',
          userId: user.id,
          email: user.email,
          error: result.error,
        } }, '[auth] request_password_reset_delivery_failed')
        throw new Error('Password reset email delivery failed')
      }
    },
    onPasswordReset: async ({ user }) => {
      logger.info({ context: {
        event: 'auth.reset_password',
        userId: user.id,
        email: user.email,
      } }, '[auth] reset_password')

      void auditService.log({
        userId: user.id,
        action: 'auth.password_reset',
        resourceType: 'user',
        resourceId: user.id,
      })
    },
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
    account: {
      update: {
        after: async (account, context) => {
          if (account.providerId !== 'credential') return
          if (context?.path !== '/change-password') return

          logger.info({ context: {
            event: 'auth.change_password',
            userId: account.userId,
            accountId: account.id,
            path: context.path,
          } }, '[auth] change_password')

          void auditService.log({
            userId: account.userId,
            action: 'auth.password_changed',
            resourceType: 'user',
            resourceId: account.userId,
          })
        },
      },
    },
  },
})

export type Auth = typeof auth
