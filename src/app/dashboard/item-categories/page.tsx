import { redirect } from 'next/navigation'

export default async function ItemCategoriesPage() {
  redirect('/dashboard/settings/catalog?tab=categories')
}
