import "server-only"
import { DealLineItemInput } from '../schemas/deal.schemas'

export async function updateDealLineItem(params: {
  organizationId: string
  dealId: string
  lineItemId: string
  data: Partial<DealLineItemInput>
}) {
  throw new Error('Deal line items are not supported by the current schema')
}
