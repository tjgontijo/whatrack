'use client';

import React, { useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppTemplate } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const MessagingView: React.FC = () => {
    const [testPhone, setTestPhone] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const { data: templates } = useSuspenseQuery<WhatsAppTemplate[]>({
        queryKey: ['whatsapp', 'templates'],
        queryFn: () => whatsappApi.getTemplates(),
    });

    const sendMutation = useMutation({
        mutationFn: ({ to, template }: { to: string; template: string }) =>
            whatsappApi.sendTemplate(to, template),
        onSuccess: () => {
            toast.success('Mensagem enviada com sucesso!');
            setTestPhone('');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao enviar mensagem');
        }
    });

    const handleSend = () => {
        if (!testPhone || !selectedTemplate) {
            toast.error('Preencha todos os campos');
            return;
        }
        sendMutation.mutate({ to: testPhone, template: selectedTemplate });
    };

    const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Enviar Mensagem de Teste</CardTitle>
                    <CardDescription>
                        Teste seus templates enviando mensagens para números autorizados
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="template">Template</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger id="template">
                                <SelectValue placeholder="Selecione um template" />
                            </SelectTrigger>
                            <SelectContent>
                                {approvedTemplates.map((template) => (
                                    <SelectItem key={template.name} value={template.name}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {approvedTemplates.length} template{approvedTemplates.length !== 1 ? 's' : ''} aprovado{approvedTemplates.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Número de Telefone</Label>
                        <Input
                            id="phone"
                            placeholder="+5511999999999"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Formato: +55 + DDD + número
                        </p>
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={sendMutation.isPending || !testPhone || !selectedTemplate}
                        className="w-full"
                    >
                        {sendMutation.isPending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Mensagem
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
