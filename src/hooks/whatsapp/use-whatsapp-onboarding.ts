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

        console.log('[Meta Debug] IDs:', {
            appId: process.env.NEXT_PUBLIC_META_APP_ID,
            configId: process.env.NEXT_PUBLIC_META_CONFIG_ID,
            orgId: activeOrg.id
        });

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

        window.open(
            url,
            'whatsapp_onboarding',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        setStatus('pending');
        setError(null);
        pollingStartTime.current = Date.now();
    };

    // Polling Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

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
            if (intervalId) clearInterval(intervalId);
        };
    }, [status, checkConnection]);

    return {
        status,
        error,
        startOnboarding,
        checkConnection: () => checkConnection(false),
        reset: () => {
            setStatus('idle');
            setError(null);
            pollingStartTime.current = null;
        },
        setError,
        setStatus
    };
}
