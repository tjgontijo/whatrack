import { useState, useEffect, useCallback, useRef } from 'react';
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

    const checkConnection = useCallback(async (isAuto = false) => {
        if (!isAuto) setStatus('checking');
        setError(null);

        try {
            // Se for auto polling, passar o timestamp de início para filtrar configs antigas
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

        const extras = {
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
            version: 'v3',
            setup: {
                organizationId: activeOrg.id,
            },
        };

        const url =
            `https://business.facebook.com/messaging/whatsapp/onboard/` +
            `?app_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
            `&config_id=${process.env.NEXT_PUBLIC_META_CONFIG_ID}` +
            `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

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

    // Polling e Message Listener Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const handleMessage = async (event: MessageEvent) => {
            const allowedOrigins = [
                'https://business.facebook.com',
                'https://www.facebook.com',
                'https://web.facebook.com'
            ];

            if (!allowedOrigins.includes(event.origin)) return;

            console.log('[Meta Debug] Evento bruto recebido:', event.data);

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                // 1. Procurar em múltiplas estruturas possíveis
                const payload = data.type === 'facebookSharedObject' ? data.payload : (data.data || data);

                // 2. Extrair WABA ID (vários nomes possíveis)
                let wabaId = payload?.waba_id || payload?.wabaId || payload?.waba_business_account_id;

                // 3. Extrair CODE (vários nomes possíveis)
                let code = payload?.code || payload?.authorization_code || payload?.auth_code;

                // 4. Fallback especial para v3 (session_info)
                if (!wabaId && payload?.session_info) {
                    const sessionInfo = Array.isArray(payload.session_info) ? payload.session_info[0] : payload.session_info;
                    wabaId = sessionInfo?.waba_id;
                }

                console.log('[Meta Debug] Dados processados:', { wabaId, code: code ? 'OK' : 'MISSING' });

                if (wabaId) {
                    // Fechar o popup imediatamente se encontrarmos o WABA ID
                    if (popupRef.current) {
                        console.log('[Onboarding] Fechando janela...');
                        popupRef.current.close();
                        popupRef.current = null;
                    }

                    // Se não temos o code ainda mas temos o WABA ID, podemos estar em um flow antigo
                    // mas para v3 com inbox, o CODE é obrigatório para o webhook funcionar.

                    await fetch('/api/v1/whatsapp/claim-waba', {
                        method: 'POST',
                        body: JSON.stringify({ wabaId, code }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    setStatus('success');
                    onSuccess?.();
                } else if (data.event === 'FINISH' || data.type === 'WA_EMBEDDED_SIGNUP_FINISH') {
                    // Se recebemos um evento de finalização mas sem dados, fechar assim mesmo
                    if (popupRef.current) {
                        popupRef.current.close();
                        popupRef.current = null;
                    }
                }
            } catch (e) {
                console.error('[Onboarding] Erro ao tratar mensagem da Meta:', e);
            }
        };

        window.addEventListener('message', handleMessage);

        if (status === 'pending' && pollingStartTime.current) {
            intervalId = setInterval(async () => {
                const now = Date.now();
                const elapsed = now - (pollingStartTime.current || 0);

                if (elapsed > MAX_POLLING_DURATION) {
                    console.log('[Onboarding] Polling timeout reached');
                    setStatus('idle');
                    pollingStartTime.current = null;
                    setError('O tempo limite de espera foi atingido. Se você concluiu o processo, tente verificar manualmente.');
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
