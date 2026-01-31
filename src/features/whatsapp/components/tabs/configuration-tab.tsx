'use client';

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Stack,
    Alert,
    Chip,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Settings, CheckCircle2, XCircle, AlertCircle, Database } from 'lucide-react';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppAccountInfo } from '../../types';

const StatusChip: React.FC<{ status: string; type: 'review' | 'verification' }> = ({ status, type }) => {
    const configs = {
        review: {
            APPROVED: { color: 'success' as const, icon: <CheckCircle2 size={16} />, label: 'Aprovado' },
            PENDING: { color: 'warning' as const, icon: <AlertCircle size={16} />, label: 'Pendente' },
            REJECTED: { color: 'error' as const, icon: <XCircle size={16} />, label: 'Rejeitado' },
        },
        verification: {
            verified: { color: 'success' as const, icon: <CheckCircle2 size={16} />, label: 'Verificado' },
            unverified: { color: 'default' as const, icon: <AlertCircle size={16} />, label: 'Não Verificado' },
            pending: { color: 'warning' as const, icon: <AlertCircle size={16} />, label: 'Pendente' },
        },
    };

    const config = type === 'review'
        ? configs.review[status as keyof typeof configs.review]
        : configs.verification[status as keyof typeof configs.verification];

    if (!config) return null;

    return (
        <Chip
            icon={config.icon}
            label={config.label}
            color={config.color}
            size="small"
        />
    );
};

export const ConfigurationTab: React.FC = () => {
    const { data: config } = useSuspenseQuery({
        queryKey: ['whatsapp', 'config'],
        queryFn: () => whatsappApi.getConfig(),
    });

    const { data: accountInfo } = useSuspenseQuery<WhatsAppAccountInfo>({
        queryKey: ['whatsapp', 'account'],
        queryFn: () => whatsappApi.getAccountInfo(),
    });

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Stack spacing={3}>
                {/* Account Status */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                    }}
                >
                    <Stack spacing={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Settings size={24} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    Status da Conta
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {accountInfo.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%' }}>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Status de Revisão
                                        </Typography>
                                        <StatusChip status={accountInfo.account_review_status} type="review" />
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%' }}>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Verificação do Negócio
                                        </Typography>
                                        <StatusChip status={accountInfo.business_verification_status} type="verification" />
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    ID da Conta (WABA)
                                </Typography>
                                <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                                    {accountInfo.id}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Fuso Horário
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {accountInfo.timezone_id}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Moeda
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {accountInfo.currency}
                                </Typography>
                            </Box>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Local Configuration */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                    }}
                >
                    <Stack spacing={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: 'secondary.main',
                                    color: 'secondary.contrastText',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Database size={24} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    Configuração Local
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Dados armazenados no banco de dados
                                </Typography>
                            </Box>
                        </Box>

                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Status da Conexão
                                </Typography>
                                <Chip
                                    size="small"
                                    label={config.status === 'connected' ? 'Conectado' : config.status}
                                    color={config.status === 'connected' ? 'success' : 'default'}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    WABA ID
                                </Typography>
                                <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                                    {config.wabaId || '-'}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Phone ID
                                </Typography>
                                <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                                    {config.phoneId || '-'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Alerts */}
                {accountInfo.account_review_status === 'PENDING' && (
                    <Alert severity="warning">
                        Sua conta está aguardando revisão do Facebook. Isso pode levar alguns dias.
                    </Alert>
                )}

                {accountInfo.account_review_status === 'REJECTED' && (
                    <Alert severity="error">
                        Sua conta foi rejeitada na revisão. Verifique os motivos no Facebook Business Manager.
                    </Alert>
                )}

                {accountInfo.business_verification_status !== 'verified' && (
                    <Alert severity="info">
                        Complete a verificação do negócio no Facebook Business Manager para desbloquear recursos adicionais.
                    </Alert>
                )}
            </Stack>
        </Box>
    );
};
