'use client'

import { AuditLogsTable } from '@/components/dashboard/settings/audit-logs-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'

export default function AuditLogsPage() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 pt-8 first:pt-0 md:grid-cols-3">
                <div className="md:col-span-1">
                    <h3 className="flex items-center gap-2 text-lg font-medium leading-none">
                        <ShieldCheck className="h-5 w-5" />
                        Logs de Auditoria
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Histórico completo de ações e alterações realizadas na organização.
                        Essencial para segurança e conformidade com a LGPD.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b bg-muted/20 px-6 py-4">
                            <CardTitle className="text-base font-semibold">Eventos Recentes</CardTitle>
                            <CardDescription>
                                Rastreia criação, atualização e exclusão em recursos críticos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6">
                            <AuditLogsTable />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
