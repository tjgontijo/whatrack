'use client'

import React from 'react'
import {
  ShieldCheck,
  Activity,
  Smartphone,
  AlertTriangle,
  Zap,
  Loader2,
  FileText,
  UserCircle,
  MessageSquare,
  Send,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import Link from 'next/link'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import * as Flags from 'country-flag-icons/react/3x2'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

interface OverviewViewProps {
  phone: WhatsAppPhoneNumber
}

export function OverviewView({ phone }: OverviewViewProps) {
  const queryClient = useQueryClient()

  const { data: accountInfo } = useQuery({
    queryKey: ['whatsapp', 'account'],
    queryFn: () => whatsappApi.getAccountInfo(),
  })

  const activateMutation = useMutation({
    mutationFn: () => whatsappApi.activateNumber(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Número ativado com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['whatsapp'] })
      } else {
        toast.warning('Ativação parcial', { description: data.message })
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao ativar número', { description: error.message })
    },
  })

  const needsActivation = phone.status !== 'CONNECTED'

  const reviewStatus = {
    APPROVED: { label: 'Aprovado', color: 'default' },
    PENDING: { label: 'Em Análise', color: 'secondary' },
    REJECTED: { label: 'Rejeitado', color: 'destructive' },
  }[accountInfo?.account_review_status || 'PENDING'] || { label: 'Pendente', color: 'secondary' }

  const phoneStatus: Record<
    string,
    { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    CONNECTED: { label: 'Conectado', color: 'default' },
    PENDING: { label: 'Pendente', color: 'secondary' },
    DISCONNECTED: { label: 'Desconectado', color: 'destructive' },
    BANNED: { label: 'Banido', color: 'destructive' },
  }

  const currentStatus = phoneStatus[phone.status || 'PENDING'] || {
    label: phone.status || 'Desconhecido',
    color: 'secondary',
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 w-full space-y-6 pb-8 duration-500">
      {needsActivation && (
        <Alert
          variant="destructive"
          className="border-amber-500/20 bg-amber-500/5 py-3 text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="h-4 w-4" />
          <div className="flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <AlertTitle className="text-sm font-bold">Ação Requerida: Ativar Número</AlertTitle>
              <AlertDescription className="text-xs opacity-90">
                Registre este número na Meta Cloud para habilitar o envio de mensagens.
              </AlertDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-amber-500/50 text-xs text-amber-700 hover:bg-amber-500/10"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Processando
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-3 w-3" /> Ativar Agora
                </>
              )}
            </Button>
          </div>
        </Alert>
      )}

      {/* Status Grid - Compact */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="bg-muted/20 border-none shadow-none">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Smartphone className="h-3 w-3" /> Status do Número
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const raw = phone.display_phone_number
                  const clean = raw.startsWith('+') ? raw : `+${raw.replace(/\D/g, '')}`
                  const parsed = parsePhoneNumberFromString(clean)
                  const country =
                    parsed?.country || (raw.startsWith('1') || raw.startsWith('+1') ? 'US' : null)
                  const Flag = country ? (Flags as any)[country] : null
                  return (
                    <>
                      {Flag && (
                        <div className="w-5 shrink-0 overflow-hidden rounded-[2px] border shadow-sm">
                          <Flag />
                        </div>
                      )}
                      <span className="font-mono text-lg font-bold tracking-tight">
                        {parsed?.formatInternational() || raw}
                      </span>
                    </>
                  )
                })()}
              </div>
              <Badge
                variant={currentStatus.color as any}
                className="h-5 px-2 py-0 text-[10px] font-bold"
              >
                {currentStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/20 border-none shadow-none">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Activity className="h-3 w-3" /> Status da Conta
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">
                {accountInfo?.account_review_status === 'APPROVED'
                  ? 'Aprovada pela Meta'
                  : 'Em processamento'}
              </span>
              <Badge
                variant={reviewStatus.color as any}
                className="h-5 px-2 py-0 text-[10px] font-bold"
              >
                {reviewStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hubs - More Balanced */}
      <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-3">
        {/* Templates Hub */}
        <Card className="hover:border-primary/40 border-muted group flex h-full flex-col shadow-sm transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Mensagens & Templates</CardTitle>
                <CardDescription className="text-xs">
                  Biblioteca de mensagens aprovadas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-4">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Crie e gerencie modelos de mensagens para notificações, suporte e marketing direto.
            </p>
            <Button
              asChild
              className="shadow-primary/10 h-10 w-full rounded-lg text-sm font-bold shadow-md"
            >
              <Link href={`/dashboard/settings/whatsapp/${phone.id}/templates`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Abrir Templates
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Settings Hub */}
        <Card className="hover:border-primary/40 border-muted group flex h-full flex-col shadow-sm transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <UserCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Perfil Comercial</CardTitle>
                <CardDescription className="text-xs">Identidade visual no WhatsApp</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-4">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Configure sua foto, descrição, horários e informações de contato da empresa.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-10 w-full rounded-lg border-2 text-sm font-bold"
            >
              <Link href={`/dashboard/settings/whatsapp/${phone.id}/settings`}>
                <UserCircle className="mr-2 h-4 w-4" />
                Editar Perfil
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Test Send Hub */}
        <Card className="hover:border-primary/40 border-muted group flex h-full flex-col shadow-sm transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Teste de Envio</CardTitle>
                <CardDescription className="text-xs">
                  Valide sua conexão enviando uma mensagem
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-4">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Envie uma mensagem de teste para qualquer número para garantir que tudo está
              configurado corretamente.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-10 w-full rounded-lg border-2 text-sm font-bold"
            >
              <Link href={`/dashboard/settings/whatsapp/${phone.id}/send-test`}>
                <Send className="mr-2 h-4 w-4" />
                Testar Agora
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sending Capacity - Subtle */}
      <div className="mt-4 pt-8">
        <div className="flex items-center justify-between px-4 opacity-70 transition-opacity hover:opacity-100">
          <div className="flex items-center gap-3">
            <Activity className="text-muted-foreground h-4 w-4" />
            <div>
              <p className="text-foreground text-xs font-bold tracking-tight">
                {phone.throughput?.level === 'HIGH'
                  ? 'Tier 2: 10.000 msgs/dia'
                  : phone.throughput?.level === 'STANDARD'
                    ? 'Tier 1: 1.000 msgs/dia'
                    : 'Tier Ilimitado'}
              </p>
              <p className="text-muted-foreground text-[10px]">
                Limite diário de conversas iniciadas pela empresa
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-muted-foreground/20 h-5 px-2 py-0 text-[9px] font-black uppercase tracking-widest"
          >
            Tier {phone.throughput?.level || 'N/A'}
          </Badge>
        </div>
      </div>
    </div>
  )
}
