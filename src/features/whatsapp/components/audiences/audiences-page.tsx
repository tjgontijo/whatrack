'use client'

import { Filter, Plus, Tags, Users } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { HeaderPageShell, HeaderTabs } from '@/features/dashboard/components/layout'
import { AudienceSegmentsTab } from './audience-segments-tab'
import { ContactListsTab } from './contact-lists-tab'
import { LeadTagsTab } from './lead-tags-tab'

const TABS = [
  { key: 'lists', label: 'Listas estáticas', icon: Users },
  { key: 'segments', label: 'Segmentos dinâmicos', icon: Filter },
  { key: 'tags', label: 'Tags do CRM', icon: Tags },
]

export function AudiencesPage() {
  const [activeTab, setActiveTab] = React.useState('lists')

  return (
    <HeaderPageShell
      title='Audiências'
      selector={<HeaderTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />}
      primaryAction={
        activeTab === 'lists' ? (
          <Button size='sm' className='gap-2'>
            <Plus className='h-4 w-4' />
            Nova lista
          </Button>
        ) : activeTab === 'segments' ? (
          <Button size='sm' className='gap-2'>
            <Plus className='h-4 w-4' />
            Novo segmento
          </Button>
        ) : (
          <Button size='sm' className='gap-2'>
            <Plus className='h-4 w-4' />
            Nova tag
          </Button>
        )
      }
    >
      <div className='mt-6'>
        {activeTab === 'lists' && <ContactListsTab />}
        {activeTab === 'segments' && <AudienceSegmentsTab />}
        {activeTab === 'tags' && <LeadTagsTab />}
      </div>
    </HeaderPageShell>
  )
}
