import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
    requestId: string
    ip: string | null
    userAgent: string | null
    organizationId?: string
    userId?: string
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore()
}
