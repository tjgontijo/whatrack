import "server-only"
import { DealLineItemInput } from '../schemas/deal.schemas'

export async function addDealLineItem(params: {
  organizationId: string
  dealId: string
  data: DealLineItemInput
}) {
  throw new Error('Deal line items are not supported by the current schema')
}
