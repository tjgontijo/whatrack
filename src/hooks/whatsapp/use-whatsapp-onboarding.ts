import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

declare global {
    interface Window {
        FB: {
            init: (params: {
                appId: string;
                cookie?: boolean;
                xfbml?: boolean;
                version: string;
            }) => void;
            login: (
                callback: (response: {
                    authResponse?: {
                        code?: string;
                        accessToken?: string;
                        userID?: string;
                        expiresIn?: number;
                    };
                    status?: string;
                }) => void,
                options: {
                    config_id: string;
                    response_type: string;
                    override_default_response_type: boolean;
                    extras: Record<string, unknown>;
                }
            ) => void;
        };
        fbAsyncInit: () => void;
    }
}

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Usa a URL oficial business.facebook.com/messaging/whatsapp/onboard que permite:
 * - Selecionar números existentes do WhatsApp Business
 * - Criar novos números
 * - Conectar WABAs existentes
 *
 * Eventos são capturados via postMessage (WA_EMBEDDED_SIGNUP da Meta ou WA_CALLBACK_DATA do redirect).
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const claimInProgress = useRef(false);
    const popupRef = useRef<Window | null>(null);

    const REDIRECT_URI = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/settings/whatsapp/`
        : 'https://whatrack.com/dashboard/settings/whatsapp/';

    // Função para fazer o claim (compartilhada entre os métodos)
    const claimWaba = useCallback((wabaId?: string, phoneNumberId?: string, code?: string) => {
        if (claimInProgress.current) {
            console.log('[Onboarding] Claim já em progresso, ignorando...');
            return;
        }

        if (!wabaId && !code) {
            console.warn('[Onboarding] Nem wabaId nem code fornecidos, ignorando claim');
            return;
        }

        claimInProgress.current = true;
        setStatus('checking');

        console.log('[Onboarding] Iniciando claim:', { wabaId, phoneNumberId, hasCode: !!code });

        fetch('/api/v1/whatsapp/claim-waba', {
            method: 'POST',
            body: JSON.stringify({ wabaId, phoneNumberId, code }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
            .then(({ ok, result }) => {
                if (!ok) {
                    throw new Error(result.error || 'Falha ao vincular WhatsApp');
                }

                console.log('[Onboarding] Claim realizado com sucesso:', result);
                setStatus('success');
                toast.success('WhatsApp conectado com sucesso!');
                onSuccess?.();
            })
            .catch((err: Error) => {
                console.error('[Onboarding] Erro no claim:', err);
                setStatus('idle');
                setError(err.message);
                toast.error(`Erro ao conectar: ${err.message}`);
            })
            .finally(() => {
                claimInProgress.current = false;
            });
    }, [onSuccess]);

    // Inicializar Facebook SDK (para capturar eventos postMessage)
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!appId) {
            console.error('[FB-SDK] NEXT_PUBLIC_META_APP_ID não configurado');
            // Mesmo sem SDK, podemos usar o método de popup
            setSdkReady(true);
            return;
        }

        // Se o SDK já foi carregado
        if (window.FB) {
            console.log('[FB-SDK] SDK já carregado');
            setSdkReady(true);
            return;
        }

        // Callback quando o SDK carregar
        window.fbAsyncInit = function () {
            console.log('[FB-SDK] Inicializando...');
            window.FB.init({
                appId: appId,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
            console.log('[FB-SDK] Inicializado com sucesso');
            setSdkReady(true);
        };

        // Carregar o script se não existir
        if (!document.getElementById('facebook-jssdk')) {
            console.log('[FB-SDK] Carregando script...');
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }

        // Fallback: marcar como pronto após timeout (para não bloquear)
        const timeout = setTimeout(() => {
            if (!sdkReady) {
                console.log('[FB-SDK] Timeout - marcando como pronto sem SDK');
                setSdkReady(true);
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [sdkReady]);

    // Listener unificado para eventos (Meta postMessage e redirect callback)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // 1. Eventos do Facebook/Meta (WA_EMBEDDED_SIGNUP)
            if (event.origin.includes('facebook.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    if (data.type === 'WA_EMBEDDED_SIGNUP') {
                        console.log('[Meta-Event] Evento recebido:', data);

                        const flowEvent = data.event;
                        const metadata = data.data;

                        // FINISH = flow completo com número
                        // FINISH_ONLY_WABA = apenas WABA criado, sem número ainda
                        if (flowEvent === 'FINISH' || flowEvent === 'FINISH_ONLY_WABA' || flowEvent?.startsWith('FINISH')) {
                            console.log('[Meta-Event] Flow FINISH:', metadata);

                            const wabaId = metadata?.waba_id || metadata?.wabaId;
                            const phoneNumberId = metadata?.phone_number_id || metadata?.phoneNumberId;

                            console.log('[Meta-Event] Dados extraídos:', { wabaId, phoneNumberId });

                            if (wabaId) {
                                // Fechar popup se ainda estiver aberto
                                if (popupRef.current && !popupRef.current.closed) {
                                    popupRef.current.close();
                                }
                                claimWaba(wabaId, phoneNumberId);
                            }
                        } else if (flowEvent === 'CANCEL') {
                            console.log('[Meta-Event] Flow cancelado:', metadata);
                            setStatus('idle');

                            if (metadata?.error_message) {
                                toast.error(`Erro: ${metadata.error_message}`);
                            } else if (metadata?.current_step) {
                                toast.error(`Conexão cancelada na etapa: ${metadata.current_step}`);
                            } else {
                                toast.error('Conexão cancelada.');
                            }
                        }
                    }
                } catch {
                    // Mensagem não é JSON, ignorar
                }
            }

            // 2. Eventos do nosso domínio (popup com redirect)
            if (event.origin === window.location.origin && event.data?.type === 'WA_CALLBACK_DATA') {
                const { status: callbackStatus, code, wabaId, phoneNumberId, error: callbackError } = event.data;
                console.log('[Redirect] Dados recebidos do popup:', { callbackStatus, hasCode: !!code, wabaId, phoneNumberId });

                if (callbackStatus === 'success' && (code || wabaId)) {
                    claimWaba(wabaId, phoneNumberId, code);
                } else if (callbackStatus === 'error' || callbackError) {
                    setStatus('idle');
                    toast.error('Conexão recusada ou erro na Meta.');
                } else {
                    setStatus('idle');
                    toast.error('Conexão cancelada pelo usuário.');
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [claimWaba]);

    const checkConnection = useCallback(async (isAuto = false) => {
        if (!isAuto) setStatus('checking');
        setError(null);

        try {
            const response = await fetch('/api/v1/whatsapp/check-connection', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                if (!isAuto) throw new Error(data.error || 'Falha ao verificar conexão');
                return false;
            }

            if (data.connected) {
                setStatus('success');
                onSuccess?.();
                return true;
            } else {
                if (!isAuto) {
                    setError('Conexão ainda não detectada. Complete o processo na Meta e tente novamente.');
                    setStatus('pending');
                }
                return false;
            }
        } catch (err) {
            if (!isAuto) {
                setError(err instanceof Error ? err.message : 'Erro ao verificar conexão');
                setStatus('pending');
            }
            return false;
        }
    }, [onSuccess]);

    const startOnboarding = useCallback(() => {
        if (!activeOrg?.id) {
            setError('Organização não identificada. Faça login novamente.');
            return;
        }

        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

        if (!appId || !configId) {
            setError('Configuração da Meta não encontrada.');
            return;
        }

        setStatus('pending');
        setError(null);

        // URL oficial que permite selecionar números existentes OU criar novos
        // Esta é a URL que funciona para o fluxo completo do Embedded Signup v3
        const extras = {
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
            version: 'v3'
        };

        const url = `https://business.facebook.com/messaging/whatsapp/onboard/` +
            `?app_id=${appId}` +
            `&config_id=${configId}` +
            `&response_type=code` +
            `&display=popup` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

        console.log('[Onboarding] Abrindo popup com URL:', url);

        const width = 800;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        popupRef.current = window.open(
            url,
            'whatsapp_onboarding',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        // Verificar se o popup foi bloqueado
        if (!popupRef.current) {
            setStatus('idle');
            setError('O popup foi bloqueado. Permita popups para este site e tente novamente.');
            return;
        }

        // Monitorar fechamento do popup
        const checkPopupClosed = setInterval(() => {
            if (popupRef.current && popupRef.current.closed) {
                clearInterval(checkPopupClosed);
                console.log('[Onboarding] Popup fechado');
            }
        }, 500);

        // Limpar o intervalo após 5 minutos
        setTimeout(() => clearInterval(checkPopupClosed), 300000);

    }, [activeOrg?.id, REDIRECT_URI]);

    return {
        status,
        error,
        sdkReady,
        startOnboarding,
        checkConnection: () => checkConnection(false),
        reset: () => {
            setStatus('idle');
            setError(null);
            claimInProgress.current = false;
            if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
            }
            popupRef.current = null;
        },
        setError,
        setStatus
    };
}
