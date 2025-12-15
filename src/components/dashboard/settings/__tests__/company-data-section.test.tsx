import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CompanyDataSection } from '../company-data-section'

// Mock constants
vi.mock('@/lib/constants', () => ({
  ORGANIZATION_HEADER: 'x-organization-id',
}))

// Mock auth client
vi.mock('@/lib/auth/auth-client', () => ({
  authClient: {
    useActiveOrganization: () => ({
      data: { id: 'org-test' },
    }),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('CompanyDataSection', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('Initial State', () => {
    it('should render CNPJ input and search button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument()
    })

    it('should show empty state when no company data exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.queryByText(/razão social/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('CNPJ Input', () => {
    it('should apply mask as user types', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/cnpj/i)
      await user.type(input, '11222333000181')

      expect(input).toHaveValue('11.222.333/0001-81')
    })

    it('should disable search button for invalid CNPJ', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/cnpj/i)
      await user.type(input, '123')

      const button = screen.getByRole('button', { name: /buscar/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Lookup Flow', () => {
    it('should fetch company data when search button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 }) // initial GET
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE LTDA',
            cnaeCode: '62.01-5-01',
            cnaeDescription: 'Desenvolvimento de software',
            municipio: 'SAO PAULO',
            uf: 'SP',
          }),
        })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/cnpj/i)
      await user.type(input, '11222333000181')

      const button = screen.getByRole('button', { name: /buscar/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('EMPRESA TESTE LTDA')).toBeInTheDocument()
      })
    })

    it('should show preview fields as readonly after lookup', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE LTDA',
            cnaeCode: '62.01-5-01',
            cnaeDescription: 'Desenvolvimento de software',
            municipio: 'SAO PAULO',
            uf: 'SP',
          }),
        })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/cnpj/i)
      await user.type(input, '11222333000181')

      const button = screen.getByRole('button', { name: /buscar/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('SAO PAULO')).toBeInTheDocument()
        expect(screen.getByText('SP')).toBeInTheDocument()
      })
    })

    it('should show error message when lookup fails', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'CNPJ inválido' }),
        })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/cnpj/i)
      await user.type(input, '11222333000181')

      const button = screen.getByRole('button', { name: /buscar/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/erro|inválido/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authorization Checkbox', () => {
    it('should show authorization checkbox in preview state', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE',
            cnaeCode: '62.01-5-01',
            cnaeDescription: 'Desenvolvimento',
            municipio: 'SP',
            uf: 'SP',
          }),
        })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText(/cnpj/i), '11222333000181')
      await user.click(screen.getByRole('button', { name: /buscar/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })
    })

    it('should disable save button when checkbox is unchecked', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE',
            cnaeCode: '62.01-5-01',
            cnaeDescription: 'Desenvolvimento',
            municipio: 'SP',
            uf: 'SP',
          }),
        })

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText(/cnpj/i), '11222333000181')
      await user.click(screen.getByRole('button', { name: /buscar/i }))

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /salvar|confirmar/i })
        expect(saveButton).toBeDisabled()
      })
    })
  })

  describe('Save Flow', () => {
    it('should save company data when authorized', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 }) // initial GET
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE',
            cnaeCode: '62.01-5-01',
            cnaeDescription: 'Desenvolvimento',
            municipio: 'SP',
            uf: 'SP',
          }),
        }) // lookup
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            id: 'company-1',
            cnpj: '11222333000181',
            razaoSocial: 'EMPRESA TESTE',
          }),
        }) // save

      const user = userEvent.setup()
      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnpj/i)).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText(/cnpj/i), '11222333000181')
      await user.click(screen.getByRole('button', { name: /buscar/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByRole('button', { name: /salvar|confirmar/i }))

      await waitFor(() => {
        // Should show success state (4 calls: initial GET, lookup, save POST, re-fetch after invalidation)
        expect(mockFetch).toHaveBeenCalledTimes(4)
      })
    })
  })

  describe('Saved State', () => {
    it('should show saved company data on load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'company-1',
          cnpj: '11222333000181',
          razaoSocial: 'EMPRESA SALVA',
          cnaeCode: '62.01-5-01',
          cnaeDescription: 'Desenvolvimento',
          municipio: 'SAO PAULO',
          uf: 'SP',
        }),
      })

      render(<CompanyDataSection />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('EMPRESA SALVA')).toBeInTheDocument()
      })
    })
  })
})
