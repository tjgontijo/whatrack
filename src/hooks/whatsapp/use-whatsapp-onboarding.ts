import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';
import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion';

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
    const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
      useOrganizationCompletion();
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

        // Note: We use the server-side callback endpoint as our claim processor
        // but we can also have a dedicated claim endpoint if needed.
        // For now, let's point to the active onboarding callback logic.
        const state = trackingCodeRef.current;

        fetch(`/api/v1/whatsapp/onboarding/callback?code=${code}&state=${state}`, {
            method: 'GET',
        })
            .then((response) => {
                if (!response.ok) throw new Error('Falha ao processar callback');
                return response.json();
            })
            .then((result) => {
                console.log('[Onboarding] Processado via API:', result);
                setStatus('success');
                toast.success('WhatsApp conectado com sucesso!');
                pollingStartTime.current = null;
                onSuccess?.();
            })
            .catch((err: Error) => {
                console.error('[Onboarding] Erro no processamento:', err);
                setStatus('idle');
                setError(err.message);
                toast.error(`Erro ao conectar: ${err.message}`);
            })
            .finally(() => {
                claimInProgress.current = false;
            });
    }, [onSuccess]);

    const trackingCodeRef = useRef<string | null>(null);

    // Inicializar Facebook SDK
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!appId) {
            console.error('[FB-SDK] NEXT_PUBLIC_META_APP_ID não configurado');
            return;
        }

        if (window.FB) {
            setSdkReady(true);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: appId,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
            setSdkReady(true);
        };

        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }
    }, []);

    // Listener para eventos (PostMessage do callback)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Eventos do Facebook SDK (WA_EMBEDDED_SIGNUP)
            if (event.origin.includes('facebook.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (data.type === 'WA_EMBEDDED_SIGNUP') {
                        const flowEvent = data.event;
                        const metadata = data.data;

                        if (flowEvent === 'FINISH' || flowEvent?.startsWith('FINISH_')) {
                            const wabaId = metadata?.waba_id || metadata?.wabaId;
                            const phoneNumberId = metadata?.phone_number_id || metadata?.phoneNumberId;
                            pendingWabaData.current = { wabaId, phoneNumberId };
                        } else if (flowEvent === 'CANCEL') {
                            setStatus('idle');
                            toast.error('Conexão cancelada.');
                        }
                    }
                } catch { /* ignore */ }
            }

            // Eventos de sucesso vindos do nosso próprio callback (se o popup redirecionar)
            if (event.origin === window.location.origin && event.data?.type === 'WA_CALLBACK_SUCCESS') {
                console.log('[Onboarding] Sucesso recebido via PostMessage');
                setStatus('success');
                onSuccess?.();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSuccess]);

    const startOnboarding = useCallback(async () => {
        if (isCompletionLoading) return;
        if (isModuleBlocked('whatsapp')) {
            toast.error(integrationBlockMessage);
            return;
        }
        if (!activeOrg?.id) {
            setError('Organização não identificada.');
            return;
        }

        setStatus('pending');
        setError(null);
        pendingWabaData.current = {};
        
        try {
            // Pedir tracking code para o servidor
            const response = await fetch('/api/v1/whatsapp/onboarding', { method: 'GET' });
            const session = await response.json();
            
            if (!response.ok) throw new Error(session.error || 'Erro ao criar sessão');
            
            const { trackingCode, onboardingUrl } = session.data || session;
            trackingCodeRef.current = trackingCode;
            pollingStartTime.current = Date.now();

            const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

            if (sdkReady && window.FB) {
                window.FB.login(
                    (response) => {
                        if (response.authResponse?.code) {
                            const { wabaId, phoneNumberId } = pendingWabaData.current;
                            claimWaba(wabaId, phoneNumberId, response.authResponse.code);
                        } else {
                            setStatus('idle');
                        }
                    },
                    {
                        config_id: configId!,
                        response_type: 'code',
                        override_default_response_type: true,
                        extras: {
                            feature: 'whatsapp_embedded_signup',
                            version: 2,
                            sessionInfoVersion: 3,
                            sessionInfo: { trackingCode }
                        }
                    }
                );
            } else {
                // Fallback Popup
                const appId = process.env.NEXT_PUBLIC_META_APP_ID;
                const extras = {
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                    version: 'v3',
                    sessionInfo: { trackingCode }
                };

                const url = new URL(onboardingUrl);
                url.searchParams.set('extras', JSON.stringify(extras));

                const width = 800;
                const height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                window.open(
                    url.toString(),
                    'whatsapp_onboarding',
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao iniciar');
            setStatus('idle');
        }
    }, [activeOrg?.id, sdkReady, isCompletionLoading, isModuleBlocked, integrationBlockMessage, claimWaba]);

    return {
        status,
        error,
        sdkReady,
        startOnboarding,
        reset: () => {
            setStatus('idle');
            setError(null);
            pendingWabaData.current = {};
            pollingStartTime.current = null;
        },
        setError,
        setStatus
    };
}
