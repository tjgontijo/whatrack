/**
 * Format date with simple pattern matching
 * Supports: dd, MM, yyyy, MMM (abbreviated month)
 */
export function formatDate(date: Date, format: string): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const monthName = monthNames[d.getMonth()]

  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', String(year))
    .replace('MMM', monthName)
}
