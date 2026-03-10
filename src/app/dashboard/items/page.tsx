import { redirect } from 'next/navigation'

export default async function ItemsPage() {
  redirect('/dashboard/settings/catalog')
}
