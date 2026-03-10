import { redirect } from 'next/navigation'

export default async function AiUsagePage() {
  redirect('/dashboard/ia?tab=usage')
}
