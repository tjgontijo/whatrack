'use client';

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Stack,
    Alert,
    Grid,
    Avatar,
    Chip,
} from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Building2, Mail, Globe, MapPin, FileText } from 'lucide-react';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppBusinessProfile } from '../../types';

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | string[] }> = ({
    icon,
    label,
    value,
}) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    return (
        <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
            <Box sx={{ color: 'text.secondary', mt: 0.5 }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {label}
                </Typography>
                {Array.isArray(value) ? (
                    <Stack spacing={0.5}>
                        {value.map((item, idx) => (
                            <Typography key={idx} variant="body1" fontWeight={500}>
                                {item}
                            </Typography>
                        ))}
                    </Stack>
                ) : (
                    <Typography variant="body1" fontWeight={500}>
                        {value}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const VerticalBadge: React.FC<{ vertical?: string }> = ({ vertical }) => {
    if (!vertical || vertical === 'NOT_A_BIZ') return null;

    const verticalLabels: Record<string, string> = {
        AUTOMOTIVE: 'Automotivo',
        BEAUTY: 'Beleza',
        APPAREL: 'Vestuário',
        EDU: 'Educação',
        ENTERTAIN: 'Entretenimento',
        EVENT_PLAN: 'Eventos',
        FINANCE: 'Finanças',
        GROCERY: 'Supermercado',
        GOVT: 'Governo',
        HOTEL: 'Hotelaria',
        HEALTH: 'Saúde',
        NONPROFIT: 'ONG',
        PROF_SERVICES: 'Serviços Profissionais',
        RETAIL: 'Varejo',
        TRAVEL: 'Viagens',
        RESTAURANT: 'Restaurante',
    };

    return (
        <Chip
            label={verticalLabels[vertical] || vertical}
            color="primary"
            variant="outlined"
            size="small"
        />
    );
};

export const BusinessProfileTab: React.FC = () => {
    const { data: profile } = useSuspenseQuery<WhatsAppBusinessProfile>({
        queryKey: ['whatsapp', 'business-profile'],
        queryFn: () => whatsappApi.getBusinessProfile(),
    });

    if (!profile) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Alert severity="info">
                    Perfil comercial não encontrado. Configure seu perfil no WhatsApp Business Manager.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                }}
            >
                <Stack spacing={4}>
                    {/* Header with Avatar */}
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                        <Avatar
                            src={profile.profile_picture_url}
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                fontSize: '2rem',
                            }}
                        >
                            <Building2 size={40} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" fontWeight={600} gutterBottom>
                                Perfil Comercial
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Informações públicas do seu WhatsApp Business
                            </Typography>
                            {profile.vertical && (
                                <Box sx={{ mt: 1.5 }}>
                                    <VerticalBadge vertical={profile.vertical} />
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Profile Information */}
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                                <InfoRow
                                    icon={<FileText size={20} />}
                                    label="Sobre"
                                    value={profile.about}
                                />
                                <InfoRow
                                    icon={<FileText size={20} />}
                                    label="Descrição"
                                    value={profile.description}
                                />
                                <InfoRow
                                    icon={<MapPin size={20} />}
                                    label="Endereço"
                                    value={profile.address}
                                />
                                <InfoRow
                                    icon={<Mail size={20} />}
                                    label="E-mail"
                                    value={profile.email}
                                />
                                <InfoRow
                                    icon={<Globe size={20} />}
                                    label="Websites"
                                    value={profile.websites}
                                />
                            </Stack>
                        </Grid>
                    </Grid>

                    {/* Empty State */}
                    {!profile.about &&
                        !profile.description &&
                        !profile.address &&
                        !profile.email &&
                        (!profile.websites || profile.websites.length === 0) && (
                            <Alert severity="info">
                                Seu perfil comercial está vazio. Complete as informações no WhatsApp Business Manager
                                para melhorar a confiança dos clientes.
                            </Alert>
                        )}
                </Stack>
            </Paper>
        </Box>
    );
};
