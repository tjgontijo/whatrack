import { ORGANIZATION_HEADER } from './constants/http-headers'

interface FetchOptions extends RequestInit {
    orgId?: string
}

export async function apiFetch(url: string, options: FetchOptions = {}) {
    const { orgId, ...rest } = options

    const headers = new Headers(rest.headers)
    if (orgId) {
        headers.set(ORGANIZATION_HEADER, orgId)
    }

    const response = await fetch(url, {
        ...rest,
        headers,
    })

    if (!response.ok) {
        let errorData
        try {
            errorData = await response.json()
        } catch {
            errorData = { error: `HTTP error! status: ${response.status}` }
        }
        throw new Error(errorData.error || errorData.message || `API error: ${response.status}`)
    }

    return response.json()
}
