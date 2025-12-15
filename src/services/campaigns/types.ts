import type {
  Campaign,
  CampaignRecipient,
  CampaignStatus,
  TemplateCategory,
  TemplateStatus,
  MessageStatus,
} from '@prisma/client'

export type RecipientInput = {
  phone: string
  variables?: Record<string, unknown>
}

export type CreateCampaignParams = {
  organizationId: string
  templateId: string
  name: string
  recipients: RecipientInput[]
  scheduledAt?: Date | string | null
}

export type UpdateCampaignParams = {
  organizationId: string
  campaignId: string
  name?: string
  scheduledAt?: Date | string | null
}

export type ListCampaignsParams = {
  organizationId: string
  status?: CampaignStatus
  templateId?: string
  dateFrom?: Date | string | null
  dateTo?: Date | string | null
  page?: number
  pageSize?: number
}

export type ListRecipientsParams = {
  organizationId: string
  campaignId: string
  status?: MessageStatus
  page?: number
  pageSize?: number
}

export type ListTemplatesParams = {
  organizationId: string
  category?: TemplateCategory
  status?: TemplateStatus
  page?: number
  pageSize?: number
}

export type CampaignListItem = Campaign & {
  template: {
    id: string
    name: string
    category: TemplateCategory
    status: TemplateStatus
  }
}

export type RecipientListItem = CampaignRecipient
