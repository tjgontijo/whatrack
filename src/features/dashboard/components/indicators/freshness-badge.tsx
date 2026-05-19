import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { MetricsFreshness } from '@/features/dashboard/services/metrics-freshness.service'

interface FreshnessBadgeProps {
  freshness: MetricsFreshness
}

export function FreshnessBadge({ freshness }: FreshnessBadgeProps) {
  const getIcon = () => {
    if (freshness.isDashboardFresh) {
      return <CheckCircle className='h-4 w-4 text-green-600' />
    }
    if (freshness.isMetaFresh) {
      return <Clock className='h-4 w-4 text-yellow-600' />
    }
    return <AlertCircle className='h-4 w-4 text-slate-400' />
  }

  const getBgColor = () => {
    if (freshness.isDashboardFresh) {
      return 'bg-green-50 border-green-200'
    }
    if (freshness.isMetaFresh) {
      return 'bg-yellow-50 border-yellow-200'
    }
    return 'bg-slate-50 border-slate-200'
  }

  const getTextColor = () => {
    if (freshness.isDashboardFresh) {
      return 'text-green-700'
    }
    if (freshness.isMetaFresh) {
      return 'text-yellow-700'
    }
    return 'text-slate-600'
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${getBgColor()}`}>
      <div className='flex items-center gap-2'>
        {getIcon()}
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {freshness.freshnessMessage}
        </span>
      </div>
    </div>
  )
}
