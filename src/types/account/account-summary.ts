import type { SubscriptionResponse } from '@/schemas/billing/billing-schemas'

export type AccountProfileSummary = {
  id: string
  name: string
  email: string
  phone: string | null
  updatedAt: string
}

export type AccountOrganizationSummary = {
  id: string
  name: string
  organizationType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
  legalName: string | null
  tradeName: string | null
  taxStatus: string | null
  city: string | null
  state: string | null
  currentUserRole?: string
  updatedAt: string
}

export type AccountSummary = {
  account: AccountProfileSummary | null
  organization: AccountOrganizationSummary | null
  subscription: SubscriptionResponse | null
}
