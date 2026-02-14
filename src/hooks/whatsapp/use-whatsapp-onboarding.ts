import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

const POLLING_INTERVAL = 3000; // 3 segundos
const MAX_POLLING_DURATION = 180000; // 3 minutos

export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const pollingStartTime = useRef<number | null>(null);
    const popupRef = useRef<Window | null>(null);

    const REDIRECT_URI = 'https://whatrack.com/dashboard/settings/whatsapp/';

    const checkConnection = useCallback(async (isAuto = false) => {
        if (!isAuto) setStatus('checking');
        setError(null);

        try {
            const queryParams = isAuto && pollingStartTime.current
                ? `?after=${pollingStartTime.current}`
                : '';

            const response = await fetch(`/api/v1/whatsapp/check-connection${queryParams}`, {
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

    const startOnboarding = () => {
        if (!activeOrg?.id) {
            setError('Organização não identificada. Faça login novamente.');
            return;
        }

        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
        const apiVersion = process.env.NEXT_PUBLIC_META_API_VERSION || 'v24.0';

        // Fluxo OAuth tradicional via Dialog
        const url = `https://www.facebook.com/${apiVersion}/dialog/oauth` +
            `?client_id=${appId}` +
            `&config_id=${configId}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&display=popup` +
            `&override_default_response_type=true` +
            `&extras=${encodeURIComponent(JSON.stringify({
                setup: { organizationId: activeOrg.id }
            }))}`;

        console.log('[Meta Onboarding] Iniciando fluxo OAuth:', { url });

        const width = 800;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        popupRef.current = window.open(
            url,
            'whatsapp_onboarding',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        setStatus('pending');
        setError(null);
        pollingStartTime.current = Date.now();
    };

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const handleMessage = async (event: MessageEvent) => {
            // Ouvir apenas mensagens do mesmo domínio (vindas do nosso callback page)
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'WA_CALLBACK_STATUS') {
                const { status: callbackStatus, error: callbackError } = event.data;
                console.log('[Onboarding] Callback status:', callbackStatus);

                if (callbackStatus === 'success') {
                    setStatus('success');
                    onSuccess?.();
                } else if (callbackStatus === 'canceled') {
                    setStatus('idle');
                    toast.error('Conexão cancelada pelo usuário.');
                } else if (callbackStatus === 'error') {
                    setStatus('idle');
                    setError(callbackError || 'Erro na conexão com a Meta.');
                }

                pollingStartTime.current = null;
            }
        };

        window.addEventListener('message', handleMessage);

        // Polling de segurança (caso o usuário feche a janela ou o callback falhe)
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

                const connected = await checkConnection(true);
                if (connected) {
                    pollingStartTime.current = null;
                }
            }, POLLING_INTERVAL);
        }

        return () => {
            window.removeEventListener('message', handleMessage);
            if (intervalId) clearInterval(intervalId);
        };
    }, [status, checkConnection, onSuccess]);

    return {
        status,
        error,
        startOnboarding,
        checkConnection: () => checkConnection(false),
        reset: () => {
            setStatus('idle');
            setError(null);
            pollingStartTime.current = null;
            popupRef.current = null;
        },
        setError,
        setStatus
    };
}
