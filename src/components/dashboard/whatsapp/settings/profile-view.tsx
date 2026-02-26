'use client'

import { Building2, Mail, Globe, MapPin, Store, Info, ExternalLink, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp/whatsapp'

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
      <div className="bg-muted/30 flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <Store className="text-muted-foreground/40 mb-3 h-10 w-10" />
        <h3 className="text-lg font-semibold">Perfil não configurado</h3>
        <p className="text-muted-foreground mb-4 max-w-sm text-sm">
          Adicione informações sobre sua empresa para passar mais credibilidade aos clientes.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`https://business.facebook.com/wa/manage/home/?waba_id=${phone.id}`} // Mock link
            target="_blank"
            rel="noopener noreferrer"
          >
            Configurar no Gerenciador
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 gap-8 duration-500 md:grid-cols-3">
      {/* Cartão de Visita Principal */}
      <Card className="border-primary/10 overflow-hidden md:col-span-2">
        <div className="from-primary/10 via-primary/5 to-background h-32 border-b bg-gradient-to-r" />
        <div className="relative px-8">
          <Avatar className="border-background absolute -top-12 h-24 w-24 border-4 bg-white shadow-lg">
            <AvatarImage src={profile.profile_picture_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Building2 className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
        </div>

        <CardContent className="space-y-6 px-8 pb-8 pt-16">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{phone.verified_name}</h2>
              {profile.vertical && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {profile.vertical}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {profile.description || 'Sem descrição disponível.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                <Mail className="h-3.5 w-3.5" /> Email
              </h4>
              <a
                href={`mailto:${profile.email}`}
                className="hover:text-primary block truncate text-sm font-medium transition-colors hover:underline"
                title={profile.email}
              >
                {profile.email || '-'}
              </a>
            </div>
            <div className="space-y-1">
              <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                <Globe className="h-3.5 w-3.5" /> Websites
              </h4>
              <div className="flex flex-col gap-1">
                {profile.websites?.map((site, i) => (
                  <a
                    key={i}
                    href={site}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-primary block truncate text-sm font-medium transition-colors hover:underline"
                  >
                    {site}
                  </a>
                )) || '-'}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
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
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Info className="text-primary h-4 w-4" />
              Sobre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm italic">
              "{profile.about || 'Hey there! I am using WhatsApp.'}"
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-bold">
              Gerenciar Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Para alterar a foto, descrição ou categoria, acesse o WhatsApp Manager.
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
              <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">
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
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
      <p className="text-muted-foreground text-sm font-medium">Carregando perfil comercial...</p>
    </div>
  )
}
