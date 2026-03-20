import { redirect } from 'next/navigation'

export default async function WhatsAppPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/whatsapp/inbox`)
}
