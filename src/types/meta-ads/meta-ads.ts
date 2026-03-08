export interface MetaConnectionSummary {
  id: string
  fbUserId: string
  fbUserName: string | null
  status: string
  updatedAt: Date | string
}

export interface MetaAdAccountSummary {
  id: string
  adAccountId: string
  adAccountName: string
  isActive: boolean
}

export interface MetaPixelConfig {
  id: string
  name: string | null
  pixelId: string
  capiToken: string
  isActive: boolean
}

export interface MetaRoiAccountSummary {
  accountId: string
  accountName: string
  spend: number
  revenue: number
  roas: string
  impressions: number
  clicks: number
}

export interface MetaRoiCampaignSummary {
  campaignId: string
  campaignName: string
  accountName: string
  spend: number
  revenue: number
  roas: string
  impressions: number
  clicks: number
}

export interface MetaRoiResponse {
  accountSummary: MetaRoiAccountSummary[]
  campaigns: MetaRoiCampaignSummary[]
}

