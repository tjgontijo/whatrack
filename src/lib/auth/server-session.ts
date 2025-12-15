import { cookies } from 'next/headers'
import { auth } from './auth'
import { prisma } from '@/lib/prisma'

/**
 * Get the current session on the server side
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export async function getServerSession() {
    try {
        const cookieStore = await cookies()

        // Convert cookies to Headers format
        const headers = new Headers()
        cookieStore.getAll().forEach((cookie) => {
            headers.append('cookie', `${cookie.name}=${cookie.value}`)
        })

        const session = await auth.api.getSession({
            headers,
        })

        // Se temos uma session, validar se ela existe no banco de dados
        if (session?.session?.id) {
            const sessionExists = await prisma.session.findUnique({
                where: { id: session.session.id },
            })
            
            // Se a session não existe no banco, limpar o cookie e retornar null
            if (!sessionExists) {
                console.warn(`[getServerSession] Session ${session.session.id} not found in database, clearing cookie`)
                // Expirar o cookie definindo maxAge como 0
                cookieStore.set('better-auth.session_token', '', {
                    maxAge: 0,
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                })
                return null
            }
        }

        return session
    } catch (error) {
        console.error('[getServerSession] Error:', error)
        return null
    }
}

/**
 * Require authentication in Server Components
 * Throws an error if not authenticated (will be caught by error boundary)
 */
export async function requireAuth() {
    const session = await getServerSession()

    if (!session) {
        throw new Error('Unauthorized')
    }

    return session
}
