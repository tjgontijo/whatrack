export type MetaTemplate = {
  name: string
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'DISABLED'
  category: string
  language: string
  id: string
}

export async function getMetaTemplates(businessAccountId: string, accessToken: string): Promise<MetaTemplate[]> {
  try {
    const url = `https://graph.facebook.com/v24.0/${businessAccountId}/message_templates`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('[meta-cloud/get-templates] Error:', response.status, response.statusText)
      return []
    }

    const data = (await response.json()) as Record<string, unknown>
    const templates = (data.data as MetaTemplate[]) || []

    return templates.filter((t) => t.status === 'APPROVED')
  } catch (error) {
    console.error('[meta-cloud/get-templates] Error:', error)
    return []
  }
}
