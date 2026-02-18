'use client'

import { Package, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

import { SectionWrapper, ShowcaseBox } from './shared'

const data = [
  { nome: 'Maria Silva', email: 'maria@email.com', status: 'Ativo', vendas: 'R$ 12.400' },
  { nome: 'João Santos', email: 'joao@email.com', status: 'Pendente', vendas: 'R$ 8.200' },
  { nome: 'Ana Costa', email: 'ana@email.com', status: 'Ativo', vendas: 'R$ 22.100' },
  { nome: 'Pedro Lima', email: 'pedro@email.com', status: 'Inativo', vendas: 'R$ 3.050' },
]

export function TablesSection() {
  return (
    <SectionWrapper
      id="tabelas"
      title="Listas & Tabelas"
      description="Padrões para exibição de dados em formato tabular. Use Table para desktop e DataTableCard para mobile."
    >
      <ShowcaseBox>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.nome}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      row.status === 'Ativo' && 'bg-success/10 text-success border-success/20',
                      row.status === 'Pendente' && 'bg-warning/10 text-warning border-warning/20',
                      row.status === 'Inativo' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {row.vendas}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ShowcaseBox>

      <ShowcaseBox className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Empty State
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-3">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhum item encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Tente ajustar os filtros ou adicione um novo registro.
          </p>
          <Button size="sm" className="mt-4">
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}
