'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SuspenseLoaderProps {
    message?: string;
}

export const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({ message = 'Carregando...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
                {message}
            </p>
        </div>
    );
};

export default SuspenseLoader;
