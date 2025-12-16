import { cookies, headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { ORGANIZATION_HEADER } from "@/lib/constants";

/**
 * Build headers with cookies for server-side auth calls
 */
async function buildAuthHeaders(request?: Request): Promise<Headers> {
  if (request) {
    const headers = new Headers(request.headers);
    if (!headers.get('cookie')) {
      try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ');

        if (cookieHeader) {
          headers.set('cookie', cookieHeader);
        }
      } catch {
        // ignore
      }
    }
    return headers;
  }

  const cookieStore = await cookies();
  const headers = new Headers();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return headers;
}

/**
 * Get current session using better-auth on the server
 */
export async function getServerSession(request?: Request) {
  const headers = await buildAuthHeaders(request);
  try {
    const session = await auth.api.getSession({ headers });
    
    // Se temos uma session, validar se ela existe no banco de dados
    if (session?.session?.id) {
      const sessionExists = await prisma.session.findUnique({
        where: { id: session.session.id },
      });
      
      // Se a session não existe no banco, limpar o cookie e retornar null
      if (!sessionExists) {
        console.warn(`[auth] Session ${session.session.id} not found in database, clearing cookie`);
        const cookieStore = await cookies();
        // Expirar o cookie definindo maxAge como 0
        cookieStore.set('better-auth.session_token', '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        cookieStore.set('__Secure-better-auth.session_token', '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        cookieStore.set('better-auth.session_data', '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        cookieStore.set('__Secure-better-auth.session_data', '', {
          maxAge: 0,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        return null;
      }
    }
    
    return session;
  } catch (error) {
    console.error("[auth] Failed to get server session", error);
    return null;
  }
}

/**
 * Get authenticated user (or null)
 */
export async function getOrSyncUser(request?: Request) {
  const session = await getServerSession(request);
  
  if (!session?.user) {
    console.warn('[getOrSyncUser] No session or user found', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionId: session?.session?.id,
    });
  }
  
  return session?.user ?? null;
}

/**
 * Resolve current organization id from header or active organization
 */
export async function getCurrentOrganizationId(request?: Request): Promise<string | null> {
  const headerOrgId = request
    ? request.headers.get(ORGANIZATION_HEADER)
    : (await nextHeaders()).get(ORGANIZATION_HEADER);

  if (headerOrgId) {
    return headerOrgId;
  }

  const session = await getServerSession(request);
  return session?.session?.activeOrganizationId ?? null;
}

/**
 * Load the current organization (or null)
 */
export async function getCurrentOrganization(request?: Request) {
  const organizationId = await getCurrentOrganizationId(request);
  if (!organizationId) return null;

  return prisma.organization.findUnique({
    where: { id: organizationId },
  });
}
