import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'
import { HeaderPageShell } from '@/components/dashboard/layout/header-page-shell'
import { HeaderTabs } from '@/components/dashboard/layout/header-tabs'

describe('HeaderPageShell', () => {
  it('renders only the title when no optional controls are provided', () => {
    render(
      <HeaderPageShell title="Perfil">
        <div>content</div>
      </HeaderPageShell>,
    )

    expect(screen.getByText('Perfil')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Atualizar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('header-page-shell-separator')).not.toBeInTheDocument()
    expect(screen.getByTestId('header-page-shell-body')).toHaveClass('min-h-full', 'px-6', 'py-6')
  })

  it('renders a selector node next to the title', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()

    render(
      <HeaderPageShell
        title="Equipe"
        selector={
          <HeaderTabs
            tabs={[
              { key: 'members', label: 'Membros' },
              { key: 'roles', label: 'Papéis' },
            ]}
            activeTab="members"
            onTabChange={onTabChange}
          />
        }
      >
        <div>content</div>
      </HeaderPageShell>,
    )

    expect(screen.getByRole('button', { name: 'Membros' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Papéis' }))

    expect(onTabChange).toHaveBeenCalledWith('roles')
  })

  it('shows search and refresh with a separator when the search has trailing controls', () => {
    render(
      <HeaderPageShell
        title="Meta Ads"
        searchValue="roi"
        onSearchChange={() => {}}
        onRefresh={() => {}}
      >
        <div>content</div>
      </HeaderPageShell>,
    )

    expect(screen.getByDisplayValue('roi')).toBeInTheDocument()
    expect(screen.getByTitle('Atualizar')).toBeInTheDocument()
    expect(screen.getByTestId('header-page-shell-separator')).toBeInTheDocument()
  })

  it('renders the full control strip and separator in the canonical order', () => {
    render(
      <HeaderPageShell
        title="Leads"
        searchValue=""
        onSearchChange={() => {}}
        actions={<span>42 itens</span>}
        primaryAction={<Button type="button">Novo lead</Button>}
        filters={<div>Filtros avançados</div>}
        onRefresh={() => {}}
      >
        <div>content</div>
      </HeaderPageShell>,
    )

    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
    expect(screen.getByTestId('header-page-shell-separator')).toBeInTheDocument()
    expect(screen.getByText('42 itens')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo lead' })).toBeInTheDocument()
    expect(screen.getByTitle('Filtros')).toBeInTheDocument()
    expect(screen.getByTitle('Atualizar')).toBeInTheDocument()
  })
})
