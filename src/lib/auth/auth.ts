import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, organization, magicLink, emailOTP } from 'better-auth/plugins'
import { randomUUID } from 'crypto'

import { prisma } from '../prisma'

const appBaseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
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

  plugins: [
    admin(),
    organization(),
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        // Implementação básica para evitar erro de inicialização
        console.log(`Magic link to ${email}: ${url}`)
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }: { email: string; otp: string }) {
        // Implementação básica para evitar erro de inicialização
        console.log(`OTP code to ${email}: ${otp}`)
      },
    }),
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
