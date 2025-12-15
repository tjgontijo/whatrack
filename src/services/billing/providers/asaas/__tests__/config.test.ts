import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/**
 * RED Phase: Asaas Configuration Test
 *
 * Verifica que a configuração do Asaas está correta
 * e lê as variáveis de ambiente corretamente.
 */
describe('Asaas Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should export getAsaasConfig function', async () => {
    const { getAsaasConfig } = await import('../config')
    expect(getAsaasConfig).toBeDefined()
    expect(typeof getAsaasConfig).toBe('function')
  })

  it('should export AsaasConfigSchema', async () => {
    const { AsaasConfigSchema } = await import('../config')
    expect(AsaasConfigSchema).toBeDefined()
  })

  it('should return sandbox URL when ASAAS_ENVIRONMENT is sandbox', async () => {
    process.env.ASAAS_API_KEY = 'test_api_key'
    process.env.ASAAS_ENVIRONMENT = 'sandbox'
    process.env.ASAAS_WEBHOOK_TOKEN = 'webhook_token'

    const { getAsaasConfig } = await import('../config')
    const config = getAsaasConfig()

    expect(config.baseUrl).toBe('https://sandbox.asaas.com/api/v3')
    expect(config.apiKey).toBe('test_api_key')
    expect(config.webhookToken).toBe('webhook_token')
    expect(config.environment).toBe('sandbox')
  })

  it('should return production URL when ASAAS_ENVIRONMENT is production', async () => {
    process.env.ASAAS_API_KEY = 'prod_api_key'
    process.env.ASAAS_ENVIRONMENT = 'production'
    process.env.ASAAS_WEBHOOK_TOKEN = 'prod_webhook_token'

    const { getAsaasConfig } = await import('../config')
    const config = getAsaasConfig()

    expect(config.baseUrl).toBe('https://api.asaas.com/v3')
    expect(config.environment).toBe('production')
  })

  it('should default to sandbox when ASAAS_ENVIRONMENT is not set', async () => {
    process.env.ASAAS_API_KEY = 'test_api_key'
    delete process.env.ASAAS_ENVIRONMENT
    process.env.ASAAS_WEBHOOK_TOKEN = 'webhook_token'

    const { getAsaasConfig } = await import('../config')
    const config = getAsaasConfig()

    expect(config.baseUrl).toBe('https://sandbox.asaas.com/api/v3')
    expect(config.environment).toBe('sandbox')
  })

  it('should throw error when ASAAS_API_KEY is not set', async () => {
    delete process.env.ASAAS_API_KEY
    process.env.ASAAS_ENVIRONMENT = 'sandbox'

    const { getAsaasConfig } = await import('../config')
    expect(() => getAsaasConfig()).toThrow()
  })

  it('should export ASAAS_BILLING_TYPE_MAP', async () => {
    const { ASAAS_BILLING_TYPE_MAP } = await import('../config')
    expect(ASAAS_BILLING_TYPE_MAP).toBeDefined()
    expect(ASAAS_BILLING_TYPE_MAP.credit_card).toBe('CREDIT_CARD')
    expect(ASAAS_BILLING_TYPE_MAP.pix).toBe('PIX')
    expect(ASAAS_BILLING_TYPE_MAP.boleto).toBe('BOLETO')
  })

  it('should export ASAAS_CYCLE_MAP', async () => {
    const { ASAAS_CYCLE_MAP } = await import('../config')
    expect(ASAAS_CYCLE_MAP).toBeDefined()
    expect(ASAAS_CYCLE_MAP.monthly).toBe('MONTHLY')
    expect(ASAAS_CYCLE_MAP.yearly).toBe('YEARLY')
  })
})
