/**
 * Cache keys for WhatsApp operations
 * Pattern: whatsapp:entity:id
 *
 * Helps with:
 * - Debugging (redis-cli KEYS whatsapp:*)
 * - Cleanup (redis-cli DEL whatsapp:onboarding:*)
 * - No conflicts with other services
 */

export const CACHE_KEYS = {
  whatsapp: {
    onboarding: (trackingCode: string) => `whatsapp:onboarding:${trackingCode}`,
    connection: (organizationId: string, wabaId: string) =>
      `whatsapp:connection:${organizationId}:${wabaId}`,
    token: (configId: string) => `whatsapp:token:${configId}`,
    health: (configId: string) => `whatsapp:health:${configId}`,
    webhook: (logId: string) => `whatsapp:webhook:${logId}`,
  },
};

export const CACHE_TTL = {
  ONBOARDING: 24 * 60 * 60, // 24 horas
  CONNECTION: 7 * 24 * 60 * 60, // 7 dias
  TOKEN: 60 * 60, // 1 hora
  HEALTH: 5 * 60, // 5 minutos
  WEBHOOK: 24 * 60 * 60, // 24 horas
};
