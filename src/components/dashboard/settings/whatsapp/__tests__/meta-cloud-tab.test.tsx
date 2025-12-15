import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { MetaCloudTab } from '../meta-cloud-tab'

vi.mock('@/lib/auth/auth-client', () => ({
  authClient: {
    useActiveOrganization: () => ({
      data: { id: 'org-test-123' },
    }),
  },
}))

vi.mock('@/hooks/use-meta-cloud-status', () => ({
  useMetaCloudStatus: vi.fn(),
}))

import { useMetaCloudStatus } from '@/hooks/use-meta-cloud-status'

const mockUseMetaCloudStatus = useMetaCloudStatus as ReturnType<typeof vi.fn>

function renderWithClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

describe('MetaCloudTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LOCKED state (no addon)', () => {
    beforeEach(() => {
      mockUseMetaCloudStatus.mockReturnValue({
        hasAddon: false,
        isConfigured: false,
        credential: null,
        isLoading: false,
        refetch: vi.fn(),
      })
    })

    it('renders upsell content when hasAddon is false', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByText('Integração Oficial da Meta')).toBeInTheDocument()
      expect(screen.getByText('Sem necessidade de QR Code')).toBeInTheDocument()
      expect(screen.getByText('Conexão estável 24/7')).toBeInTheDocument()
      expect(screen.getByText('+ R$ 97/mês')).toBeInTheDocument()
    })

    it('renders "Contratar Add-on" button', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByRole('link', { name: /Contratar Add-on/i })).toBeInTheDocument()
    })
  })

  describe('NOT CONFIGURED state (has addon but no credential)', () => {
    beforeEach(() => {
      mockUseMetaCloudStatus.mockReturnValue({
        hasAddon: true,
        isConfigured: false,
        credential: null,
        isLoading: false,
        refetch: vi.fn(),
      })
    })

    it('renders setup prompt when hasAddon is true but not configured', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByText('Configure sua conta Business')).toBeInTheDocument()
      expect(screen.getByText(/Conecte sua conta do WhatsApp Business/i)).toBeInTheDocument()
    })

    it('renders "Configurar WhatsApp Business" button', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByRole('button', { name: /Configurar WhatsApp Business/i })).toBeInTheDocument()
    })
  })

  describe('CONFIGURED state (has addon and credential)', () => {
    const mockCredential = {
      id: 'cred-1',
      phoneNumberId: '123456789',
      wabaId: '987654321',
      phoneNumber: '5511999999999',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    beforeEach(() => {
      mockUseMetaCloudStatus.mockReturnValue({
        hasAddon: true,
        isConfigured: true,
        credential: mockCredential,
        isLoading: false,
        refetch: vi.fn(),
      })
    })

    it('renders account info when configured', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByText('WhatsApp Business')).toBeInTheDocument()
      expect(screen.getByText(/987654321/)).toBeInTheDocument() // WABA ID
      expect(screen.getByText('Configurado')).toBeInTheDocument()
    })

    it('renders template test section', () => {
      renderWithClient(<MetaCloudTab />)

      // Use getAllByText since title and button both have this text
      const elements = screen.getAllByText('Enviar Template de Teste')
      expect(elements.length).toBeGreaterThan(0)
    })

    it('renders "Editar Credenciais" button', () => {
      renderWithClient(<MetaCloudTab />)

      expect(screen.getByRole('button', { name: /Editar Credenciais/i })).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('renders skeleton while loading', () => {
      mockUseMetaCloudStatus.mockReturnValue({
        hasAddon: false,
        isConfigured: false,
        credential: null,
        isLoading: true,
        refetch: vi.fn(),
      })

      renderWithClient(<MetaCloudTab />)

      // Skeleton component should be rendered
      expect(screen.queryByText('Integração Oficial da Meta')).not.toBeInTheDocument()
    })
  })
})
