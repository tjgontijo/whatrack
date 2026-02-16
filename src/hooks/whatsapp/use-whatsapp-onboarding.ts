import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Usa o Hosted Embedded Signup (business.facebook.com/messaging/whatsapp/onboard).
 * O fluxo é webhook-based com tracking code:
 * 1. Frontend chama GET /api/v1/whatsapp/onboarding para gerar tracking code
 * 2. Abre popup com URL que inclui tracking code nos extras
 * 3. Webhook recebe PARTNER_ADDED com tracking code
 * 4. Frontend faz polling automático para detectar quando webhook completou
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
        setSdkReady(Boolean(appId && configId));
    }, []);

    const clearState = useCallback(() => {
        // Limpar polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        // Fechar popup se ainda estiver aberto
        if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
        }
        popupRef.current = null;
    }, []);

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
                if (!isAuto) {
                    setStatus('success');
                    onSuccess?.();
                }
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
        clearState(); // Limpar qualquer polling anterior

        try {
            // 1️⃣ Chamar endpoint para gerar tracking code
            console.log('[Onboarding] Gerando tracking code...');
            const response = await fetch(`/api/v1/whatsapp/onboarding?organizationId=${activeOrg.id}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Falha ao gerar URL de onboarding');
            }

            const { onboardingUrl, trackingCode } = await response.json();

            console.log('[Onboarding] Tracking code gerado:', trackingCode);

            // 2️⃣ Preparar URL com sessionInfo
            const extras = {
                featureType: 'whatsapp_business_app_onboarding',
                sessionInfoVersion: '3',
                version: 'v3',
                sessionInfo: {
                    trackingCode,
                },
            };

            const url = `${onboardingUrl}` +
                `&state=${encodeURIComponent(trackingCode)}` +
                `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

            console.log('[Onboarding] Abrindo popup...');

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

            console.log('[Onboarding] Iniciando polling automático...');

            // 3️⃣ Iniciar polling automático
            pollingIntervalRef.current = setInterval(async () => {
                // Se popup foi fechado, parar polling
                if (popupRef.current && popupRef.current.closed) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    console.log('[Onboarding] Popup fechado pelo usuário');
                    setStatus('idle');
                    setError('Conexão cancelada. Popup foi fechado antes de completar.');
                    return;
                }

                // Verificar se webhook completou (silent check)
                try {
                    const isConnected = await checkConnection(true);
                    if (isConnected) {
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        if (pollingTimeoutRef.current) {
                            clearTimeout(pollingTimeoutRef.current);
                            pollingTimeoutRef.current = null;
                        }
                        // Fechar popup
                        if (popupRef.current && !popupRef.current.closed) {
                            popupRef.current.close();
                        }
                        console.log('[Onboarding] Conexão detectada via polling!');
                        setStatus('success');
                        toast.success('WhatsApp conectado com sucesso!');
                        onSuccess?.();
                    }
                } catch (err) {
                    console.warn('[Onboarding] Erro no polling:', err);
                }
            }, 3000); // A cada 3 segundos

            // Timeout: parar polling após 5 minutos
            pollingTimeoutRef.current = setTimeout(() => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                if (status === 'pending') {
                    setStatus('idle');
                    setError('Tempo limite excedido. Tente novamente.');
                    console.log('[Onboarding] Polling timeout - 5 minutos');
                }
            }, 5 * 60 * 1000);
        } catch (error) {
            console.error('[Onboarding] Erro ao iniciar:', error);
            setStatus('idle');
            setError(error instanceof Error ? error.message : 'Erro ao iniciar onboarding');
            clearState();
        }
    }, [activeOrg?.id, onSuccess, checkConnection, clearState, status]);

    return {
        status,
        error,
        sdkReady,
        startOnboarding,
        checkConnection: () => checkConnection(false),
        reset: () => {
            setStatus('idle');
            setError(null);
            clearState();
        },
        setError,
        setStatus
    };
}
