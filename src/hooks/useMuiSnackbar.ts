'use client';

import { useState, useCallback } from 'react';

type SnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

interface SnackbarState {
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
}

export const useMuiSnackbar = () => {
    const [state, setState] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const showMessage = useCallback((message: string, severity: SnackbarSeverity = 'success') => {
        setState({
            open: true,
            message,
            severity,
        });
    }, []);

    const hideMessage = useCallback(() => {
        setState((prev) => ({ ...prev, open: false }));
    }, []);

    return {
        ...state,
        showMessage,
        hideMessage,
    };
};
