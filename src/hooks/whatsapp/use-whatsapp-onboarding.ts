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
                    extras: Record<string, unknown>;
                }
            ) => void;
        };
        fbAsyncInit: () => void;
    }
}

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 * Usa o Facebook SDK oficial para abrir o popup e capturar os eventos.
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const [status, setStatus] = useState<OnboardingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const pendingWabaData = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

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
        window.fbAsyncInit = function() {
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

    // Listener para eventos WA_EMBEDDED_SIGNUP da Meta
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            // Apenas processar mensagens do Facebook
            if (!event.origin.includes('facebook.com')) return;

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    console.log('[FB-SDK] Evento recebido:', data);

                    const flowEvent = data.event;
                    const metadata = data.data;

                    if (flowEvent === 'FINISH' || flowEvent?.startsWith('FINISH_')) {
                        console.log('[FB-SDK] Flow FINISH:', metadata);

                        // Extrair dados do evento
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
            } catch (e) {
                // Mensagem não é JSON, ignorar
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
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

        if (!sdkReady || !window.FB) {
            setError('Facebook SDK ainda não carregou. Aguarde um momento e tente novamente.');
            return;
        }

        const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

        if (!configId) {
            setError('Configuração da Meta não encontrada (META_CONFIG_ID).');
            return;
        }

        console.log('[FB-SDK] Iniciando FB.login...');
        setStatus('pending');
        setError(null);
        pendingWabaData.current = {};

        // Chamar FB.login com as opções corretas para Embedded Signup
        window.FB.login(
            async (response) => {
                console.log('[FB-SDK] Resposta do FB.login:', response);

                if (response.authResponse?.code) {
                    const code = response.authResponse.code;
                    const { wabaId, phoneNumberId } = pendingWabaData.current;

                    console.log('[FB-SDK] Code obtido:', code.substring(0, 20) + '...');
                    console.log('[FB-SDK] Dados pendentes:', { wabaId, phoneNumberId });

                    if (!wabaId) {
                        console.warn('[FB-SDK] Code recebido mas sem waba_id do evento FINISH');
                        // Continuar mesmo assim, o backend pode buscar os dados
                    }

                    setStatus('checking');

                    try {
                        const claimResponse = await fetch('/api/v1/whatsapp/claim-waba', {
                            method: 'POST',
                            body: JSON.stringify({ wabaId, phoneNumberId, code }),
                            headers: { 'Content-Type': 'application/json' }
                        });

                        const result = await claimResponse.json();

                        if (!claimResponse.ok) {
                            throw new Error(result.error || 'Falha ao vincular WhatsApp');
                        }

                        console.log('[FB-SDK] Claim realizado com sucesso:', result);
                        setStatus('success');
                        toast.success('WhatsApp conectado com sucesso!');
                        onSuccess?.();
                    } catch (err: any) {
                        console.error('[FB-SDK] Erro no claim:', err);
                        setStatus('idle');
                        setError(err.message);
                        toast.error(`Erro ao conectar: ${err.message}`);
                    }
                } else {
                    console.log('[FB-SDK] Login cancelado ou sem code');
                    setStatus('idle');
                    // Não mostrar erro se o usuário apenas fechou o popup
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
    }, [activeOrg?.id, sdkReady, onSuccess]);

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
        },
        setError,
        setStatus
    };
}
