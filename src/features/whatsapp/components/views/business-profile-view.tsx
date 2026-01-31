'use client';

import React from 'react';
import { Building2, Mail, Globe, MapPin } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { whatsappApi } from '../../api/whatsapp';
import type { WhatsAppBusinessProfile } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const BusinessProfileView: React.FC = () => {
    const { data: profile } = useSuspenseQuery<WhatsAppBusinessProfile>({
        queryKey: ['whatsapp', 'business-profile'],
        queryFn: () => whatsappApi.getBusinessProfile(),
    });

    if (!profile) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground text-center">
                            Perfil comercial não encontrado. Configure no WhatsApp Business Manager.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasContent = profile.about || profile.description || profile.address || profile.email || (profile.websites && profile.websites.length > 0);

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={profile.profile_picture_url} />
                            <AvatarFallback>
                                <Building2 className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>Perfil Comercial</CardTitle>
                            <CardDescription>Informações públicas do WhatsApp Business</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasContent ? (
                        <>
                            {profile.about && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Sobre</p>
                                    <p className="text-sm text-muted-foreground">{profile.about}</p>
                                </div>
                            )}

                            {profile.description && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Descrição</p>
                                    <p className="text-sm text-muted-foreground">{profile.description}</p>
                                </div>
                            )}

                            {profile.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Endereço</p>
                                        <p className="text-sm text-muted-foreground">{profile.address}</p>
                                    </div>
                                </div>
                            )}

                            {profile.email && (
                                <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">E-mail</p>
                                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                                    </div>
                                </div>
                            )}

                            {profile.websites && profile.websites.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Websites</p>
                                        <div className="space-y-1">
                                            {profile.websites.map((website, idx) => (
                                                <p key={idx} className="text-sm text-muted-foreground">{website}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Seu perfil está vazio. Complete as informações no WhatsApp Business Manager.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
