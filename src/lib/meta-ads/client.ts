import { apiFetch } from '@/lib/api-client'
import type {
  MetaAdAccountToggleBodyInput,
  MetaPixelCreateBodyInput,
  MetaPixelUpdateBodyInput,
} from '@/schemas/meta-ads/meta-ads-schemas'
import type {
  MetaAdAccountSummary,
  MetaConnectionSummary,
  MetaPixelConfig,
  MetaRoiResponse,
} from '@/types/meta-ads/meta-ads'

export const META_ADS_CONNECT_PATH = '/api/v1/meta-ads/connect'

function buildMetaAdsUrl(path: string, query?: URLSearchParams) {
  const queryString = query?.toString()
  return queryString ? `${path}?${queryString}` : path
}

export const metaAdsClient = {
  getInsights(orgId: string) {
    return apiFetch('/api/v1/meta-ads/insights', {
      orgId,
    }) as Promise<MetaRoiResponse>
  },

  getConnections(orgId: string) {
    return apiFetch('/api/v1/meta-ads/connections', {
      orgId,
    }) as Promise<MetaConnectionSummary[]>
  },

  deleteConnection(connectionId: string, orgId: string) {
    const query = new URLSearchParams({ id: connectionId })
    return apiFetch(buildMetaAdsUrl('/api/v1/meta-ads/connections', query), {
      method: 'DELETE',
      orgId,
    }) as Promise<{ success: boolean }>
  },

  getAdAccounts(orgId: string, options?: { sync?: boolean }) {
    const query = new URLSearchParams()
    if (options?.sync) {
      query.set('sync', 'true')
    }

    return apiFetch(buildMetaAdsUrl('/api/v1/meta-ads/ad-accounts', query), {
      orgId,
    }) as Promise<MetaAdAccountSummary[]>
  },

  toggleAdAccount(accountId: string, body: MetaAdAccountToggleBodyInput, orgId: string) {
    return apiFetch(`/api/v1/meta-ads/ad-accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      orgId,
    }) as Promise<MetaAdAccountSummary>
  },

  getPixels(orgId: string) {
    return apiFetch('/api/v1/meta-ads/pixels', {
      orgId,
    }) as Promise<MetaPixelConfig[]>
  },

  createPixel(body: MetaPixelCreateBodyInput, orgId: string) {
    return apiFetch('/api/v1/meta-ads/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      orgId,
    }) as Promise<MetaPixelConfig>
  },

  updatePixel(pixelId: string, body: MetaPixelUpdateBodyInput, orgId: string) {
    return apiFetch(`/api/v1/meta-ads/pixels/${pixelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      orgId,
    }) as Promise<MetaPixelConfig>
  },

  deletePixel(pixelId: string, orgId: string) {
    return apiFetch(`/api/v1/meta-ads/pixels/${pixelId}`, {
      method: 'DELETE',
      orgId,
    }) as Promise<{ success: boolean }>
  },
}
