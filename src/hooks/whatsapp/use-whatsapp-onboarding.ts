import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

const POLLING_INTERVAL = 3000;
const MAX_POLLING_DURATION = 180000;

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
 * Suporta dois métodos em coexistência:
 * 1. Facebook SDK (FB.login) - método principal
 * 2. Popup com redirect - fallback/compatibilidade
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const pendingWabaData = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
    const pollingStartTime = useRef<number | null>(null);
    const claimInProgress = useRef(false);

    // Função para fazer o claim (compartilhada entre os métodos)
    const claimWaba = useCallback((wabaId?: string, phoneNumberId?: string, code?: string) => {
        if (claimInProgress.current) {
            console.log('[Onboarding] Claim já em progresso, ignorando...');
            return;
        }

        claimInProgress.current = true;
        setStatus('checking');

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
                pollingStartTime.current = null;
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

    // Inicializar Facebook SDK
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!appId) {
            console.error('[FB-SDK] NEXT_PUBLIC_META_APP_ID não configurado');
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
    }, []);

    // Listener unificado para eventos (SDK e redirect)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // 1. Eventos do Facebook SDK (WA_EMBEDDED_SIGNUP)
            if (event.origin.includes('facebook.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    if (data.type === 'WA_EMBEDDED_SIGNUP') {
                        console.log('[FB-SDK] Evento recebido:', data);

                        const flowEvent = data.event;
                        const metadata = data.data;

                        if (flowEvent === 'FINISH' || flowEvent?.startsWith('FINISH_')) {
                            console.log('[FB-SDK] Flow FINISH:', metadata);

                            const wabaId = metadata?.waba_id || metadata?.wabaId;
                            const phoneNumberId = metadata?.phone_number_id || metadata?.phoneNumberId;

                            // Guardar para usar junto com o code do FB.login callback
                            pendingWabaData.current = { wabaId, phoneNumberId };
                            console.log('[FB-SDK] Dados do WABA salvos:', pendingWabaData.current);
                        } else if (flowEvent === 'CANCEL') {
                            console.log('[FB-SDK] Flow cancelado:', metadata);
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
                const { status: callbackStatus, code, wabaId, error: callbackError } = event.data;
                console.log('[Redirect] Dados recebidos do popup:', { callbackStatus, hasCode: !!code, wabaId });

                if (callbackStatus === 'success' && (code || wabaId)) {
                    claimWaba(wabaId, undefined, code);
                } else if (callbackStatus === 'error' || callbackError) {
                    setStatus('idle');
                    toast.error('Conexão recusada ou erro na Meta.');
                } else {
                    setStatus('idle');
                    toast.error('Conexão cancelada pelo usuário.');
                }

                pollingStartTime.current = null;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [claimWaba]);

    // Polling de segurança
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (status === 'pending' && pollingStartTime.current) {
            intervalId = setInterval(async () => {
                const now = Date.now();
                const elapsed = now - (pollingStartTime.current || 0);

                if (elapsed > MAX_POLLING_DURATION) {
                    setStatus('idle');
                    pollingStartTime.current = null;
                    setError('O tempo limite de espera foi atingido. Tente verificar manualmente.');
                    return;
                }

                // Verificar conexão silenciosamente
                try {
                    const response = await fetch('/api/v1/whatsapp/check-connection', {
                        method: 'POST',
                    });
                    const data = await response.json();

                    if (response.ok && data.connected) {
                        setStatus('success');
                        pollingStartTime.current = null;
                        toast.success('WhatsApp conectado com sucesso!');
                        onSuccess?.();
                    }
                } catch {
                    // Ignorar erros de polling
                }
            }, POLLING_INTERVAL);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [status, onSuccess]);

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
            setError('Configuração da Meta não encontrada (META_CONFIG_ID).');
            return;
        }

        setStatus('pending');
        setError(null);
        pendingWabaData.current = {};
        pollingStartTime.current = Date.now();

        // Usar FB SDK se disponível
        if (sdkReady && window.FB) {
            console.log('[FB-SDK] Iniciando FB.login...');

            window.FB.login(
                (response) => {
                    console.log('[FB-SDK] Resposta do FB.login:', response);

                    if (response.authResponse?.code) {
                        const code = response.authResponse.code;
                        const { wabaId, phoneNumberId } = pendingWabaData.current;

                        console.log('[FB-SDK] Code obtido:', code.substring(0, 20) + '...');
                        console.log('[FB-SDK] Dados pendentes:', { wabaId, phoneNumberId });

                        claimWaba(wabaId, phoneNumberId, code);
                    } else {
                        console.log('[FB-SDK] Login cancelado ou sem code');
                        setStatus('idle');
                        pollingStartTime.current = null;

                        if (response.status === 'unknown') {
                            toast.error('Conexão não autorizada.');
                        }
                    }
                },
                {
                    config_id: configId,
                    response_type: 'code',
                    override_default_response_type: true,
                    extras: {
                        feature: 'whatsapp_embedded_signup',
                        version: 2,
                        sessionInfoVersion: 3,
                    }
                }
            );
        } else {
            // Fallback: abrir popup com redirect
            console.log('[Popup] FB SDK não disponível, usando método de popup...');

            const appId = process.env.NEXT_PUBLIC_META_APP_ID;
            const redirectUri = `${window.location.origin}/dashboard/settings/whatsapp/`;

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
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

            console.log('[Popup] URL:', url);

            const width = 800;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            window.open(
                url,
                'whatsapp_onboarding',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            );
        }
    }, [activeOrg?.id, sdkReady, claimWaba]);

    return {
        status,
        error,
        sdkReady,
        startOnboarding,
        checkConnection: () => checkConnection(false),
        reset: () => {
            setStatus('idle');
            setError(null);
            pendingWabaData.current = {};
            pollingStartTime.current = null;
            claimInProgress.current = false;
        },
        setError,
        setStatus
    };
}
