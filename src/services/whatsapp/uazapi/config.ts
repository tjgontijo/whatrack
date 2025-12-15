/**
 * Configuração centralizada para UAZAPI
 * 
 * Variáveis de ambiente necessárias:
 * - UAZAPI_BASE_URL: URL base da API (ex: https://api.uazapi.com)
 * - UAZAPI_ADMIN_TOKEN: Token de autenticação admin
 */

export type UazapiConfig = {
    baseUrl: string
    adminToken: string
}

/**
 * Valida e retorna a configuração do UAZAPI
 * @throws {Error} Se alguma variável de ambiente estiver faltando
 */
export function getUazapiConfig(): UazapiConfig {
    const baseUrl = process.env.UAZAPI_BASE_URL?.replace(/\/$/, '')
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN

    if (!baseUrl) {
        throw new Error('UAZAPI_BASE_URL is not configured')
    }

    if (!adminToken) {
        throw new Error('UAZAPI_ADMIN_TOKEN is not configured')
    }

    return {
        baseUrl,
        adminToken,
    }
}
