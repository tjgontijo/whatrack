import type { ReactNode } from 'react'

import { SettingsNav } from '@/components/dashboard/settings/settings-nav'

type SettingsLayoutShellProps = {
  sections: Parameters<typeof SettingsNav>[0]['sections']
  children: ReactNode
}

export function SettingsLayoutShell({
  sections,
  children,
}: SettingsLayoutShellProps) {
  return (
    <div className="flex min-h-full gap-6">
      <aside className="bg-background hidden h-fit w-64 shrink-0 rounded-xl border p-4 md:sticky md:top-4 md:block 3xl:w-72">
        <SettingsNav sections={sections} />
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
