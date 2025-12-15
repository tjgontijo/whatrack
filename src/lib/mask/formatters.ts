export function formatDateTime(value: string | Date | null | undefined, locale = 'pt-BR') {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale)
}

export function formatCurrencyBRL(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '—'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numeric)
}
