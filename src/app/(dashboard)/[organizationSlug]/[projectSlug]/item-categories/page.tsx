import CatalogPage from '../settings/catalog/page'

export default function ItemCategoriesPage() {
  return <CatalogPage searchParams={Promise.resolve({ tab: 'categories' })} />
}
