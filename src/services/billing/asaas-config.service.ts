import {
  detectAsaasEnvironmentFromBaseUrl,
  getAsaasBaseUrl,
  normalizeAsaasSecret,
} from '@/lib/billing/asaas-config'

export interface BillingAsaasRuntimeConfig {
  apiKey: string | null
  baseUrl: string
  webhookToken: string | null
  walletId: string | null
  environment: 'sandbox' | 'production'
}

export class BillingAsaasConfigService {
  static async getRuntimeConfig(): Promise<BillingAsaasRuntimeConfig> {
    const baseUrl = process.env.ASAAS_BASE_URL?.trim() || getAsaasBaseUrl('sandbox')
    const apiKey = normalizeAsaasSecret(process.env.ASAAS_API_KEY ?? null)
    const webhookToken = normalizeAsaasSecret(process.env.ASAAS_WEBHOOK_TOKEN ?? null)
    const walletId = normalizeAsaasSecret(process.env.WALLET_ASAAS_ID ?? null)
    const environment = detectAsaasEnvironmentFromBaseUrl(baseUrl)

    return {
      apiKey,
      baseUrl,
      webhookToken,
      walletId,
      environment,
    }
  }
}
