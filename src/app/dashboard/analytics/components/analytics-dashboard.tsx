'use client'

import { useState } from 'react'
import ConversionFunnel from './conversion-funnel'
import SlaOverview from './sla-overview'
import HeatmapHours from './heatmap-hours'
import EfficiencyChart from './efficiency-chart'
import LeadActivity from './lead-activity'

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Grids superiores */}
      <div className="grid h-96 grid-cols-1 gap-6 md:grid-cols-2">
        <ConversionFunnel startDate={dateRange.startDate} endDate={dateRange.endDate} />
        <SlaOverview startDate={dateRange.startDate} endDate={dateRange.endDate} />
      </div>

      <div className="grid h-96 grid-cols-1 gap-6 md:grid-cols-2">
        <HeatmapHours startDate={dateRange.startDate} endDate={dateRange.endDate} />
        <EfficiencyChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
      </div>

      {/* Lista de Leads Frios/Quentes */}
      <div className="grid grid-cols-1">
        <LeadActivity />
      </div>
    </div>
  )
}
