// ============================================================================
// CONFIGURAÇÃO DA CONTA
// ============================================================================

export interface WhatsAppConfig {
    id: string;
    organizationId: string;
    wabaId: string | null;
    phoneId: string | null;
    status: 'connected' | 'pending' | 'disconnected';
    createdAt: string;
    updatedAt: string;
}

export interface WhatsAppAccountInfo {
    id: string;
    name: string;
    timezone_id: string;
    message_template_namespace: string;
    account_review_status: 'APPROVED' | 'PENDING' | 'REJECTED';
    business_verification_status: 'verified' | 'unverified' | 'pending';
    currency: string;
    owner_business_info?: {
        id: string;
        name: string;
        verification_status: string;
    };
}

// ============================================================================
// TEMPLATES DE MENSAGEM
// ============================================================================

export interface WhatsAppTemplate {
    id?: string;
    name: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
    language: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    components?: TemplateComponent[];
    rejected_reason?: string;
}

export interface TemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    buttons?: TemplateButton[];
}

export interface TemplateButton {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
}

// ============================================================================
// MENSAGENS
// ============================================================================

export interface SendTemplateResponse {
    success: boolean;
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

export interface WhatsAppMessage {
    id: string;
    from: string;
    timestamp: string;
    type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contacts' | 'template';
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    video?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    document?: {
        id: string;
        filename: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    audio?: {
        id: string;
        mime_type: string;
        sha256: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    contacts?: Contact[];
    context?: {
        from: string;
        id: string;
    };
}

export interface Contact {
    name: {
        formatted_name: string;
        first_name?: string;
        last_name?: string;
    };
    phones?: Array<{
        phone: string;
        type?: string;
    }>;
    emails?: Array<{
        email: string;
        type?: string;
    }>;
}

// ============================================================================
// NÚMEROS DE TELEFONE
// ============================================================================

export interface WhatsAppPhoneNumber {
    id: string;
    verified_name: string;
    display_phone_number: string;
    quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    code_verification_status: 'VERIFIED' | 'NOT_VERIFIED';
    platform_type: 'CLOUD_API' | 'NOT_APPLICABLE';
    throughput: {
        level: 'STANDARD' | 'HIGH' | 'VERY_HIGH';
    };
    webhook_configuration?: {
        application: string;
        whatsapp_business_account: string;
    };
    name_status: 'APPROVED' | 'AVAILABLE_WITHOUT_REVIEW' | 'DECLINED' | 'EXPIRED' | 'PENDING_REVIEW' | 'NONE';
    new_name_status: 'APPROVED' | 'AVAILABLE_WITHOUT_REVIEW' | 'DECLINED' | 'EXPIRED' | 'PENDING_REVIEW' | 'NONE';
    status: 'CONNECTED' | 'DISCONNECTED' | 'FLAGGED' | 'MIGRATED' | 'PENDING' | 'RESTRICTED';
    certificate?: string;
    account_mode?: 'SANDBOX' | 'LIVE';
}

// ============================================================================
// PERFIL COMERCIAL
// ============================================================================

export interface WhatsAppBusinessProfile {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    messaging_product: 'whatsapp';
    profile_picture_url?: string;
    websites?: string[];
    vertical?:
    | 'AUTOMOTIVE'
    | 'BEAUTY'
    | 'APPAREL'
    | 'EDU'
    | 'ENTERTAIN'
    | 'EVENT_PLAN'
    | 'FINANCE'
    | 'GROCERY'
    | 'GOVT'
    | 'HOTEL'
    | 'HEALTH'
    | 'NONPROFIT'
    | 'PROF_SERVICES'
    | 'RETAIL'
    | 'TRAVEL'
    | 'RESTAURANT'
    | 'NOT_A_BIZ';
}

// ============================================================================
// WEBHOOKS E NOTIFICAÇÕES
// ============================================================================

export interface WebhookNotification {
    object: 'whatsapp_business_account';
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: 'whatsapp';
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: WhatsAppMessage[];
                statuses?: Array<{
                    id: string;
                    status: 'sent' | 'delivered' | 'read' | 'failed';
                    timestamp: string;
                    recipient_id: string;
                    errors?: Array<{
                        code: number;
                        title: string;
                        message: string;
                        error_data?: {
                            details: string;
                        };
                    }>;
                }>;
            };
            field: 'messages';
        }>;
    }>;
}

// ============================================================================
// ERROS E RESPOSTAS DA API
// ============================================================================

export interface WhatsAppError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id: string;
    };
}
