'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { useAuditLogs, AuditLogWithUser } from '@/hooks/use-audit-logs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EyeIcon } from 'lucide-react'

function JsonViewer({ data }: { data: any }) {
    if (!data) return <span className="text-muted-foreground italic">N/A</span>

    return (
        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
        </pre>
    )
}

function AuditLogDetails({ log }: { log: AuditLogWithUser }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Ver Detalhes">
                    <EyeIcon className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalhes da Ação</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Ação</p>
                            <p className="font-semibold">{log.action}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Recurso</p>
                            <p>{log.resourceType} {log.resourceId ? `(${log.resourceId})` : ''}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">IP</p>
                            <p className="font-mono text-sm">{log.ip || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                            <p className="font-mono text-sm">{log.requestId || 'N/A'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                        <p className="text-sm">{log.userAgent || 'N/A'}</p>
                    </div>
                    <div className="grid gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Estado Anterior (Before)</p>
                        <JsonViewer data={log.before} />
                    </div>
                    <div className="grid gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Novo Estado (After)</p>
                        <JsonViewer data={log.after} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function AuditLogsTable() {
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(20)

    const { data, isLoading, isError, error } = useAuditLogs({
        page,
        pageSize,
    })

    const columns: ColumnDef<AuditLogWithUser>[] = React.useMemo(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Data/Hora',
                cell: ({ row }) => (
                    <span className="whitespace-nowrap">
                        {format(new Date(row.original.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </span>
                ),
            },
            {
                accessorKey: 'user',
                header: 'Usuário',
                cell: ({ row }) => {
                    const user = row.original.user
                    if (!user) {
                        return <span className="text-muted-foreground italic">Sistema</span>
                    }
                    return (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={user.image || ''} />
                                <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.name || user.email}</span>
                        </div>
                    )
                },
            },
            {
                accessorKey: 'action',
                header: 'Ação',
                cell: ({ row }) => (
                    <Badge variant="outline" className="font-mono bg-background">
                        {row.original.action}
                    </Badge>
                ),
            },
            {
                accessorKey: 'resourceType',
                header: 'Recurso',
                cell: ({ row }) => row.original.resourceType,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <div className="flex justify-end">
                        <AuditLogDetails log={row.original} />
                    </div>
                ),
            },
        ],
        []
    )

    const renderMobileCard = React.useCallback(
        (row: any) => {
            const log = row.original as AuditLogWithUser
            return (
                <Card key={log.id} className="mb-4">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit font-mono">{log.action}</Badge>
                            <span className="text-xs text-muted-foreground">
                                {format(new Date(log.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                        <AuditLogDetails log={log} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Usuário:</span>
                            <span className="text-sm truncate">
                                {log.user ? (log.user.name || log.user.email) : 'Sistema'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Recurso:</span>
                            <span className="text-sm">{log.resourceType}</span>
                        </div>
                    </CardContent>
                </Card>
            )
        },
        []
    )

    return (
        <ResponsiveDataTable
            data={data?.data || []}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error as Error}
            mobileCard={renderMobileCard}
            pagination={{
                page,
                pageSize,
                total: data?.total || 0,
                onPageChange: setPage,
                onPageSizeChange: setPageSize,
            }}
            emptyState={
                <div className="text-center py-10 text-muted-foreground">
                    Nenhum log de auditoria encontrado.
                </div>
            }
        />
    )
}
