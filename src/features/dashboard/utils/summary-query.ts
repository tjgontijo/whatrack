export interface DashboardSummaryFilters {
  period: string
  trafficSource: string
  trafficType: string
  itemCategory: string
  item: string
}

export function buildDashboardSummaryQuery(filters: DashboardSummaryFilters) {
  const queryParams = new URLSearchParams()
  queryParams.set('period', filters.period)
  queryParams.set('trafficSource', filters.trafficSource)
  queryParams.set('trafficType', filters.trafficType)
  queryParams.set('itemCategory', filters.itemCategory)
  queryParams.set('item', filters.item)
  return queryParams.toString()
}
