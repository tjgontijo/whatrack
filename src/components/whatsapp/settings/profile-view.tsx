'use client'

import React from 'react'
import { Building2, Mail, Globe, MapPin, Store, Info, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

interface ProfileViewProps {
    phone: WhatsAppPhoneNumber
}

export function ProfileView({ phone }: ProfileViewProps) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['whatsapp', 'business-profile'],
        queryFn: () => whatsappApi.getBusinessProfile(),
    })

    if (isLoading) {
        return <ProfileSkeleton />
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed bg-muted/30">
                <Store className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-semibold">Perfil não configurado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Adicione informações sobre sua empresa para passar mais credibilidade aos clientes.
                </p>
                <Button variant="outline" size="sm" asChild>
                    <a
                        href={`https://business.facebook.com/wa/manage/home/?waba_id=${phone.id}`} // Mock link
                        target="_blank" rel="noopener noreferrer"
                    >
                        Configurar no Gerenciador
                    </a>
                </Button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Cartão de Visita Principal */}
            <Card className="md:col-span-2 overflow-hidden border-primary/10">
                <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b" />
                <div className="px-8 relative">
                    <Avatar className="h-24 w-24 border-4 border-background absolute -top-12 shadow-lg bg-white">
                        <AvatarImage src={profile.profile_picture_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                            <Building2 className="h-10 w-10" />
                        </AvatarFallback>
                    </Avatar>
                </div>

                <CardContent className="pt-16 pb-8 px-8 space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold tracking-tight">{phone.verified_name}</h2>
                            {profile.vertical && (
                                <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wider">
                                    {profile.vertical}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                            {profile.description || "Sem descrição disponível."}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> Email
                            </h4>
                            <a href={`mailto:${profile.email}`} className="text-sm font-medium hover:underline hover:text-primary transition-colors block truncate" title={profile.email}>
                                {profile.email || '-'}
                            </a>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" /> Websites
                            </h4>
                            <div className="flex flex-col gap-1">
                                {profile.websites?.map((site, i) => (
                                    <a key={i} href={site} target="_blank" rel="noopener" className="text-sm font-medium hover:underline hover:text-primary transition-colors block truncate">
                                        {site}
                                    </a>
                                )) || '-'}
                            </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> Endereço
                            </h4>
                            <p className="text-sm font-medium">{profile.address || '-'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sidebar de Informações */}
            <div className="space-y-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            Sobre
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                            "{profile.about || "Hey there! I am using WhatsApp."}"
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-muted-foreground">
                            Gerenciar Perfil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Para alterar a foto, descrição ou categoria, acesse o WhatsApp Manager.
                        </p>
                        <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                            <a
                                href="https://business.facebook.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Abrir Business Manager
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ProfileSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 border-primary/10">
                <div className="h-32 bg-muted/50 border-b" />
                <div className="px-8 relative">
                    <Skeleton className="h-24 w-24 rounded-full border-4 border-background absolute -top-12" />
                </div>
                <CardContent className="pt-16 pb-8 px-8 space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-full max-w-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
            <div className="space-y-6">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        </div>
    )
}
