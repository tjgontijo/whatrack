'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  WHATSAPP_MASK_MAX_LENGTH,
  applyWhatsAppMask,
  removeWhatsAppMask,
} from '@/lib/mask/phone-mask'
import type { UpdateMeAccountInput } from '@/schemas/me/me-account-schemas'

export type AccountProfile = {
  id: string
  name: string
  email: string
  phone: string | null
  updatedAt: string
}

type AccountProfileCardProps = {
  account: AccountProfile
  isPending: boolean
  onSubmit: (data: UpdateMeAccountInput) => void
}

export function AccountProfileCard({
  account,
  isPending,
  onSubmit,
}: AccountProfileCardProps) {
  const [profileName, setProfileName] = useState(account.name)
  const [profileEmail, setProfileEmail] = useState(account.email)
  const [profilePhone, setProfilePhone] = useState(applyWhatsAppMask(account.phone ?? ''))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Atualize os dados da sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="account-profile-name">
            Nome
          </label>
          <Input
            id="account-profile-name"
            autoComplete="name"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="account-profile-email">
            E-mail
          </label>
          <Input
            id="account-profile-email"
            autoComplete="email"
            type="email"
            value={profileEmail}
            onChange={(event) => setProfileEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="account-profile-phone">
            Telefone
          </label>
          <Input
            id="account-profile-phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={WHATSAPP_MASK_MAX_LENGTH}
            placeholder="(11) 98888-8888"
            value={profilePhone}
            onChange={(event) => setProfilePhone(applyWhatsAppMask(event.target.value))}
          />
        </div>
        <div>
          <Button
            onClick={() =>
              onSubmit({
                name: profileName,
                email: profileEmail,
                phone: removeWhatsAppMask(profilePhone) || null,
              })
            }
            disabled={isPending}
          >
            {isPending ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
