'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils/utils'

type SettingsNavItem = {
  label: string
  href: string
}

type SettingsNavSection = {
  title: string
  items: SettingsNavItem[]
}

type SettingsNavProps = {
  sections: SettingsNavSection[]
}

function isActivePath(pathname: string, href: string) {
  const [baseHref] = href.split('#')

  if (baseHref === '/dashboard/settings') {
    return pathname === baseHref
  }

  return pathname === baseHref || pathname.startsWith(`${baseHref}/`)
}

export function SettingsNav({ sections }: SettingsNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="text-muted-foreground px-3 text-xs font-semibold uppercase tracking-[0.14em]">
            {section.title}
          </p>
          <nav className="space-y-1">
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </div>
  )
}
