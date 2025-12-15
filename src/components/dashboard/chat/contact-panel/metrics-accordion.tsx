'use client'

import { BarChart3, Clock, MessageSquare, RefreshCw, TrendingUp } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useConversationMetrics,
  useRecalculateMetrics,
  formatDuration,
  getScoreTierColor,
  type LeadScore,
} from '@/hooks/use-conversation-metrics'
import { cn } from '@/lib/utils'

interface MetricsAccordionProps {
  conversationId: string | null
  className?: string
}

export function MetricsAccordion({ conversationId, className }: MetricsAccordionProps) {
  const { data, isLoading, error } = useConversationMetrics(conversationId)
  const recalculateMutation = useRecalculateMetrics()

  if (!conversationId) {
    return null
  }

  if (isLoading) {
    return (
      <AccordionItem value="metrics" className={className}>
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Engagement Metrics</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }

  if (error) {
    return (
      <AccordionItem value="metrics" className={className}>
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Engagement Metrics</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground">Failed to load metrics</p>
        </AccordionContent>
      </AccordionItem>
    )
  }

  const handleRecalculate = () => {
    if (conversationId) {
      recalculateMutation.mutate(conversationId)
    }
  }

  return (
    <AccordionItem value="metrics" className={className}>
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span>Engagement Metrics</span>
          {data?.score && <LeadScoreBadge score={data.score} />}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {!data?.hasMetrics ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No metrics calculated yet
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  recalculateMutation.isPending && 'animate-spin'
                )}
              />
              Calculate Metrics
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lead Score */}
            {data.score && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Lead Score
                  </span>
                  <span className="text-sm font-semibold">{data.score.score}/100</span>
                </div>
                <Progress value={data.score.score} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Engagement: {data.score.factors.engagementScore}/25</div>
                  <div>Response: {data.score.factors.responseSpeed}/25</div>
                  <div>Content: {data.score.factors.contentQuality}/25</div>
                  <div>Recency: {data.score.factors.recency}/25</div>
                </div>
              </div>
            )}

            {/* Message Counts */}
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold">{data.metrics?.totalMessages ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold">{data.metrics?.messagesFromLead ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Lead</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold">{data.metrics?.messagesFromAgent ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Agent</div>
                </div>
              </div>
            </div>

            {/* Response Times */}
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Response Times
              </span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead avg:</span>
                  <span>{formatDuration(data.metrics?.leadAvgResponseTime ?? null)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent avg:</span>
                  <span>{formatDuration(data.metrics?.agentAvgResponseTime ?? null)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead fastest:</span>
                  <span>{formatDuration(data.metrics?.leadFastestResponse ?? null)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{formatDuration(data.metrics?.conversationDuration ?? null)}</span>
                </div>
              </div>
            </div>

            {/* Extra Stats */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg message length:</span>
              <span>{data.metrics?.avgMessageLength ?? '-'} chars</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Media shared:</span>
              <span>{data.metrics?.mediaShared ?? 0}</span>
            </div>

            {/* Recalculate Button */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  recalculateMutation.isPending && 'animate-spin'
                )}
              />
              Recalculate
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function LeadScoreBadge({ score }: { score: LeadScore }) {
  return (
    <span
      className={cn(
        'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        getScoreTierColor(score.tier)
      )}
    >
      {score.tier}
    </span>
  )
}
