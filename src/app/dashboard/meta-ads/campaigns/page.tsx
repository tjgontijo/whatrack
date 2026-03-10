import { redirect } from 'next/navigation'

export default async function MetaAdsCampaignsPage() {
  redirect('/dashboard/meta-ads?tab=campaigns')
}
