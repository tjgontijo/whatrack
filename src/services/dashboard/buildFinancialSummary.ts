export type FinancialSummaryInput = {
  totalRevenue: number
  salesCount: number
  investment?: number | null
  productsCost?: number | null
  servicesCount?: number | null
}

export type FinancialSummary = {
  netRevenue: number
  investment: number
  productsCost: number
  servicesCount: number
  grossProfit: number
  netProfit: number
  roas: number | null
  roi: number | null
  returnOnInvestment: number | null
  cards: {
    revenue: number
    investment: number
    roas: number | null
    cac: number | null
    ticket: number | null
  }
}

export function buildFinancialSummary({
  totalRevenue,
  salesCount,
  investment = 0,
  productsCost = 0,
  servicesCount = 0,
}: FinancialSummaryInput): FinancialSummary {
  const netRevenue = totalRevenue
  const investmentValue = Number.isFinite(investment) ? Number(investment) : 0
  const productsCostValue = Number.isFinite(productsCost) ? Number(productsCost) : 0
  const servicesCountValue = Number.isFinite(servicesCount) ? Number(servicesCount) : 0

  const grossProfit = netRevenue - productsCostValue
  const netProfit = grossProfit - investmentValue

  const roas = investmentValue > 0 ? netRevenue / investmentValue : null
  const roi = investmentValue > 0 ? netProfit / investmentValue : null
  const returnOnInvestment = roi

  const cac = salesCount > 0 && investmentValue > 0 ? investmentValue / salesCount : null
  const ticket = salesCount > 0 ? netRevenue / salesCount : null

  return {
    netRevenue,
    investment: investmentValue,
    productsCost: productsCostValue,
    servicesCount: servicesCountValue,
    grossProfit,
    netProfit,
    roas,
    roi,
    returnOnInvestment,
    cards: {
      revenue: netRevenue,
      investment: investmentValue,
      roas,
      cac,
      ticket,
    },
  }
}
