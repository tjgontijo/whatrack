export const ASAAS_ENVIRONMENT_VALUES = ['sandbox', 'production'] as const

export type AsaasEnvironment = (typeof ASAAS_ENVIRONMENT_VALUES)[number]

export const ASAAS_BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
}

export const DEFAULT_ASAAS_ENVIRONMENT: AsaasEnvironment = 'sandbox'
export const DEFAULT_ASAAS_BASE_URL = ASAAS_BASE_URLS[DEFAULT_ASAAS_ENVIRONMENT]

export function normalizeAsaasBaseUrl(value?: string | null) {
  const normalized = value?.trim().replace(/\/+$/, '')
  return normalized || DEFAULT_ASAAS_BASE_URL
}

export function normalizeAsaasEnvironment(value?: string | null): AsaasEnvironment {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'sandbox' || normalized === 'production') {
    return normalized
  }

  return DEFAULT_ASAAS_ENVIRONMENT
}

export function getAsaasBaseUrl(environment?: AsaasEnvironment | null) {
  return ASAAS_BASE_URLS[environment ?? DEFAULT_ASAAS_ENVIRONMENT]
}

export function normalizeAsaasSecret(value?: string | null) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

export function detectAsaasEnvironmentFromBaseUrl(value?: string | null): AsaasEnvironment {
  try {
    const url = new URL(normalizeAsaasBaseUrl(value))
    return url.hostname === 'api.asaas.com' ? 'production' : 'sandbox'
  } catch {
    return DEFAULT_ASAAS_ENVIRONMENT
  }
}
