import { redirect } from 'next/navigation'

export default async function WhatsAppSettingsRoute() {
  redirect('/dashboard/settings/integrations?tab=whatsapp')
}
