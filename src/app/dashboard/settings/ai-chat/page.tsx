import { redirect } from 'next/navigation'
import { AuthGuards } from '@/lib/auth/roles'
import { getServerSession } from '@/server/auth/server-session'
import { AiChatClient } from './chat-client'

export default async function AiChatSettingsPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  if (!AuthGuards.isSystemAdmin(session.user.role)) {
    redirect('/dashboard')
  }

  return <AiChatClient />
}
