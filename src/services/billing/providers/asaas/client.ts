import { getAsaasConfig, type AsaasConfig } from './config'
import { ProviderApiError } from '../../errors'

/**
 * Options for the Asaas HTTP client
 */
export interface AsaasClientOptions {
  /** Maximum number of retries for rate-limited requests */
  maxRetries?: number
  /** Delay in ms between retries */
  retryDelay?: number
  /** Custom config (mainly for testing) */
  config?: AsaasConfig
}

/**
 * Response type from Asaas API
 */
export interface AsaasResponse<T = unknown> {
  data: T
  hasMore?: boolean
  totalCount?: number
  limit?: number
  offset?: number
}

/**
 * Error response from Asaas API
 */
export interface AsaasErrorResponse {
  errors: Array<{
    code?: string
    description: string
  }>
}

/**
 * Asaas HTTP Client interface
 */
export interface AsaasClient {
  get<T = unknown>(path: string): Promise<T>
  post<T = unknown>(path: string, body?: unknown): Promise<T>
  put<T = unknown>(path: string, body?: unknown): Promise<T>
  delete<T = unknown>(path: string): Promise<T>
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Create an Asaas HTTP client
 */
export function createAsaasClient(options: AsaasClientOptions = {}): AsaasClient {
  const { maxRetries = 3, retryDelay = 1000 } = options
  const config = options.config || getAsaasConfig()

  /**
   * Make an HTTP request to the Asaas API
   */
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryCount = 0
  ): Promise<T> {
    const url = `${config.baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      access_token: config.apiKey,
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)

    // Handle rate limiting
    if (response.status === 429 && retryCount < maxRetries) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : retryDelay
      await sleep(delay)
      return request<T>(method, path, body, retryCount + 1)
    }

    if (!response.ok) {
      let errorData: AsaasErrorResponse
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          errors: [{ description: `HTTP ${response.status}` }],
        }
      }

      const errorMessage =
        errorData.errors?.[0]?.description || `Asaas API error: ${response.status}`

      throw new ProviderApiError(
        errorMessage,
        response.status,
        errorData,
        'asaas'
      )
    }

    return response.json()
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}

/**
 * Default Asaas client instance (lazy initialization)
 */
let defaultClient: AsaasClient | null = null

/**
 * Get the default Asaas client instance
 */
export function getAsaasClient(): AsaasClient {
  if (!defaultClient) {
    defaultClient = createAsaasClient()
  }
  return defaultClient
}

/**
 * Reset the default client (mainly for testing)
 */
export function resetAsaasClient(): void {
  defaultClient = null
}
