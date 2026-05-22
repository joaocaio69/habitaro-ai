'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CalendarCheck,
  MessageCircle,
  Plug,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-60 border-r bg-card flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="font-bold text-lg tracking-tight">Habitaro AI</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
