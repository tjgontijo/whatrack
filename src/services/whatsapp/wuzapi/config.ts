/**
 * Configuracao centralizada para WuzAPI
 *
 * Variaveis de ambiente necessarias:
 * - WUZAPI_BASE_URL: URL base da API (ex: http://localhost:8080)
 * - WUZAPI_ADMIN_TOKEN: Token de autenticacao admin
 */

export type WuzapiConfig = {
  baseUrl: string
  adminToken: string
}

/**
 * Valida e retorna a configuracao do WuzAPI
 * @throws {Error} Se alguma variavel de ambiente estiver faltando
 */
export function getWuzapiConfig(): WuzapiConfig {
  const baseUrl = process.env.WUZAPI_BASE_URL?.replace(/\/$/, '')
  const adminToken = process.env.WUZAPI_ADMIN_TOKEN

  if (!baseUrl) {
    throw new Error('WUZAPI_BASE_URL is not configured')
  }

  if (!adminToken) {
    throw new Error('WUZAPI_ADMIN_TOKEN is not configured')
  }

  return {
    baseUrl,
    adminToken,
  }
}
