'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Página de Callback do WhatsApp Embedded Signup
 * A Meta redireciona para cá com code=... e outros parâmetros
 */
export default function WhatsAppCallbackPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processando conexão com a Meta...');

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const wabaId = searchParams.get('waba_id') || searchParams.get('state'); // Alguns fluxos antigos usam state para WABA ID

            if (!code) {
                setStatus('error');
                setMessage('Código de autorização não encontrado na resposta da Meta.');
                return;
            }

            try {
                const response = await fetch('/api/v1/whatsapp/claim-waba', {
                    method: 'POST',
                    body: JSON.stringify({ wabaId, code }),
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Falha ao vincular conta WhatsApp');
                }

                setStatus('success');
                setMessage('WhatsApp conectado com sucesso! Esta janela fechará em instantes.');

                // Notificar a janela pai se ela ainda estiver aberta
                if (window.opener) {
                    window.opener.postMessage({ type: 'WA_CALLBACK_SUCCESS', wabaId }, window.location.origin);
                }

                // Auto-fechar após 3 segundos
                setTimeout(() => {
                    window.close();
                }, 3000);

            } catch (err: any) {
                console.error('[WhatsAppCallback] Error:', err);
                setStatus('error');
                setMessage(err.message || 'Ocorreu um erro ao processar sua conexão.');
            }
        };

        processCallback();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Conexão WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-6 py-8">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            <p className="text-slate-600 font-medium">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <p className="text-slate-800 font-semibold text-center">{message}</p>
                            <button
                                onClick={() => window.close()}
                                className="text-sm text-slate-500 hover:text-slate-700 underline"
                            >
                                Fechar agora
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <p className="text-red-800 font-semibold text-center">{message}</p>
                            <button
                                onClick={() => window.close()}
                                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                            >
                                Fechar Janela
                            </button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
