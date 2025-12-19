interface BusinessInputs {
  leadsPerDay: string
  avgTicket: string
  monthlyRevenue: string
  attendantsCount: string
  monthlyAdSpend?: string
}

interface CalculatedMetrics {
  estimatedConversionRate: number | null
  estimatedCPL: number | null
  estimatedCAC: number | null
  estimatedROAS: number | null
  estimatedLeadValue: number | null
  leadsPerAttendant: number | null
  revenuePerAttendant: number | null
}

const LEADS_PER_DAY_MAP: Record<string, number> = {
  '1-5': 3,
  '6-10': 8,
  '11-20': 15,
  '21-50': 35,
  '51-100': 75,
  '100+': 150,
}

const AVG_TICKET_MAP: Record<string, number> = {
  'ate_500': 250,
  '500_1500': 1000,
  '1500_5000': 3250,
  '5000_15000': 10000,
  '15000+': 25000,
}

const MONTHLY_REVENUE_MAP: Record<string, number> = {
  'ate_10k': 5000,
  '10k_50k': 30000,
  '50k_100k': 75000,
  '100k_500k': 300000,
  '500k+': 750000,
}

const ATTENDANTS_MAP: Record<string, number> = {
  '1': 1,
  '2-5': 3,
  '6-10': 8,
  '11-20': 15,
  '21-50': 35,
  '50+': 75,
}

const AD_SPEND_MAP: Record<string, number> = {
  'nenhum': 0,
  'ate_1k': 500,
  '1k_5k': 3000,
  '5k_20k': 12500,
  '20k_50k': 35000,
  '50k+': 75000,
}

export function calculateMetrics(inputs: BusinessInputs): CalculatedMetrics {
  const leadsPerDay = LEADS_PER_DAY_MAP[inputs.leadsPerDay] || 0
  const avgTicket = AVG_TICKET_MAP[inputs.avgTicket] || 0
  const monthlyRevenue = MONTHLY_REVENUE_MAP[inputs.monthlyRevenue] || 0
  const attendants = ATTENDANTS_MAP[inputs.attendantsCount] || 1
  const adSpend = inputs.monthlyAdSpend ? AD_SPEND_MAP[inputs.monthlyAdSpend] || 0 : 0

  const leadsPerMonth = leadsPerDay * 30
  const salesPerMonth = avgTicket > 0 ? monthlyRevenue / avgTicket : 0

  // Taxa de conversão = Vendas / Leads
  const conversionRate = leadsPerMonth > 0 
    ? (salesPerMonth / leadsPerMonth) * 100 
    : null

  // CPL = Investimento / Leads
  const cpl = leadsPerMonth > 0 && adSpend > 0 
    ? adSpend / leadsPerMonth 
    : null

  // CAC = Investimento / Vendas
  const cac = salesPerMonth > 0 && adSpend > 0 
    ? adSpend / salesPerMonth 
    : null

  // ROAS = Faturamento / Investimento
  const roas = adSpend > 0 
    ? monthlyRevenue / adSpend 
    : null

  // Valor do Lead = Ticket * Conversão
  const leadValue = conversionRate !== null 
    ? avgTicket * (conversionRate / 100) 
    : null

  // Leads por atendente
  const leadsPerAttendant = leadsPerMonth / attendants

  // Faturamento por atendente
  const revenuePerAttendant = monthlyRevenue / attendants

  return {
    estimatedConversionRate: conversionRate ? Math.round(conversionRate * 100) / 100 : null,
    estimatedCPL: cpl ? Math.round(cpl * 100) / 100 : null,
    estimatedCAC: cac ? Math.round(cac * 100) / 100 : null,
    estimatedROAS: roas ? Math.round(roas * 100) / 100 : null,
    estimatedLeadValue: leadValue ? Math.round(leadValue * 100) / 100 : null,
    leadsPerAttendant: Math.round(leadsPerAttendant * 100) / 100,
    revenuePerAttendant: Math.round(revenuePerAttendant * 100) / 100,
  }
}
