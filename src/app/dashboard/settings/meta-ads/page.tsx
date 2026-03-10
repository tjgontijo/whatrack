import { redirect } from 'next/navigation'

export default async function MetaAdsSettingsPage() {
  redirect('/dashboard/settings/integrations?tab=meta-ads')
}
