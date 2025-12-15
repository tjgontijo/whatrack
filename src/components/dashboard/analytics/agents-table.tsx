'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface AgentMetrics {
  userId: string
  name: string
  email: string
  image: string | null
  ticketsAssigned: number
  ticketsClosed: number
  ticketsWon: number
  salesCount: number
  messagesSent: number
  avgResponseTimeMs: number | null
  avgSentimentScore: number | null
  conversionRate: number
}

interface AgentsTableProps {
  agents: AgentMetrics[]
  title?: string
  description?: string
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 3600000)}h`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AgentsTable({
  agents,
  title = 'Desempenho dos Agentes',
  description = 'Metricas de performance por agente',
}: AgentsTableProps) {
  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            Nenhum agente com atividade no periodo
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agente</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead className="text-right">Fechados</TableHead>
              <TableHead className="text-right">Ganhos</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">Msgs</TableHead>
              <TableHead className="text-right">Resp.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.image ?? undefined} />
                      <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">{agent.ticketsAssigned}</TableCell>
                <TableCell className="text-right">{agent.ticketsClosed}</TableCell>
                <TableCell className="text-right">{agent.ticketsWon}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      agent.conversionRate >= 50
                        ? 'border-green-500 text-green-600'
                        : agent.conversionRate >= 25
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-red-500 text-red-600'
                    )}
                  >
                    {agent.conversionRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{agent.messagesSent}</TableCell>
                <TableCell className="text-right">
                  {formatResponseTime(agent.avgResponseTimeMs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
