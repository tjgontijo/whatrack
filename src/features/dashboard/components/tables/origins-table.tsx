import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OriginDailyMetric } from '@/features/dashboard/services/origins-metrics.service'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

interface OriginsTableProps {
  data: OriginDailyMetric[]
  isLoading?: boolean
}

export function OriginsTable({ data, isLoading }: OriginsTableProps) {
  const formatOrigin = (metric: OriginDailyMetric) => {
    const source = metric.utmSource || 'direto'
    const medium = metric.utmMedium || 'none'
    const campaign = metric.utmCampaign || 'none'
    return `${source} / ${medium} / ${campaign}`
  }

  if (isLoading) {
    return (
      <div className='rounded-lg border'>
        <div className='h-96 animate-pulse bg-slate-100' />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center'>
        <p className='text-slate-500'>Nenhuma métrica de origem encontrada</p>
      </div>
    )
  }

  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow className='border-b'>
            <TableHead>Origem</TableHead>
            <TableHead className='text-right'>Leads</TableHead>
            <TableHead className='text-right'>Vendas</TableHead>
            <TableHead className='text-right'>Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((metric) => (
            <TableRow key={metric.originKey} className='border-b'>
              <TableCell className='font-medium'>{formatOrigin(metric)}</TableCell>
              <TableCell className='text-right'>{metric.leadsCount}</TableCell>
              <TableCell className='text-right'>{metric.salesCount}</TableCell>
              <TableCell className='text-right font-medium'>
                {formatCurrencyBRL(metric.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
