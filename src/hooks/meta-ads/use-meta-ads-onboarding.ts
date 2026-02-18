import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export function useMetaAdsOnboarding(organizationId: string | undefined, onSuccess?: () => void) {
    const [isPending, setIsPending] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const clearState = useCallback(() => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        popupRef.current = null;
    }, []);

    const startOnboarding = useCallback(() => {
        if (!organizationId) {
            toast.error('Organização não identificada.');
            return;
        }

        setIsPending(true);
        clearState();

        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const authUrl = `/api/v1/meta-ads/connect?organizationId=${organizationId}`;

        popupRef.current = window.open(
            authUrl,
            'meta_ads_auth',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        if (!popupRef.current) {
            setIsPending(false);
            toast.error('O popup foi bloqueado. Permita popups para este site.');
            return;
        }

        checkIntervalRef.current = setInterval(() => {
            if (popupRef.current && popupRef.current.closed) {
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                    checkIntervalRef.current = null;
                }
                setIsPending(false);
                toast.success('Conexão finalizada!');
                onSuccess?.();
            }
        }, 500);

    }, [organizationId, onSuccess, clearState]);

    return {
        isPending,
        startOnboarding,
    };
}
