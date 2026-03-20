const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 60) return false
  return SLUG_REGEX.test(slug)
}

export function generateSlugFromName(name: string): string {
  return normalizeSlug(name)
}

export function generateProjectSlug(organizationSlug: string, name: string): string {
  const baseSlug = generateSlugFromName(name)
  return `${organizationSlug}-${baseSlug}`
}
