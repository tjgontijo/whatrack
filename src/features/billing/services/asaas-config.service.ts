import "server-only"
import { env } from '@/lib/env/env'
import {
  detectAsaasEnvironmentFromBaseUrl,
  getAsaasBaseUrl,
  normalizeAsaasSecret,
} from '@/features/billing/lib/asaas-config'

export interface BillingAsaasRuntimeConfig {
  apiKey: string | null
  baseUrl: string
  webhookToken: string | null
  walletId: string | null
  environment: 'sandbox' | 'production'
}

export class BillingAsaasConfigService {
  static async getRuntimeConfig(): Promise<BillingAsaasRuntimeConfig> {
    const baseUrl = env.ASAAS_BASE_URL?.trim() || getAsaasBaseUrl('sandbox')
    const apiKey = normalizeAsaasSecret(env.ASAAS_API_KEY ?? null)
    const webhookToken = normalizeAsaasSecret(env.ASAAS_WEBHOOK_TOKEN ?? null)
    const walletId = normalizeAsaasSecret(env.WALLET_ASAAS_ID ?? null)
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
