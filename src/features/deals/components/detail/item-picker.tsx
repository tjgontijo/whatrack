'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import type { ItemListItem } from '@/features/items/types'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

interface ItemPickerProps {
  onSelect: (item: { itemId?: string; name: string; unitPrice: number }) => void
}

export function ItemPicker({ onSelect }: ItemPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: items } = useCrudInfiniteQuery<ItemListItem>({
    queryKey: ['items', search],
    endpoint: '/api/v1/items',
    filters: { search, status: 'active' },
    enabled: open,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-7 gap-1.5 text-[10px] uppercase'>
          <Plus className='h-3.5 w-3.5' />
          Adicionar Item
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0' align='end'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder='Buscar no catálogo...'
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className='custom-scrollbar'>
            <CommandEmpty>
              <div className='p-4 text-center'>
                <p className='mb-2 text-muted-foreground text-xs'>Nenhum item encontrado.</p>
                {search.length > 0 && (
                  <Button
                    size='sm'
                    className='w-full text-[10px] uppercase'
                    onClick={() => {
                      onSelect({ name: search, unitPrice: 0 })
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    Adicionar "{search}" como item livre
                  </Button>
                )}
              </div>
            </CommandEmpty>
            {items.length > 0 && (
              <CommandGroup heading='Catálogo'>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onSelect({
                        itemId: item.id,
                        name: item.name,
                        unitPrice: 0,
                      })
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className='flex w-full items-center justify-between'>
                      <span className='truncate'>{item.name}</span>
                      <span className='shrink-0 text-muted-foreground text-xs'>
                        {formatCurrencyBRL(0)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
