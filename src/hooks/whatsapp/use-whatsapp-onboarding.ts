import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

export type OnboardingStatus = 'idle' | 'pending' | 'checking' | 'success';

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Usa o Hosted Embedded Signup (business.facebook.com/messaging/whatsapp/onboard).
 * Eventos são capturados via postMessage (WA_EMBEDDED_SIGNUP da Meta) e
 * o code é recebido via redirect na janela popup.
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const claimInProgress = useRef(false);
    const authCodeRef = useRef<string | null>(null);
    const onboardingDataRef = useRef<{ wabaId?: string; phoneNumberId?: string } | null>(null);
    const popupRef = useRef<Window | null>(null);
    const stateRef = useRef<string | null>(null);

    const STATE_STORAGE_KEY = 'wa_onboarding_state';

    const REDIRECT_URI = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/settings/whatsapp/`
        : 'https://whatrack.com/dashboard/settings/whatsapp/';

    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
        setSdkReady(Boolean(appId && configId));
    }, []);

    const persistState = useCallback((state: string) => {
        try {
            sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
                state,
                organizationId: activeOrg?.id ?? null,
                createdAt: Date.now()
            }));
        } catch {
            // ignore storage errors
        }
    }, [activeOrg?.id]);

    const loadState = useCallback(() => {
        try {
            const raw = sessionStorage.getItem(STATE_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { state?: string };
            return parsed?.state ?? null;
        } catch {
            return null;
        }
    }, []);

    const clearState = useCallback(() => {
        try {
            sessionStorage.removeItem(STATE_STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

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
                clearState();
            })
            .catch((err: Error) => {
                console.error('[Onboarding] Erro no claim:', err);
                setStatus('idle');
                setError(err.message);
                toast.error(`Erro ao conectar: ${err.message}`);
                clearState();
            })
            .finally(() => {
                claimInProgress.current = false;
            });
    }, [onSuccess, clearState]);

    const tryClaim = useCallback(() => {
        const wabaId = onboardingDataRef.current?.wabaId;
        const phoneNumberId = onboardingDataRef.current?.phoneNumberId;
        const code = authCodeRef.current;

        if (!wabaId || !code) return;
        claimWaba(wabaId, phoneNumberId, code);
    }, [claimWaba]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const wabaId = searchParams.get('waba_id') || searchParams.get('wabaid');
        const phoneNumberId = searchParams.get('phone_number_id') || undefined;
        const state = searchParams.get('state');

        if (state) {
            stateRef.current = state;
        }

        if (window.opener && window.opener !== window && (code || errorParam || wabaId)) {
            window.opener.postMessage({
                type: 'WA_CALLBACK_DATA',
                status: errorParam ? 'error' : 'success',
                code,
                wabaId,
                phoneNumberId,
                state,
                error: errorParam
            }, window.location.origin);

            window.close();
            return;
        }

        if (code) {
            const storedState = loadState();
            if (state && storedState && state !== storedState) {
                setStatus('idle');
                setError('State inválido. Tente novamente.');
                clearState();
                return;
            }
            authCodeRef.current = code;
            if (wabaId) {
                onboardingDataRef.current = { wabaId, phoneNumberId: phoneNumberId || undefined };
            }
            tryClaim();

            const cleanedUrl = new URL(window.location.href);
            cleanedUrl.searchParams.delete('code');
            cleanedUrl.searchParams.delete('waba_id');
            cleanedUrl.searchParams.delete('wabaid');
            cleanedUrl.searchParams.delete('phone_number_id');
            cleanedUrl.searchParams.delete('error');
            cleanedUrl.searchParams.delete('state');
            window.history.replaceState({}, '', cleanedUrl.toString());
        }
    }, [searchParams, tryClaim, loadState, clearState]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin.includes('facebook.com')) {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    if (data.type === 'WA_EMBEDDED_SIGNUP') {
                        console.log('[Meta-Event] Evento recebido:', data);

                        const flowEvent = data.event;
                        const metadata = data.data;

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

            if (event.origin === window.location.origin && event.data?.type === 'WA_CALLBACK_DATA') {
                const { status: callbackStatus, code, wabaId, phoneNumberId, state, error: callbackError } = event.data;
                console.log('[Redirect] Dados recebidos do popup:', { callbackStatus, hasCode: !!code, wabaId, phoneNumberId });

                if (callbackStatus === 'success') {
                    const storedState = loadState();
                    if (state && storedState && state !== storedState) {
                        setStatus('idle');
                        setError('State inválido. Tente novamente.');
                        clearState();
                        return;
                    }
                    if (code) authCodeRef.current = code;
                    if (wabaId) onboardingDataRef.current = { wabaId, phoneNumberId: phoneNumberId || undefined };
                    tryClaim();
                } else if (callbackStatus === 'error' || callbackError) {
                    setStatus('idle');
                    toast.error('Conexão recusada ou erro na Meta.');
                    clearState();
                } else {
                    setStatus('idle');
                    toast.error('Conexão cancelada pelo usuário.');
                    clearState();
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

        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

        if (!appId || !configId) {
            setError('Configuração da Meta não encontrada.');
            return;
        }

        setStatus('pending');
        setError(null);
        authCodeRef.current = null;
        onboardingDataRef.current = null;
        stateRef.current = null;

        const extras = {
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
            version: 'v3'
        };

        const state = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`;
        stateRef.current = state;
        persistState(state);

        const url = `https://business.facebook.com/messaging/whatsapp/onboard/` +
            `?app_id=${appId}` +
            `&config_id=${configId}` +
            `&response_type=code` +
            `&display=popup` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${encodeURIComponent(state)}` +
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

        if (!popupRef.current) {
            setStatus('idle');
            setError('O popup foi bloqueado. Permita popups para este site e tente novamente.');
            clearState();
            return;
        }

        const checkPopupClosed = setInterval(() => {
            if (popupRef.current && popupRef.current.closed) {
                clearInterval(checkPopupClosed);
                console.log('[Onboarding] Popup fechado');
            }
        }, 500);

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
            authCodeRef.current = null;
            onboardingDataRef.current = null;
            stateRef.current = null;
            clearState();
            if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
            }
            popupRef.current = null;
        },
        setError,
        setStatus
    };
}
