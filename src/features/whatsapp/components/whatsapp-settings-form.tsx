'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
    Grid
} from '@mui/material';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, RefreshCw, ExternalLink, ShieldCheck, Smartphone, Settings } from 'lucide-react';
import { whatsappApi } from '../api/whatsapp';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';
import type { WhatsAppTemplate } from '../types';

interface WhatsAppSettingsFormProps {
    onSuccess?: () => void;
}

export const WhatsAppSettingsForm: React.FC<WhatsAppSettingsFormProps> = ({ onSuccess }) => {
    const queryClient = useQueryClient();
    const { showMessage, hideMessage, open, message, severity } = useMuiSnackbar();

    // State
    const [testPhone, setTestPhone] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('hello_world');

    // Data Fetching (Suspense-First)
    const { data: templates } = useSuspenseQuery<WhatsAppTemplate[]>({
        queryKey: ['whatsapp', 'templates'],
        queryFn: () => whatsappApi.getTemplates(),
    });

    // Mutations
    const sendMutation = useMutation({
        mutationFn: ({ to, template }: { to: string; template: string }) =>
            whatsappApi.sendTemplate(to, template),
        onSuccess: () => {
            showMessage('Mensagem de teste enviada com sucesso!', 'success');
            onSuccess?.();
            setTestPhone('');
        },
        onError: (error: any) => {
            showMessage(error.message || 'Erro ao enviar mensagem', 'error');
        }
    });

    // Handlers
    const handleSendTest = useCallback(() => {
        if (!testPhone) {
            showMessage('Digite um número de telefone válido', 'warning');
            return;
        }
        sendMutation.mutate({ to: testPhone, template: selectedTemplate });
    }, [testPhone, selectedTemplate, sendMutation, showMessage]);

    const handleRefreshTemplates = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] });
        showMessage('Lista de templates atualizada', 'info');
    }, [queryClient, showMessage]);

    // Derived values
    const isReadyToSend = useMemo(() => {
        return testPhone.length >= 8 && selectedTemplate;
    }, [testPhone, selectedTemplate]);

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            <Grid container spacing={4}>
                {/* Integration Status Card */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 6,
                            height: '140%',
                            background: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(30, 41, 59, 0.4)'
                                : 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    p: 1.2,
                                    borderRadius: 3,
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    display: 'flex',
                                    boxShadow: (theme) => `0 8px 16px -4px ${theme.palette.primary.main}66`
                                }}>
                                    <ShieldCheck size={24} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                                        Status da API
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Cloud API v24.0
                                    </Typography>
                                </Box>
                            </Box>
                            <Alert
                                icon={false}
                                severity="success"
                                sx={{
                                    py: 0,
                                    px: 1.5,
                                    borderRadius: '20px',
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    border: '1px solid',
                                    borderColor: 'success.light',
                                    bgcolor: 'success.main',
                                    color: 'success.contrastText'
                                }}
                            >
                                ACTIVE
                            </Alert>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                            Sua conta está integrada ao modo de coexistência. O WhatsApp Business App e a API Cloud podem funcionar simultaneamente.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flex: 1 }}>
                            <Box>
                                <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                    WABA Account ID
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'var(--font-geist-mono)', bgcolor: 'action.selected', p: 2, borderRadius: 3, fontWeight: 600, border: '1px solid', borderColor: 'divider' }}>
                                    1191577299800698
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                    Connection Token
                                </Typography>
                                <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        EAAV7u...FvpZA2
                                    </Typography>
                                    <Settings size={14} style={{ opacity: 0.3 }} />
                                </Box>
                            </Box>
                        </Box>

                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<ExternalLink size={18} />}
                            onClick={() => window.open('https://business.facebook.com/wa/manage/message-templates/', '_blank')}
                            sx={{
                                mt: 5,
                                py: 1.8,
                                borderRadius: 4,
                                fontWeight: 800,
                                borderWidth: 2,
                                '&:hover': { borderWidth: 2, bgcolor: 'action.hover' }
                            }}
                        >
                            Gerenciar Templates
                        </Button>
                    </Paper>
                </Grid>

                {/* Test Messaging Card */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 8,
                            background: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(15, 23, 42, 0.2)'
                                : 'rgba(255, 255, 255, 0.3)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative Background Element */}
                        <Box sx={{
                            position: 'absolute',
                            top: -100,
                            right: -100,
                            width: 300,
                            height: 300,
                            background: (theme) => `radial-gradient(circle, ${theme.palette.primary.main}11 0%, transparent 70%)`,
                            zIndex: 0
                        }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5, position: 'relative', zIndex: 1 }}>
                            <Box>
                                <Typography variant="h5" fontWeight={900} letterSpacing="-0.03em">
                                    Simulador de Mensagens
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Valide o recebimento em tempo real
                                </Typography>
                            </Box>
                            <Tooltip title="Recarregar Templates">
                                <IconButton onClick={handleRefreshTemplates} sx={{ bgcolor: 'action.hover', p: 1.5 }}>
                                    <RefreshCw size={20} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', zIndex: 1 }}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel sx={{ fontWeight: 700, px: 1, bgcolor: 'background.paper' }}>Template</InputLabel>
                                <Select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    label="Template"
                                    sx={{
                                        borderRadius: 4,
                                        '& .MuiOutlinedInput-notchedOutline': { border: '2px solid', borderColor: 'divider' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.light' },
                                        height: 64,
                                        fontWeight: 600
                                    }}
                                >
                                    {templates?.map((t) => (
                                        <MenuItem key={t.name} value={t.name} sx={{ py: 2, fontWeight: 600 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography>{t.name}</Typography>
                                                <Typography variant="caption" sx={{ px: 1, py: 0.2, bgcolor: 'action.hover', borderRadius: 1, color: 'text.secondary' }}>
                                                    {t.language}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                    {(!templates || templates.length === 0) && (
                                        <MenuItem value="hello_world" sx={{ py: 2, fontWeight: 600 }}>hello_world (en_US)</MenuItem>
                                    )}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Destinatário"
                                placeholder="+55 11 99999-9999"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: <Smartphone size={20} style={{ marginRight: 16, opacity: 0.6 }} />,
                                        sx: { borderRadius: 4, fontWeight: 600, height: 64, border: '2px solid', borderColor: 'transparent', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' }, '&.Mui-focused': { bgcolor: 'background.paper' } }
                                    },
                                    inputLabel: {
                                        sx: { fontWeight: 700 }
                                    }
                                }}
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={!isReadyToSend || sendMutation.isPending}
                                startIcon={sendMutation.isPending ? <RefreshCw size={24} className="animate-spin" /> : <Send size={24} />}
                                onClick={handleSendTest}
                                sx={{
                                    py: 2.5,
                                    borderRadius: 5,
                                    textTransform: 'none',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    letterSpacing: '-0.01em',
                                    boxShadow: (theme) => `0 20px 40px -12px ${theme.palette.primary.main}66`,
                                    '&:hover': {
                                        boxShadow: (theme) => `0 24px 48px -12px ${theme.palette.primary.main}99`,
                                        transform: 'translateY(-3px)'
                                    },
                                    '&:active': {
                                        transform: 'translateY(-1px)'
                                    }
                                }}
                            >
                                {sendMutation.isPending ? 'ENVIANDO...' : 'DISPARAR AGORA'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={open}
                autoHideDuration={5000}
                onClose={hideMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={hideMessage}
                    severity={severity}
                    variant="filled"
                    sx={{
                        borderRadius: 4,
                        fontWeight: 700,
                        px: 4,
                        py: 1,
                        boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
                        fontSize: '1rem'
                    }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WhatsAppSettingsForm;
