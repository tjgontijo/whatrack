'use client'

import React, { Suspense } from 'react'
import { InstanceDetail } from '@/features/whatsapp/components/instance-detail'
import { SuspenseLoader } from '@/components/SuspenseLoader'

interface PageProps {
    params: Promise<{ phoneId: string }>
}

export default function InstancePage({ params }: PageProps) {
    // No Next.js 15/16, params é uma Promise que deve ser usada com React.use()
    const resolvedParams = React.use(params)

    return (
        <Suspense fallback={<SuspenseLoader />}>
            <InstanceDetail phoneId={resolvedParams.phoneId} />
        </Suspense>
    )
}
