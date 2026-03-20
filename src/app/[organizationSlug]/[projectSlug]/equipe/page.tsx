import { redirect } from 'next/navigation'

export default async function TeamAccessPage() {
  redirect('/dashboard/settings/team')
}
