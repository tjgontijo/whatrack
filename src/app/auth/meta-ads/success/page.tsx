'use client';

import { useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function MetaAdsAuthSuccess() {
    useEffect(() => {
        // Small delay to show the success message before closing
        const timer = setTimeout(() => {
            window.close();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
            <div className="mb-6 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Conexão Realizada!</h1>
            <p className="text-muted-foreground mb-8">
                Sua conta Meta foi conectada com sucesso. Esta janela fechará em instantes.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sincronizando dados...</span>
            </div>
            <button
                onClick={() => window.close()}
                className="mt-8 text-sm font-medium hover:underline"
            >
                Fechar agora
            </button>
        </div>
    );
}
