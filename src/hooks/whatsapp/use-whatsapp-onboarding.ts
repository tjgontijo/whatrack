import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'success';

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Fluxo:
 * 1. Frontend chama GET /api/v1/whatsapp/onboarding para gerar tracking code
 * 2. Abre popup com URL do OAuth da Meta
 * 3. Usuário completa o processo na Meta
 * 4. Meta redireciona para /callback que processa e redireciona para success
 * 5. Popup fecha, frontend detecta e chama onSuccess
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
        setSdkReady(Boolean(appId && configId));
    }, []);

    const clearState = useCallback(() => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
        }
        popupRef.current = null;
    }, []);

    const startOnboarding = useCallback(async () => {
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
        clearState();

        try {
            // 1. Gerar tracking code
            console.log('[Onboarding] Gerando tracking code...');
            const response = await fetch(`/api/v1/whatsapp/onboarding?organizationId=${activeOrg.id}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao gerar URL de onboarding');
            }

            const { onboardingUrl, trackingCode } = await response.json();
            console.log('[Onboarding] Tracking code gerado:', trackingCode);

            // 2. Preparar URL
            const extras = {
                featureType: 'whatsapp_business_app_onboarding',
                sessionInfoVersion: '3',
                version: 'v3',
                sessionInfo: { trackingCode },
            };

            const url = `${onboardingUrl}&state=${encodeURIComponent(trackingCode)}&extras=${encodeURIComponent(JSON.stringify(extras))}`;

            // 3. Abrir popup
            const width = 800;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            popupRef.current = window.open(
                url,
                'whatsapp_onboarding',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            );

            if (!popupRef.current) {
                setStatus('idle');
                setError('O popup foi bloqueado. Permita popups para este site e tente novamente.');
                return;
            }

            console.log('[Onboarding] Popup aberto, aguardando conclusão...');

            // 4. Monitorar fechamento do popup
            checkIntervalRef.current = setInterval(() => {
                if (popupRef.current && popupRef.current.closed) {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    console.log('[Onboarding] Popup fechado');
                    setStatus('success');
                    toast.success('Processo concluído! Atualizando...');
                    onSuccess?.();
                }
            }, 500);

        } catch (err) {
            console.error('[Onboarding] Erro ao iniciar:', err);
            setStatus('idle');
            setError(err instanceof Error ? err.message : 'Erro ao iniciar onboarding');
            clearState();
        }
    }, [activeOrg?.id, onSuccess, clearState]);

    return {
        status,
        error,
        sdkReady,
        startOnboarding,
        reset: () => {
            setStatus('idle');
            setError(null);
            clearState();
        },
        setError,
        setStatus
    };
}
