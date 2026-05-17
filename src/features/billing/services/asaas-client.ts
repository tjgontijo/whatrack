import { BillingAsaasConfigService } from './asaas-config.service'
import { billingLog } from './logger'

export class AsaasClient {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { apiKey, baseUrl } = await BillingAsaasConfigService.getRuntimeConfig()

    if (!apiKey) {
      throw new Error('Asaas API key is not configured.')
    }

    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData
    const startedAt = Date.now()

    const response = await fetch(url, {
      ...options,
      headers: {
        access_token: apiKey,
        ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    })

    const duration = Date.now() - startedAt

    if (!response.ok) {
      const errorBody = await response.text()
      billingLog('error', 'Asaas API request failed', {
        endpoint,
        status: response.status,
        duration,
        error: errorBody,
        method: options.method || 'GET',
      })
      throw new Error(`Asaas API Error [${response.status}]: ${errorBody}`)
    }

    billingLog('info', 'Asaas API request succeeded', {
      endpoint,
      status: response.status,
      duration,
      method: options.method || 'GET',
    })

    if (response.status === 204) {
      return {} as T
    }

    return response.json() as Promise<T>
  }

  static async get<T>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  static async post<T>(endpoint: string, body: unknown, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  static async postForm<T>(endpoint: string, body: FormData, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    })
  }

  static async put<T>(endpoint: string, body: unknown, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }
}
