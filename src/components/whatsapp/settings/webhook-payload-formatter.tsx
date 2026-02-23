'use client'

import { Badge } from '@/components/ui/badge'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function translateMessageType(type: string) {
    const types: Record<string, string> = {
        'text': 'Texto',
        'image': 'Imagem',
        'audio': 'Áudio',
        'video': 'Vídeo',
        'document': 'Documento',
        'sticker': 'Figurinha',
        'location': 'Localização',
        'contacts': 'Contatos',
        'button': 'Botão',
        'interactive': 'Interativo',
        'template': 'Template'
    }
    return types[type] || type.charAt(0).toUpperCase() + type.slice(1)
}

export function formatPhoneNumber(number: string) {
    if (!number) return 'N/A'
    try {
        const cleanNumber = number.startsWith('+') ? number : `+${number}`
        const phoneNumber = parsePhoneNumberFromString(cleanNumber)
        if (phoneNumber) return phoneNumber.formatInternational()
        return number
    } catch (e) {
        return number
    }
}

export function translateStatus(status: string) {
    const statuses: Record<string, string> = {
        'sent': 'Enviado',
        'delivered': 'Entregue',
        'read': 'Lido',
        'failed': 'Falhou',
        'deleted': 'Deletado',
        'warning': 'Aviso'
    }
    return statuses[status] || status
}

export function translateAccountEvent(event: string) {
    const events: Record<string, string> = {
        'PARTNER_ADDED': 'Parceiro adicionado',
        'PARTNER_REMOVED': 'Parceiro removido',
        'MM_LITE_TERMS_SIGNED': 'Termos do WhatsApp assinados',
        'VERIFIED_ACCOUNT': 'Conta verificada',
        'PHONE_NUMBER_NAME_UPDATE': 'Nome do número atualizado',
        'PHONE_NUMBER_QUALITY_UPDATE': 'Qualidade do número atualizada'
    }
    return events[event] || event
}

export function formatPayloadHumanly(log: any) {
    const payload = log.payload
    const eventType = log.eventType
    const field = payload.entry?.[0]?.changes?.[0]?.field
    const value = payload.entry?.[0]?.changes?.[0]?.value

    try {
        const status = value?.statuses?.[0]
        if (status) {
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Status:</span>
                        <Badge variant="outline" className={`text-[9px] h-3.5 px-1 font-black uppercase ${status.status === 'read' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                            status.status === 'delivered' ? 'text-green-600 bg-green-50 border-green-200' :
                            status.status === 'sent' ? 'text-gray-600 bg-gray-50 border-gray-200' :
                            status.status === 'failed' ? 'text-red-600 bg-red-50 border-red-200' : ''
                            }`}>
                            {translateStatus(status.status)}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Para:</span>
                        <span className="text-xs font-medium text-foreground">{formatPhoneNumber(status.recipient_id)}</span>
                    </div>
                </div>
            )
        }

        const message = value?.messages?.[0]
        const contact = value?.contacts?.[0]
        if (message) {
            const name = contact?.profile?.name
            const from = message.from
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Nome:</span>
                        <span className="text-xs font-semibold text-foreground truncate">
                            {name || 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">De:</span>
                        <span className="text-xs font-medium text-foreground">
                            {formatPhoneNumber(from)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Tipo:</span>
                        <span className="text-xs font-medium text-primary">
                            {translateMessageType(message.type)}
                        </span>
                    </div>
                    {message.text?.body && (
                        <div className="flex items-start gap-1 max-w-md">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0 mt-0.5">Mensagem:</span>
                            <span className="text-xs text-foreground/80 line-clamp-2">
                                {message.text.body}
                            </span>
                        </div>
                    )}
                </div>
            )
        }

        const echo = value?.message_echoes?.[0]
        if (echo) {
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Direção:</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-black uppercase text-blue-600 bg-blue-50 border-blue-200">
                            Enviado
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Para:</span>
                        <span className="text-xs font-medium text-foreground">
                            {formatPhoneNumber(echo.to)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Tipo:</span>
                        <span className="text-xs font-medium text-primary">
                            {translateMessageType(echo.type)}
                        </span>
                    </div>
                    {echo.text?.body && (
                        <div className="flex items-start gap-1 max-w-md">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0 mt-0.5">Mensagem:</span>
                            <span className="text-xs text-foreground/80 line-clamp-2">
                                {echo.text.body}
                            </span>
                        </div>
                    )}
                </div>
            )
        }

        if (eventType === 'account_update' || field === 'account_update') {
            const wabaInfo = value?.waba_info
            const eventName = value?.event
            const isPositive = ['MM_LITE_TERMS_SIGNED', 'PARTNER_ADDED', 'VERIFIED_ACCOUNT'].includes(eventName)
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Evento:</span>
                        <Badge variant="outline" className={`text-[9px] h-3.5 px-1 font-black uppercase ${
                            isPositive ? 'text-green-600 bg-green-50 border-green-200' : 'text-amber-600 bg-amber-50 border-amber-200'
                        }`}>
                            {translateAccountEvent(eventName)}
                        </Badge>
                    </div>
                    {wabaInfo?.waba_id && (
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">WABA ID:</span>
                            <span className="text-xs font-mono text-foreground">{wabaInfo.waba_id}</span>
                        </div>
                    )}
                    {value?.phone_number && (
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Número:</span>
                            <span className="text-xs font-medium text-foreground">{formatPhoneNumber(value.phone_number)}</span>
                        </div>
                    )}
                </div>
            )
        }

        if (eventType === 'message_template_status_update' || field === 'message_template_status_update') {
            const value = payload.entry?.[0]?.changes?.[0]?.value
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Template:</span>
                        <span className="text-xs font-bold">{value?.message_template_name || value?.message_template_id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Status:</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-black uppercase text-primary border-primary/20 bg-primary/5">
                            {value?.event}
                        </Badge>
                    </div>
                </div>
            )
        }

        if (field === 'phone_number_quality_update') {
            const value = payload.entry?.[0]?.changes?.[0]?.value
            return (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Qualidade:</span>
                        <Badge variant="outline" className={`text-[9px] h-3.5 px-1 font-black uppercase ${
                            value?.current_limit === 'TIER_1K' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                            value?.current_limit === 'TIER_10K' ? 'text-green-600 bg-green-50 border-green-200' :
                            value?.current_limit === 'TIER_100K' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
                        }`}>
                            {value?.current_limit || 'N/A'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground w-20 text-left shrink-0">Número:</span>
                        <span className="text-xs font-medium text-foreground">{formatPhoneNumber(value?.display_phone_number)}</span>
                    </div>
                </div>
            )
        }

        const displayField = field || eventType || 'desconhecido'
        return <span className="text-xs italic text-muted-foreground">Evento <code className="bg-muted px-1 rounded">{displayField}</code> recebido</span>
    } catch (e) {
        return <span className="text-xs text-destructive">Erro na formatação dos dados</span>
    }
}
