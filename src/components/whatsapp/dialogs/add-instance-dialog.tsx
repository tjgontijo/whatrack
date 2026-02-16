'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink, CheckCircle2, Loader2, AlertCircle, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding';

interface AddInstanceDialogProps {
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function AddInstanceDialog({ onSuccess, trigger }: AddInstanceDialogProps) {
    const { status, error, startOnboarding, reset } = useWhatsAppOnboarding(() => {
        onSuccess?.();
    });

    return (
        <Dialog onOpenChange={(open) => { if (!open) reset(); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="default" size="sm" className="h-8 gap-2 font-bold shadow-sm">
                        <Plus className="h-4 w-4" />
                        Nova Instância
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        {status === 'success' ? 'Conectado!' : 'Adicionar Nova Instância'}
                    </DialogTitle>
                    <DialogDescription>
                        {status === 'success'
                            ? 'Sua nova instância do WhatsApp foi ativada com sucesso.'
                            : 'Conecte um novo número de telefone à sua conta WhatsApp Business.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'idle' && (
                        <div className="space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border">
                                <p className="font-semibold text-foreground">O que acontecerá a seguir:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                    <li>Uma janela da Meta será aberta</li>
                                    <li>Você selecionará sua Conta Comercial</li>
                                    <li>Registrará o novo número de telefone</li>
                                    <li>Vinculará ao WhaTrack</li>
                                </ul>
                            </div>
                            <Button
                                onClick={startOnboarding}
                                className="w-full gap-2"
                                size="lg"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Ir para a Meta
                            </Button>
                        </div>
                    )}

                    {status === 'pending' && (
                        <div className="space-y-4">
                            <Alert className="bg-blue-50 border-blue-200">
                                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                <AlertDescription className="text-blue-800">
                                    Complete o processo na janela da Meta. A conexão será ativada automaticamente.
                                </AlertDescription>
                            </Alert>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                size="lg"
                                disabled
                            >
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Aguardando conexão...
                            </Button>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6 text-center py-4">
                            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    A configuração foi concluída e o número já está pronto para uso.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => reset()}
                            >
                                Fechar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
