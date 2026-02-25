const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'cpf', 'hash', 'authorization', 'accessToken']

/**
 * Recursively removes sensitive fields from an object before logging to audit log.
 */
export function sanitizeForAudit(data: unknown): any {
    if (!data || typeof data !== 'object') {
        return data
    }

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeForAudit(item))
    }

    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(data as Record<string, any>)) {
        if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForAudit(value)
        } else {
            sanitized[key] = value
        }
    }

    return sanitized
}
