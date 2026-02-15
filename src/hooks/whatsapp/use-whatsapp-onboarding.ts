import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

const POLLING_INTERVAL = 3000; // 3 segundos
const MAX_POLLING_DURATION = 180000; // 3 minutos
const NONCE_KEY = 'wa_oauth_nonce';

/**
 * Generates a CSRF nonce and stores it in sessionStorage.
 * Returns the nonce for inclusion in the OAuth state parameter.
 */
function generateNonce(): string {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(NONCE_KEY, nonce);
    return nonce;
}

/**
 * Validates and consumes a CSRF nonce from sessionStorage.
 * Returns true if the nonce matches, false otherwise.
 */
function validateNonce(receivedNonce: string): boolean {
    const storedNonce = sessionStorage.getItem(NONCE_KEY);
    sessionStorage.removeItem(NONCE_KEY); // Always consume, even if invalid

    if (!storedNonce || storedNonce !== receivedNonce) {
        console.error('[CSRF] Nonce mismatch:', { received: receivedNonce, stored: storedNonce?.substring(0, 8) + '...' });
        return false;
    }

    return true;
}

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

        // Generate CSRF nonce and build state parameter: {nonce}:{orgId}
        const nonce = generateNonce();
        const stateParam = `${nonce}:${activeOrg.id}`;

        // URL LIMPA E ESTRITA (Baseada no seu exemplo funcional)
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
            `&state=${encodeURIComponent(stateParam)}` + // Mantemos o state para segurança (nonce)
            `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

        console.log('[Meta Onboarding] URL Gerada:', url);

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
            // 1. OUVINTE OFICIAL DA META (facebook.com)
            // Conforme documentação V24: captura finalização, abandono e erros do flow
            if (event.origin.endsWith('facebook.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    if (data.type === 'WA_EMBEDDED_SIGNUP') {
                        console.log('[Meta-SDK] EVENTO OFICIAL RECEBIDO:', data);

                        const flowEvent = data.event;
                        const metadata = data.data;

                        if (flowEvent === 'FINISH' || flowEvent?.startsWith('FINISH_')) {
                            console.log('[Meta-SDK] Flow concluído com sucesso:', metadata);

                            // EXTRAIR DADOS DO EVENTO
                            const wabaId = metadata?.waba_id || metadata?.wabaId;
                            const phoneNumberId = metadata?.phone_number_id || metadata?.phoneNumberId;

                            console.log('[Meta-SDK] Dados extraídos:', { wabaId, phoneNumberId });

                            if (wabaId) {
                                // Chamar backend para salvar configuração
                                // O code virá via redirect ou pode não ser necessário se usamos token de sistema
                                setStatus('checking');

                                try {
                                    const response = await fetch('/api/v1/whatsapp/claim-waba', {
                                        method: 'POST',
                                        body: JSON.stringify({ wabaId, phoneNumberId }),
                                        headers: { 'Content-Type': 'application/json' }
                                    });

                                    const result = await response.json();

                                    if (!response.ok) {
                                        throw new Error(result.error || 'Falha ao vincular WhatsApp');
                                    }

                                    console.log('[Meta-SDK] Claim realizado com sucesso:', result);
                                    setStatus('success');
                                    toast.success('WhatsApp conectado com sucesso!');
                                    onSuccess?.();
                                } catch (err: any) {
                                    console.error('[Meta-SDK] Erro no claim:', err);
                                    setStatus('idle');
                                    setError(err.message);
                                    toast.error(`Erro ao conectar: ${err.message}`);
                                }
                            } else {
                                console.warn('[Meta-SDK] Evento FINISH sem waba_id - aguardando redirect...');
                                // Continuar esperando o redirect com code/waba_id na URL
                            }
                        } else if (flowEvent === 'CANCEL') {
                            setStatus('idle');
                            if (metadata?.current_step) {
                                console.warn('[Meta-SDK] Usuário abandonou na etapa:', metadata.current_step);
                                toast.error('Conexão cancelada. Etapa: ' + metadata.current_step);
                            } else if (metadata?.error_message) {
                                console.error('[Meta-SDK] Erro reportado pela Meta:', metadata);
                                toast.error(`Erro: ${metadata.error_message}`);
                            } else {
                                toast.error('Conexão cancelada.');
                            }
                        }
                    }
                } catch (e) {
                    console.log('[Meta-SDK] Erro ao processar mensagem:', e);
                }
            }

            // 2. OUVINTE DO NOSSO DOMÍNIO (para o redirect_uri)
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'WA_CALLBACK_DATA') {
                const { status: callbackStatus, code, wabaId, stateParam: receivedState, error: callbackError } = event.data;
                console.log('[Onboarding] Dados recebidos do popup:', { callbackStatus, hasCode: !!code });

                // Validate CSRF nonce from state parameter
                if (receivedState) {
                    const [nonce] = receivedState.split(':');
                    if (!validateNonce(nonce)) {
                        setStatus('idle');
                        toast.error('Erro de segurança: sessão inválida. Tente novamente.');
                        console.error('[CSRF] OAuth state nonce validation FAILED');
                        return;
                    }
                    console.log('[CSRF] Nonce validated successfully');
                }

                if (callbackStatus === 'success' && code) {
                    setStatus('checking');
                    try {
                        const response = await fetch('/api/v1/whatsapp/claim-waba', {
                            method: 'POST',
                            body: JSON.stringify({ wabaId, code }),
                            headers: { 'Content-Type': 'application/json' }
                        });

                        if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.error || 'Falha na troca de token');
                        }

                        setStatus('success');
                        toast.success('WhatsApp conectado com sucesso!');
                        onSuccess?.();
                    } catch (err: any) {
                        setStatus('idle');
                        toast.error(`Erro ao vincular: ${err.message}`);
                    }
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
