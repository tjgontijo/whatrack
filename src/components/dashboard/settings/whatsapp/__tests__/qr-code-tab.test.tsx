import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { QRCodeTab } from '../qr-code-tab'

vi.mock('@/lib/auth/auth-client', () => ({
  authClient: {
    useActiveOrganization: () => ({
      data: { id: 'org-test-123' },
    }),
  },
}))

vi.mock('@/lib/constants', () => ({
  ORGANIZATION_HEADER: 'x-organization-id',
}))

vi.mock('@/hooks/use-organization-limits', () => ({
  useOrganizationLimits: () => ({
    limits: { maxWhatsappInstances: 3 },
    isLoading: false,
  }),
}))

const mockInstances = [
  {
    id: 'inst-1',
    instanceId: 'instance-1',
    label: 'Atendimento',
    phone: '5561999999999',
    status: 'connected',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'inst-2',
    instanceId: 'instance-2',
    label: 'Vendas',
    phone: '5561888888888',
    status: 'disconnected',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
]

function mockFetch(instances = mockInstances) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ items: instances }),
  } as Response)
}

function renderWithClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

describe('QRCodeTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders empty state when no instances', async () => {
    mockFetch([])
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText('Nenhum número conectado ainda.')).toBeInTheDocument()
    })
  })

  it('renders instance list', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText('Atendimento')).toBeInTheDocument()
      expect(screen.getByText('Vendas')).toBeInTheDocument()
    })
  })

  it('shows connected status badge for connected instances', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument()
    })
  })

  it('shows disconnected status badge for disconnected instances', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText('Desconectado')).toBeInTheDocument()
    })
  })

  it('shows "Enviar Teste" button only for connected instances', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      // Only one instance is connected, so only one test button
      const testButtons = screen.getAllByRole('button', { name: /Enviar Teste/i })
      expect(testButtons).toHaveLength(1)
    })
  })

  it('shows "Requer Conexão" for disconnected instances', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText('Requer Conexão')).toBeInTheDocument()
    })
  })

  it('renders usage indicator', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByText(/Usando/)).toBeInTheDocument()
      expect(screen.getByText(/números do seu plano/)).toBeInTheDocument()
    })
  })

  it('renders "Adicionar" button', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    expect(screen.getByRole('button', { name: /Adicionar/i })).toBeInTheDocument()
  })

  it('renders "Atualizar" button', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument()
  })

  it('renders "Ver planos" link', async () => {
    mockFetch()
    renderWithClient(<QRCodeTab />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Ver planos/i })).toBeInTheDocument()
    })
  })
})
