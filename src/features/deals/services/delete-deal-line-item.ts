import "server-only"

export async function deleteDealLineItem(params: {
  organizationId: string
  dealId: string
  lineItemId: string
}) {
  throw new Error('Deal line items are not supported by the current schema')
}
