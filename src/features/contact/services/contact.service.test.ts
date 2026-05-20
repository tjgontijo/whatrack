import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContactRequestInput } from '../schemas/contact.schemas'
import { dispatchContactWebhook } from './contact.service'

describe('contact.service (Unit)', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockClear()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes the optional tracking fields and sends a POST request with the correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })

    const input: ContactRequestInput = {
      body: {
        name: 'John Doe',
        phone: '5511999999999',
        createdAt: '2026-05-20T20:00:00Z',
        tracking: {
          trafficSource: 'facebook',
          utmSource: '  fb_ads  ', // should be trimmed
          utmMedium: '', // should be normalized to null
          utmCampaign: null, // should be normalized to null
          fbclid: '12345',
          gclid: undefined, // should be normalized to null
        },
      },
    }

    const result = await dispatchContactWebhook(input)

    expect(result).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://webhook.elev8.com.br/webhook/e400a55e-a59d-4130-9add-db88cd65bfd1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          phone: '5511999999999',
          tracking: {
            trafficSource: 'facebook',
            utmSource: 'fb_ads',
            utmMedium: null,
            utmCampaign: null,
            fbclid: '12345',
            gclid: null,
          },
          createdAt: '2026-05-20T20:00:00Z',
        }),
      }
    )
  })

  it('returns error details if the webhook response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const input: ContactRequestInput = {
      body: {
        name: 'Jane Doe',
        phone: '5511888888888',
        createdAt: '2026-05-20T20:00:00Z',
        tracking: {
          trafficSource: 'google',
          utmSource: 'google_search',
          utmMedium: 'organic',
          utmCampaign: 'seo',
          fbclid: null,
          gclid: '67890',
        },
      },
    }

    const result = await dispatchContactWebhook(input)

    expect(result).toEqual({ error: 'Erro ao enviar (500)', status: 500 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
