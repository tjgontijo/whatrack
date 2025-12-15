import React from 'react'
import { fireEvent, render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { CategoriesTable } from '../categories-table'

vi.mock('@/lib/organization', () => ({
  getClientOrganizationId: () => 'org-test',
  ORGANIZATION_HEADER: 'x-organization-id',
}))

const pushMock = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
    entries: () => mockSearchParams.entries(),
    toString: () => mockSearchParams.toString(),
  }),
  useRouter: () => ({
    push: pushMock,
  }),
}))

const categoriesResponse = {
  items: [
    {
      id: 'cat-1',
      name: 'Depilação',
      active: true,
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-01-11T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 10,
}

function mockFetch(jsonData: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => jsonData,
  } as Response)

  vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
  return fetchMock
}

function renderWithClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>)
}

describe('CategoriesTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSearchParams = new URLSearchParams()
    pushMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renderiza categorias e filtros básicos', async () => {
    mockFetch(categoriesResponse)
    renderWithClient(<CategoriesTable />)

    expect(screen.getByPlaceholderText('Nome da categoria')).toBeInTheDocument()
    await screen.findByText('Depilação')
  })

  it('reaplica filtros quando alterar a busca', async () => {
    mockFetch(categoriesResponse)
    renderWithClient(<CategoriesTable />)

    await act(async () => {
      const input = screen.getByPlaceholderText('Nome da categoria')
      fireEvent.change(input, { target: { value: 'Depilação' } })
      await new Promise((resolve) => setTimeout(resolve, 450))
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })
    const lastCall = pushMock.mock.calls.at(-1)?.[0] as string
    expect(lastCall).toContain('categoryQ=Depila%C3%A7%C3%A3o')
  })
})
