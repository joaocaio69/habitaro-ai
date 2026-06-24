'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CalendarCheck,
  MessageCircle,
  Plug,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clients',     label: 'Clientes',     icon: Users },
  { href: '/properties',  label: 'Imóveis',      icon: Building2 },
  { href: '/deals',       label: 'Negociações',  icon: Handshake },
  { href: '/agenda',      label: 'Agenda',        icon: CalendarCheck },
  { href: '/chat',         label: 'Chat',          icon: MessageCircle },
  { href: '/integrations', label: 'Integrações',   icon: Plug },
]

export function Sidebar() {
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  return (
    <aside className="w-60 border-r bg-card flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="font-bold text-lg tracking-tight">Habitaro AI</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={() => startTransition(() => {})}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t">
        <Link
          href="/settings"
          prefetch
          onClick={() => startTransition(() => {})}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
