'use client';

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Stack,
    Chip,
    Alert,
    CircularProgress,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Phone, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppPhoneNumber } from '../../types';

const QualityBadge: React.FC<{ rating: string }> = ({ rating }) => {
    const config = {
        GREEN: { color: 'success' as const, label: 'Excelente' },
        YELLOW: { color: 'warning' as const, label: 'Atenção' },
        RED: { color: 'error' as const, label: 'Crítico' },
        UNKNOWN: { color: 'default' as const, label: 'Desconhecido' },
    };

    const { color, label } = config[rating as keyof typeof config] || config.UNKNOWN;

    return <Chip size="small" color={color} label={label} />;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const isConnected = status === 'CONNECTED';
    return (
        <Chip
            size="small"
            icon={isConnected ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            label={isConnected ? 'Conectado' : status}
            color={isConnected ? 'success' : 'default'}
        />
    );
};

export const PhoneNumbersTab: React.FC = () => {
    const { data: phoneNumbers } = useSuspenseQuery<WhatsAppPhoneNumber[]>({
        queryKey: ['whatsapp', 'phone-numbers'],
        queryFn: () => whatsappApi.listPhoneNumbers(),
    });

    if (!phoneNumbers || phoneNumbers.length === 0) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Alert severity="info">
                    Nenhum número de telefone encontrado. Configure sua conta WhatsApp Business no Facebook Business Manager.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        Números Cadastrados
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {phoneNumbers.length} número{phoneNumbers.length !== 1 ? 's' : ''} vinculado{phoneNumbers.length !== 1 ? 's' : ''} à sua conta
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {phoneNumbers.map((phone) => (
                        <Grid item xs={12} md={6} key={phone.id}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 3,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        boxShadow: 1,
                                    },
                                }}
                            >
                                <CardContent>
                                    <Stack spacing={2}>
                                        {/* Header */}
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
                                                <Phone size={24} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" fontWeight={600}>
                                                    {phone.display_phone_number}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {phone.verified_name}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Status Badges */}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <StatusBadge status={phone.status} />
                                            <QualityBadge rating={phone.quality_rating} />
                                            {phone.code_verification_status === 'VERIFIED' && (
                                                <Chip
                                                    size="small"
                                                    icon={<CheckCircle2 size={16} />}
                                                    label="Verificado"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>

                                        {/* Details */}
                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Plataforma
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {phone.platform_type === 'CLOUD_API' ? 'Cloud API' : phone.platform_type}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Capacidade
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <TrendingUp size={14} />
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {phone.throughput.level === 'STANDARD' && 'Padrão'}
                                                        {phone.throughput.level === 'HIGH' && 'Alta'}
                                                        {phone.throughput.level === 'VERY_HIGH' && 'Muito Alta'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {phone.account_mode && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Modo
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={phone.account_mode === 'SANDBOX' ? 'Sandbox' : 'Produção'}
                                                        color={phone.account_mode === 'LIVE' ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            )}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Stack>
        </Box>
    );
};
