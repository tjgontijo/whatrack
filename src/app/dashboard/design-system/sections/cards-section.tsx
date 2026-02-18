'use client'

import { TrendingUp, Phone, Mail, ShoppingBag, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableCardTitle,
  DataTableCardMeta,
  DataTableCardContent,
  DataTableCardRow,
  DataTableCardFooter,
} from '@/components/data-table/cards/data-table-card'
import { DashboardMetricCard } from '@/components/dashboard/charts/card'

import { SectionWrapper, ShowcaseBox } from './shared'

export function CardsSection() {
  return (
    <SectionWrapper
      id="cards"
      title="Cards"
      description="Modelos de card para diferentes contextos. Use sempre os componentes compostos, nunca monte cards com divs avulsas."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Básico */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Card Básico
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Mês</CardTitle>
              <CardDescription>
                Visão geral das métricas de janeiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">1.284</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendas</span>
                  <span className="font-medium">342</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversão</span>
                  <span className="font-medium">26,6%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            Card / CardHeader / CardTitle / CardContent / CardFooter
          </p>
        </div>

        {/* DataTable Card */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            DataTable Card
          </h3>
          <DataTableCard>
            <DataTableCardHeader>
              <DataTableCardTitle>Maria Silva</DataTableCardTitle>
              <DataTableCardMeta>12 jan, 14:30</DataTableCardMeta>
            </DataTableCardHeader>
            <DataTableCardContent>
              <DataTableCardRow label="Telefone">
                <span className="text-sm">+55 11 99999-0000</span>
              </DataTableCardRow>
              <DataTableCardRow label="Email">
                <span className="text-sm text-primary">maria@email.com</span>
              </DataTableCardRow>
              <DataTableCardRow label="Status">
                <Badge variant="secondary">Qualificado</Badge>
              </DataTableCardRow>
            </DataTableCardContent>
            <DataTableCardFooter>
              <Button variant="ghost" size="icon-xs">
                <Phone className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs">
                <Mail className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs">
                <ShoppingBag className="size-3.5" />
              </Button>
            </DataTableCardFooter>
          </DataTableCard>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            DataTableCard / Header / Title / Meta / Content / Row / Footer
          </p>
        </div>

        {/* Metric Card */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Metric Card
          </h3>
          <DashboardMetricCard
            title="Vendas do Mês"
            value="R$ 48.250"
            icon={<TrendingUp className="size-5" />}
            trend={
              <span className="text-success">+12,5% vs mês anterior</span>
            }
          />
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            DashboardMetricCard (title, value, icon, trend)
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Buttons & Badges */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Botões
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button size="default">Default</Button>
              <Button size="lg">LG</Button>
              <Button size="icon">
                <Plus />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonGroup>
                <Button variant="outline">Esquerda</Button>
                <Button variant="outline">Centro</Button>
                <Button variant="outline">Direita</Button>
              </ButtonGroup>
            </div>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Badges
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Para status, use Badge com cores semânticas:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/20">
                  Ativo
                </Badge>
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  Pendente
                </Badge>
                <Badge className="bg-info/10 text-info border-info/20">
                  Em progresso
                </Badge>
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                  Cancelado
                </Badge>
              </div>
            </div>
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
