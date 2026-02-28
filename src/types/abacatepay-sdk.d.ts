/**
 * Type declarations for @abacatepay/sdk
 * Provides implicit typing for the SDK until official types are available
 */

declare module '@abacatepay/sdk' {
  export function AbacatePay(options: { secret: string }): AbacatePayClient
}

interface AbacatePayClient {
  subscriptions: {
    create(body: Record<string, unknown>): Promise<{
      success: boolean
      data?: {
        id: string
        amount: number
        name: string
        externalId: string
        customerId: string
        status: string
        frequency: { cycle: string; dayOfProcessing: number }
        retryPolicy: { maxRetry: number; retryEvery: number }
        createdAt: string
        updatedAt: string
        devMode: boolean
      }
      error?: string
    }>
    list(query?: Record<string, unknown>): Promise<{
      success: boolean
      data?: Array<{
        id: string
        amount: number
        name: string
        externalId: string
        customerId: string
        status: string
        frequency: { cycle: string; dayOfProcessing: number }
        retryPolicy: { maxRetry: number; retryEvery: number }
        createdAt: string
        updatedAt: string
        devMode: boolean
      }>
      error?: string
    }>
  }
  checkouts: {
    create(body: Record<string, unknown>): Promise<{
      success: boolean
      data?: { id: string; url: string }
      error?: string
    }>
  }
  customers: {
    create(body: Record<string, unknown>): Promise<{
      success: boolean
      data?: { id: string }
      error?: string
    }>
  }
  billings: {
    create(body: Record<string, unknown>): Promise<{
      success: boolean
      data?: { id: string }
      error?: string
    }>
  }
}
