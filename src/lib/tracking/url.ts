export function createAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000'

  return raw.replace(/\/$/, '')
}

