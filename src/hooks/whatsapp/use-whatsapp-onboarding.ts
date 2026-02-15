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
                    extras?: Record<string, unknown>;
                }
            ) => void;
        };
        fbAsyncInit: () => void;
    }
}

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Usa o Embedded Signup via Facebook JS SDK.
 * Eventos são capturados via postMessage (WA_EMBEDDED_SIGNUP da Meta).
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const claimInProgress = useRef(false);
    const authCodeRef = useRef<string | null>(null);
    const onboardingDataRef = useRef<{ wabaId?: string; phoneNumberId?: string } | null>(null);

    // Função para fazer o claim (compartilhada entre os métodos)
    const claimWaba = useCallback((wabaId?: string, phoneNumberId?: string, code?: string) => {
        if (claimInProgress.current) {
            console.log('[Onboarding] Claim já em progresso, ignorando...');
            return;
        }

        if (!wabaId) {
            console.warn('[Onboarding] wabaId não fornecido, ignorando claim');
            return;
        }

        if (!code) {
            console.warn('[Onboarding] code não fornecido, aguardando autorização');
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

    const tryClaim = useCallback(() => {
        const wabaId = onboardingDataRef.current?.wabaId;
        const phoneNumberId = onboardingDataRef.current?.phoneNumberId;
        const code = authCodeRef.current;

        if (!wabaId || !code) return;
        claimWaba(wabaId, phoneNumberId, code);
    }, [claimWaba]);

    // Inicializar Facebook SDK (para capturar eventos postMessage)
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!appId) {
            console.error('[FB-SDK] NEXT_PUBLIC_META_APP_ID não configurado');
            setError('Configuração da Meta ausente. Verifique NEXT_PUBLIC_META_APP_ID.');
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

        const timeout = setTimeout(() => {
            if (!window.FB) {
                console.error('[FB-SDK] Timeout ao carregar SDK');
            }
        }, 8000);

        return () => clearTimeout(timeout);
    }, []);

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
                                onboardingDataRef.current = { wabaId, phoneNumberId };
                                tryClaim();
                            }
                        } else if (flowEvent === 'CANCEL') {
                            console.log('[Meta-Event] Flow cancelado:', metadata);
                            setStatus('idle');
                            authCodeRef.current = null;
                            onboardingDataRef.current = null;

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
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [tryClaim]);

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

        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

        if (!configId) {
            setError('Configuração da Meta não encontrada.');
            return;
        }

        if (!window.FB) {
            setError('SDK da Meta não carregado. Recarregue a página e tente novamente.');
            return;
        }

        setStatus('pending');
        setError(null);
        authCodeRef.current = null;
        onboardingDataRef.current = null;

        const extras = {
            setup: {}
        };

        console.log('[Onboarding] Iniciando Embedded Signup via FB.login');

        window.FB.login((response) => {
            const code = response.authResponse?.code;

            if (!code) {
                setStatus('idle');
                authCodeRef.current = null;
                onboardingDataRef.current = null;
                if (response.status === 'not_authorized' || response.status === 'unknown') {
                    toast.error('Conexão cancelada pelo usuário.');
                } else {
                    toast.error('Meta não retornou o código de autorização.');
                }
                return;
            }

            authCodeRef.current = code;
            tryClaim();
        }, {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras
        });
    }, [activeOrg?.id, tryClaim]);

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
            authCodeRef.current = null;
            onboardingDataRef.current = null;
        },
        setError,
        setStatus
    };
}
