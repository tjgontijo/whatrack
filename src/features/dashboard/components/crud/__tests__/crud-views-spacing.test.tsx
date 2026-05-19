import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CrudListView } from '@/features/dashboard/components/crud/crud-list-view'

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
      />
    )

    expect(container.firstElementChild).not.toHaveClass('mt-6')
  })
})
