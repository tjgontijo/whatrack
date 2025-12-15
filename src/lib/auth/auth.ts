import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'

import { prisma } from '../prisma'

const appBaseURL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  'http://localhost:3000'

const OWNER_EMAIL = process.env.OWNER_EMAIL

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appBaseURL,
  basePath: '/api/v1/auth',

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    admin(),
    organization()
  ],

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },

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
            console.log(`🔑 Usuário ${user.email} definido como owner do SaaS`)
          }
        },
      },
    },
  },
})

export type Auth = typeof auth
