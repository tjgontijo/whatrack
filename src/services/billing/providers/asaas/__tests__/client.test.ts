import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/**
 * Asaas HTTP Client Tests
 *
 * Testa o cliente HTTP para comunicação com a API do Asaas.
 */
describe('Asaas HTTP Client', () => {
  const originalEnv = process.env
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      ASAAS_API_KEY: 'test_api_key',
      ASAAS_ENVIRONMENT: 'sandbox',
    }
    global.fetch = mockFetch
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should export createAsaasClient function', async () => {
    const { createAsaasClient } = await import('../client')
    expect(createAsaasClient).toBeDefined()
    expect(typeof createAsaasClient).toBe('function')
  })

  it('should create a client with get, post, put, delete methods', async () => {
    const { createAsaasClient } = await import('../client')
    const client = createAsaasClient()

    expect(client.get).toBeDefined()
    expect(client.post).toBeDefined()
    expect(client.put).toBeDefined()
    expect(client.delete).toBeDefined()
  })

  describe('HTTP Methods', () => {
    it('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'cus_123' }),
      })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient()

      const result = await client.get('/customers/cus_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/customers/cus_123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            access_token: 'test_api_key',
          }),
        })
      )
      expect(result).toEqual({ id: 'cus_123' })
    })

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'cus_new' }),
      })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient()

      const body = { name: 'Test', email: 'test@test.com' }
      await client.post('/customers', body)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/customers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    })

    it('should make PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'cus_123' }),
      })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient()

      const body = { name: 'Updated' }
      await client.put('/customers/cus_123', body)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/customers/cus_123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      )
    })

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient()

      await client.delete('/customers/cus_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/customers/cus_123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw ProviderApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            errors: [{ code: 'invalid_field', description: 'Email is invalid' }],
          }),
      })

      const { createAsaasClient } = await import('../client')
      const { ProviderApiError } = await import('../../../errors')
      const client = createAsaasClient()

      await expect(client.get('/customers')).rejects.toThrow(ProviderApiError)
    })

    it('should throw ProviderApiError with status code on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ errors: [{ description: 'Not found' }] }),
      })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient()

      try {
        await client.get('/customers/invalid')
      } catch (error: unknown) {
        expect((error as { statusCode: number }).statusCode).toBe(404)
      }
    })

    it('should handle rate limiting (429) with retry', async () => {
      // Reset mock for this specific test
      mockFetch.mockReset()

      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '0' }),
          json: () => Promise.resolve({ errors: [{ description: 'Rate limited' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'cus_123' }),
        })

      const { createAsaasClient } = await import('../client')
      const client = createAsaasClient({ maxRetries: 1, retryDelay: 10 })

      const result = await client.get('/customers/cus_123')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ id: 'cus_123' })
    })
  })
})
