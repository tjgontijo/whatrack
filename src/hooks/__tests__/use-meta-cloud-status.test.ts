import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'

import { useMetaCloudStatus } from '../use-meta-cloud-status'

vi.mock('@/lib/auth/auth-client', () => ({
  authClient: {
    useActiveOrganization: () => ({
      data: { id: 'org-test-123' },
    }),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useMetaCloudStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns hasAddon: false when no subscription', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ hasAddon: false, credential: null }),
    } as Response)

    const { result } = renderHook(() => useMetaCloudStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasAddon).toBe(false)
    expect(result.current.isConfigured).toBe(false)
    expect(result.current.credential).toBeNull()
  })

  it('returns hasAddon: true when subscription has addon', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ hasAddon: true, credential: null }),
    } as Response)

    const { result } = renderHook(() => useMetaCloudStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasAddon).toBe(true)
    expect(result.current.isConfigured).toBe(false)
  })

  it('returns isConfigured: true when credential exists', async () => {
    const mockCredential = {
      id: 'cred-1',
      phoneNumberId: '123456789',
      wabaId: '987654321',
      phoneNumber: '5511999999999',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ hasAddon: true, credential: mockCredential }),
    } as Response)

    const { result } = renderHook(() => useMetaCloudStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasAddon).toBe(true)
    expect(result.current.isConfigured).toBe(true)
    expect(result.current.credential).toEqual(mockCredential)
  })

  it('handles API error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useMetaCloudStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasAddon).toBe(false)
    expect(result.current.isConfigured).toBe(false)
  })
})
