'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, UserPlus } from 'lucide-react'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['owner', 'admin', 'user']),
})

interface Member {
  id: string
  name: string
  email: string
  role: string
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [isInviting, setIsInviting] = useState(false)

  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'user' as const,
    },
  })

  const onSubmitInvite = async (data: z.infer<typeof inviteSchema>) => {
    setIsInviting(true)
    try {
      const response = await fetch('/api/v1/organizations/me/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Erro ao enviar convite')

      toast.success(`Convite enviado para ${data.email}`)
      form.reset()
    } catch {
      toast.error('Erro ao enviar convite')
    } finally {
      setIsInviting(false)
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/v1/organizations/me/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao remover membro')

      toast.success('Membro removido com sucesso')
      setMembers(members.filter((m) => m.id !== memberId))
    } catch {
      toast.error('Erro ao remover membro')
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário'
      case 'admin':
        return 'Administrador'
      default:
        return 'Usuário'
    }
  }

  return (
    <div className="divide-border space-y-8 divide-y">
      {/* Invite Member Section */}
      <div className="grid grid-cols-1 gap-6 pt-8 first:pt-0 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="flex items-center gap-2 text-lg font-medium leading-none">
            <UserPlus className="h-5 w-5" />
            Convidar membro
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Envie um convite por email para adicionar um novo membro à organização.
          </p>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitInvite)}
                  className="flex flex-col gap-4 sm:flex-row"
                >
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="flex-1">
                        <Input
                          id={field.name}
                          placeholder="email@empresa.com"
                          type="email"
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="sm:w-48">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger id={field.name}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="owner">Proprietário</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? 'Enviando...' : 'Enviar convite'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Members Section */}
      <div className="grid grid-cols-1 gap-6 pt-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-none">Membros ativos</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {members.length} membro(s) na organização
          </p>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="w-24 pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        Nenhum membro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-6">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          {member.role !== 'owner' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="text-destructive h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {member.name} será removido da organização e perderá acesso ao
                                    sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeMember(member.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
