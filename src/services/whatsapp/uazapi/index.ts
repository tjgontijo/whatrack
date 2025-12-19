/**
 * UAZAPI - Serviços de integração com WhatsApp
 * 
 * Este módulo centraliza todos os serviços relacionados à API não oficial do WhatsApp
 * através da plataforma UAZAPI.
 */

// Configuração
export { getUazapiConfig } from './config'
export type { UazapiConfig } from './config'

// Gerenciamento de instâncias
export { createWhatsappInstance } from './create-instance'
export type { CreateWhatsappInstanceParams } from './create-instance'

export { listWhatsappInstances } from './list-instances'

// Operações de mensagens
export { sendWhatsappMessage } from './send-whatsapp-message'

// Validações
export { isWhatsAppNumberValid } from './check'
