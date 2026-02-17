import { redirect } from 'next/navigation'

export default function WhatsAppPage() {
  // Redirect to inbox by default
  redirect('/dashboard/whatsapp/inbox')
}
