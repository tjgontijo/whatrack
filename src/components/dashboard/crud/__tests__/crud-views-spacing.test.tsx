import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'

describe('crud shared views spacing', () => {
  it('does not add a page-level top margin to CrudListView', () => {
    const { container } = render(
      <CrudListView
        data={[{ id: '1', name: 'Lead 1' }]}
        columns={[
          {
            key: 'name',
            label: 'Nome',
            render: (item) => item.name,
          },
        ]}
      />,
    )

    expect(container.firstElementChild).not.toHaveClass('mt-6')
  })

  it('does not add page-level frame padding to CrudCardView', () => {
    const { container } = render(
      <CrudCardView
        data={[{ id: '1', name: 'Lead 1' }]}
        config={{
          title: (item) => item.name,
        }}
      />,
    )

    expect(container.firstElementChild).not.toHaveClass('pt-6')

    const grid = container.querySelector('.grid')
    expect(grid?.className).not.toContain('px-4')
    expect(grid?.className).not.toContain('pb-8')
  })
})
