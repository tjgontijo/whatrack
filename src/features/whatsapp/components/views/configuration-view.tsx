'use client';

import React from 'react';
import { Settings, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppAccountInfo } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ConfigurationView: React.FC = () => {
    const { data: config } = useSuspenseQuery({
        queryKey: ['whatsapp', 'config'],
        queryFn: () => whatsappApi.getConfig(),
    });

    const { data: accountInfo } = useSuspenseQuery<WhatsAppAccountInfo>({
        queryKey: ['whatsapp', 'account'],
        queryFn: () => whatsappApi.getAccountInfo(),
    });

    const getReviewBadge = (status: string) => {
        if (status === 'APPROVED') {
            return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Aprovado</Badge>;
        }
        if (status === 'PENDING') {
            return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Pendente</Badge>;
        }
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>;
    };

    const getVerificationBadge = (status: string) => {
        if (status === 'verified') {
            return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Verificado</Badge>;
        }
        if (status === 'pending') {
            return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Pendente</Badge>;
        }
        return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Não Verificado</Badge>;
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Account Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Status da Conta</CardTitle>
                            <CardDescription>{accountInfo.name}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Status de Revisão</p>
                            {getReviewBadge(accountInfo.account_review_status)}
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Verificação</p>
                            {getVerificationBadge(accountInfo.business_verification_status)}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">ID da Conta (WABA)</span>
                            <span className="font-mono text-xs">{accountInfo.id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fuso Horário</span>
                            <span className="font-medium">{accountInfo.timezone_id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Moeda</span>
                            <span className="font-medium">{accountInfo.currency}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Local Configuration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                            <Database className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div>
                            <CardTitle>Configuração Local</CardTitle>
                            <CardDescription>Dados armazenados no banco de dados</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={config.status === 'connected' ? 'default' : 'secondary'}>
                            {config.status === 'connected' ? 'Conectado' : config.status}
                        </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">WABA ID</span>
                        <span className="font-mono text-xs">{config.wabaId || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phone ID</span>
                        <span className="font-mono text-xs">{config.phoneId || '-'}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Alerts */}
            {accountInfo.account_review_status === 'PENDING' && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Sua conta está aguardando revisão do Facebook. Isso pode levar alguns dias.
                    </AlertDescription>
                </Alert>
            )}

            {accountInfo.account_review_status === 'REJECTED' && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                        Sua conta foi rejeitada. Verifique os motivos no Facebook Business Manager.
                    </AlertDescription>
                </Alert>
            )}

            {accountInfo.business_verification_status !== 'verified' && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Complete a verificação do negócio no Facebook Business Manager.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};
