'use client';

import React, { Suspense } from 'react';
import { SuspenseLoader } from '@/components/SuspenseLoader';
import WhatsAppPage from './page';

export const WhatsAppFeature: React.FC = () => {
    return (
        <Suspense fallback={<SuspenseLoader message="Carregando configurações do WhatsApp..." />}>
            <WhatsAppPage />
        </Suspense>
    );
};

export default WhatsAppFeature;
