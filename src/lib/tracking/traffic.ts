export function detectPaidPlatform(utmSource: string | null): 'Meta' | 'Google' | null {
  if (!utmSource) return null
  const normalized = utmSource.toLowerCase()

  if (normalized.includes('meta') || normalized.includes('facebook') || normalized.includes('instagram')) {
    return 'Meta'
  }

  if (normalized.includes('google') || normalized.includes('gads') || normalized.includes('adwords')) {
    return 'Google'
  }

  return null
}

export function normalizeSourceLabel(sourceType: string | null): { key: string; label: string } {
  if (!sourceType) {
    return { key: 'others', label: 'Outros' }
  }

  const value = sourceType.toLowerCase()

  if (value.startsWith('meta_') || value === 'meta') {
    return { key: 'meta', label: 'Meta' }
  }

  if (value.startsWith('google_') || value === 'google') {
    return { key: 'google', label: 'Google' }
  }

  if (value === 'organic' || value === 'orgânico' || value === 'organico') {
    return { key: 'organic', label: 'Orgânico' }
  }

  return { key: 'others', label: 'Outros' }
}
