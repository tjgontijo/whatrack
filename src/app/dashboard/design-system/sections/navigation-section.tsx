'use client'

import { useState } from 'react'
import { List, Grid3X3 } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SegmentedControl } from '@/components/data-table/segmented-control'

import { SectionWrapper, ShowcaseBox } from './shared'

export function NavigationSection() {
  const [segmentValue, setSegmentValue] = useState('tabela')

  return (
    <SectionWrapper
      id="navegacao"
      title="Tabs & Navegação"
      description="Componentes de navegação para organizar conteúdo e alternar entre views."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Tabs — Variante Default
          </h3>
          <Tabs defaultValue="visao-geral">
            <TabsList>
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
            </TabsList>
            <TabsContent value="visao-geral">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Conteúdo da aba Visão Geral</p>
              </div>
            </TabsContent>
            <TabsContent value="leads">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Conteúdo da aba Leads</p>
              </div>
            </TabsContent>
            <TabsContent value="vendas">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Conteúdo da aba Vendas</p>
              </div>
            </TabsContent>
          </Tabs>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Tabs — Variante Line
          </h3>
          <Tabs defaultValue="todos">
            <TabsList variant="line">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="ativos">Ativos</TabsTrigger>
              <TabsTrigger value="inativos">Inativos</TabsTrigger>
            </TabsList>
            <TabsContent value="todos">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Conteúdo com line tabs</p>
              </div>
            </TabsContent>
            <TabsContent value="ativos">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Ativos</p>
              </div>
            </TabsContent>
            <TabsContent value="inativos">
              <div className="border-border/50 mt-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Inativos</p>
              </div>
            </TabsContent>
          </Tabs>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Segmented Control
          </h3>
          <SegmentedControl
            value={segmentValue}
            onChange={setSegmentValue}
            options={[
              { value: 'tabela', label: 'Tabela', icon: <List className="size-4" /> },
              { value: 'cards', label: 'Cards', icon: <Grid3X3 className="size-4" /> },
            ]}
          />
          <p className="text-muted-foreground mt-3 text-xs">
            Use para alternar entre modos de visualização (tabela/cards/kanban).
          </p>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Breadcrumb
          </h3>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Configurações</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>WhatsApp</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <p className="text-muted-foreground mt-3 text-xs">
            Navegação hierárquica. Gerada automaticamente pelo DashboardHeader.
          </p>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
