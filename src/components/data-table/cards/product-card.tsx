'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableCardTitle,
  DataTableCardMeta,
  DataTableCardContent,
  DataTableCardRow,
  DataTableCardFooter,
} from './data-table-card'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  id: string
  name: string
  active: boolean
  category: { id: string; name: string } | null
  price: number | null
  cost: number | null
  updatedAt: string
  onEdit?: (productId: string) => void
  className?: string
}

/**
 * ProductCard - Mobile card view for a product
 *
 * Features:
 * - Product name and status badge
 * - Category information
 * - Price and cost
 * - Last updated date
 * - Edit button
 */
export const ProductCard = React.memo(
  React.forwardRef<HTMLDivElement, ProductCardProps>(
    (
      {
        id,
        name,
        active,
        category,
        price,
        cost,
        updatedAt,
        onEdit,
        className,
      },
      ref
    ) => {
      const formattedDate = new Date(updatedAt).toLocaleString('pt-BR', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      })

      const margin = price && cost ? ((price - cost) / price * 100).toFixed(0) : null

      return (
        <DataTableCard ref={ref} className={className}>
          <DataTableCardHeader>
            <div className="flex items-start justify-between gap-2">
              <DataTableCardTitle>{name}</DataTableCardTitle>
              <Badge variant={active ? 'default' : 'secondary'}>
                {active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </DataTableCardHeader>

          <DataTableCardContent>
            {/* Category */}
            {category && (
              <DataTableCardRow label="Categoria">
                <span className="text-sm">{category.name}</span>
              </DataTableCardRow>
            )}

            {/* Price */}
            {price !== null && (
              <DataTableCardRow label="Preço">
                <span className="text-sm font-semibold">{formatCurrencyBRL(price)}</span>
              </DataTableCardRow>
            )}

            {/* Cost */}
            {cost !== null && (
              <DataTableCardRow label="Custo">
                <span className="text-sm text-muted-foreground">{formatCurrencyBRL(cost)}</span>
              </DataTableCardRow>
            )}

            {/* Margin */}
            {margin !== null && (
              <DataTableCardRow label="Margem">
                <span className="text-sm font-medium text-green-600">{margin}%</span>
              </DataTableCardRow>
            )}

            {/* Updated At */}
            <div className="border-t pt-3 mt-3">
              <div className="text-xs text-muted-foreground">
                Atualizado em {formattedDate}
              </div>
            </div>
          </DataTableCardContent>

          {onEdit && (
            <DataTableCardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(id)}
                className="w-full"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DataTableCardFooter>
          )}
        </DataTableCard>
      )
    }
  )
)

ProductCard.displayName = 'ProductCard'
