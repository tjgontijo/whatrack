import { getClientProjectId } from './project-client-context'
import { ORGANIZATION_HEADER, PROJECT_HEADER } from './constants/http-headers'

interface FetchOptions extends RequestInit {
    orgId?: string
    projectId?: string
}

export async function apiFetch(url: string, options: FetchOptions = {}) {
    const { orgId, projectId, ...rest } = options
    const headers = new Headers(rest.headers)

    if (orgId) {
        headers.set(ORGANIZATION_HEADER, orgId)
    }

    if (projectId) {
        headers.set(PROJECT_HEADER, projectId)
    } else if (typeof window !== 'undefined' && !headers.has(PROJECT_HEADER)) {
        const currentProjectId = getClientProjectId()
        if (currentProjectId) {
            headers.set(PROJECT_HEADER, currentProjectId)
        }
    }

    const response = await fetch(url, {
        ...rest,
        headers,
        credentials: 'include', // Include cookies in cross-origin requests
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
