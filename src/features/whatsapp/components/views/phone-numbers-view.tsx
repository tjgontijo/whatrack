'use client';

import React from 'react';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppPhoneNumber } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const QualityBadge: React.FC<{ rating: string }> = ({ rating }) => {
    const variants = {
        GREEN: { variant: 'default' as const, label: 'Excelente' },
        YELLOW: { variant: 'secondary' as const, label: 'Atenção' },
        RED: { variant: 'destructive' as const, label: 'Crítico' },
        UNKNOWN: { variant: 'outline' as const, label: 'Desconhecido' },
    };

    const config = variants[rating as keyof typeof variants] || variants.UNKNOWN;
    return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const PhoneNumbersView: React.FC = () => {
    const { data: phoneNumbers } = useSuspenseQuery<WhatsAppPhoneNumber[]>({
        queryKey: ['whatsapp', 'phone-numbers'],
        queryFn: () => whatsappApi.listPhoneNumbers(),
    });

    if (!phoneNumbers || phoneNumbers.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground text-center">
                            Nenhum número encontrado. Configure sua conta no Facebook Business Manager.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {phoneNumbers.map((phone) => (
                <Card key={phone.id}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{phone.display_phone_number}</CardTitle>
                                    <CardDescription>{phone.verified_name}</CardDescription>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {phone.status === 'CONNECTED' ? (
                                    <Badge variant="default" className="gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Conectado
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {phone.status}
                                    </Badge>
                                )}
                                <QualityBadge rating={phone.quality_rating} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Plataforma</dt>
                                <dd className="font-medium">{phone.platform_type === 'CLOUD_API' ? 'Cloud API' : phone.platform_type}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Capacidade</dt>
                                <dd className="font-medium">
                                    {phone.throughput.level === 'STANDARD' && 'Padrão'}
                                    {phone.throughput.level === 'HIGH' && 'Alta'}
                                    {phone.throughput.level === 'VERY_HIGH' && 'Muito Alta'}
                                </dd>
                            </div>
                            {phone.code_verification_status === 'VERIFIED' && (
                                <div className="col-span-2">
                                    <Badge variant="outline" className="gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Código Verificado
                                    </Badge>
                                </div>
                            )}
                        </dl>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
