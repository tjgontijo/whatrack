import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MetaEntityDailyMetric } from '@/features/dashboard/services/meta-entity-metrics.service'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

interface MetaEntitiesTableProps {
  data: MetaEntityDailyMetric[]
  isLoading?: boolean
}

export function MetaEntitiesTable({ data, isLoading }: MetaEntitiesTableProps) {
  const getEntityLabel = (metric: MetaEntityDailyMetric) => {
    if (metric.metaAdId) {
      return `Anúncio ${metric.metaAdId.slice(-6)}`
    }
    if (metric.metaAdSetId) {
      return `Conjunto ${metric.metaAdSetId.slice(-6)}`
    }
    if (metric.metaCampaignId) {
      return `Campanha ${metric.metaCampaignId.slice(-6)}`
    }
    return 'N/A'
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
        <p className='text-slate-500'>Nenhuma métrica de entidade Meta encontrada</p>
      </div>
    )
  }

  const sortedData = [...data].sort((a, b) => b.spend - a.spend)

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow className='border-b'>
            <TableHead>Entidade</TableHead>
            <TableHead className='text-right'>Investimento</TableHead>
            <TableHead className='text-right'>Cliques</TableHead>
            <TableHead className='text-right'>Impressões</TableHead>
            <TableHead className='text-right'>Leads</TableHead>
            <TableHead className='text-right'>Receita</TableHead>
            <TableHead className='text-right'>ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((metric) => (
            <TableRow key={metric.entityKey} className='border-b'>
              <TableCell className='font-medium'>{getEntityLabel(metric)}</TableCell>
              <TableCell className='text-right'>{formatCurrencyBRL(metric.spend)}</TableCell>
              <TableCell className='text-right'>{metric.clicks}</TableCell>
              <TableCell className='text-right'>{(metric.impressions / 1000).toFixed(1)}k</TableCell>
              <TableCell className='text-right'>{metric.leadsAttribued}</TableCell>
              <TableCell className='text-right font-medium'>
                {formatCurrencyBRL(metric.revenue)}
              </TableCell>
              <TableCell className='text-right'>
                <span
                  className={(metric.roas ?? 0) > 1 ? 'text-green-600 font-medium' : 'text-red-600'}
                >
                  {(metric.roas ?? 0).toFixed(2)}x
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
