export function createAppBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL

  if (!raw) {
    throw new Error(
      '[tracking] Missing NEXT_PUBLIC_APP_URL/APP_URL. Configure it in the environment variables (e.g. https://whatrack.com).',
    )
  }

  return raw.replace(/\/$/, '')
}

