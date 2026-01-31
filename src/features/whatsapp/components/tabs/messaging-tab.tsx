'use client';

import React, { useState, useCallback } from 'react';
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
    Alert,
    Snackbar,
    Grid,
    Chip,
    Stack,
} from '@mui/material';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, RefreshCw } from 'lucide-react';
import { whatsappApi } from '../../api/whatsapp';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';
import type { WhatsAppTemplate } from '../../types';

export const MessagingTab: React.FC = () => {
    const queryClient = useQueryClient();
    const { showMessage, hideMessage, open, message, severity } = useMuiSnackbar();

    // State
    const [testPhone, setTestPhone] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('hello_world');

    // Data Fetching
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
            setTestPhone('');
        },
        onError: (error: any) => {
            showMessage(error.message || 'Erro ao enviar mensagem', 'error');
        }
    });

    // Handlers
    const handleRefreshTemplates = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] });
        showMessage('Lista de templates atualizada', 'info');
    }, [queryClient, showMessage]);

    const handleSendTest = useCallback(() => {
        if (!testPhone || !selectedTemplate) {
            showMessage('Preencha todos os campos', 'warning');
            return;
        }
        sendMutation.mutate({ to: testPhone, template: selectedTemplate });
    }, [testPhone, selectedTemplate, sendMutation, showMessage]);

    const isReadyToSend = testPhone && selectedTemplate && !sendMutation.isPending;

    const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Grid container spacing={3}>
                {/* Templates Section */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            height: '100%',
                        }}
                    >
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" fontWeight={600}>
                                    Templates Disponíveis
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<RefreshCw size={16} />}
                                    onClick={handleRefreshTemplates}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Atualizar
                                </Button>
                            </Box>

                            <Typography variant="body2" color="text.secondary">
                                {approvedTemplates.length} template{approvedTemplates.length !== 1 ? 's' : ''} aprovado{approvedTemplates.length !== 1 ? 's' : ''}
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {approvedTemplates.map((template) => (
                                    <Chip
                                        key={template.name}
                                        label={template.name}
                                        size="small"
                                        color={selectedTemplate === template.name ? 'primary' : 'default'}
                                        onClick={() => setSelectedTemplate(template.name)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: selectedTemplate === template.name ? 'primary.dark' : 'action.hover',
                                            },
                                        }}
                                    />
                                ))}
                            </Box>

                            {approvedTemplates.length === 0 && (
                                <Alert severity="info">
                                    Nenhum template aprovado encontrado. Crie templates no Facebook Business Manager.
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Test Message Section */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            height: '100%',
                        }}
                    >
                        <Stack spacing={3}>
                            <Typography variant="h6" fontWeight={600}>
                                Enviar Mensagem de Teste
                            </Typography>

                            <FormControl fullWidth>
                                <InputLabel>Template</InputLabel>
                                <Select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    label="Template"
                                    disabled={approvedTemplates.length === 0}
                                >
                                    {approvedTemplates.map((template) => (
                                        <MenuItem key={template.name} value={template.name}>
                                            {template.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Número de Telefone"
                                placeholder="+5511999999999"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                helperText="Formato: +55 + DDD + número (ex: +5511999999999)"
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={!isReadyToSend}
                                startIcon={sendMutation.isPending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                onClick={handleSendTest}
                                sx={{
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                }}
                            >
                                {sendMutation.isPending ? 'Enviando...' : 'Enviar Mensagem'}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Snackbar */}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={hideMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={hideMessage} severity={severity} sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
