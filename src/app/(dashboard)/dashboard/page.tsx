import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, Building2, CalendarCheck, Clock } from 'lucide-react'
import { VerticalFunnel } from '@/components/dashboard/vertical-funnel'
import { formatCurrency } from '@/lib/format'
import { activityTypeLabel, clientStatusLabel, clientStatusColor } from '@/lib/labels'
import type { ReactNode } from 'react'

function KpiCard({
  icon, label, value, sub, accent,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className={`inline-flex p-2 rounded-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {label}
          {sub ? <span className="ml-1 font-medium text-foreground/70">{sub}</span> : null}
        </p>
      </div>
    </div>
  )
}

interface ActivityRow {
  id: string
  type: string
  title: string
  scheduled_at: string | null
  clients: { full_name: string } | null
}

interface ClientRow {
  id: string
  full_name: string
  phone: string | null
  status: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [
    leadsRes,
    openDealsRes,
    propertiesRes,
    todayActRes,
    stagesRes,
    recentClientsRes,
    upcomingActRes,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', profile.agency_id)
      .eq('status', 'lead'),

    supabase
      .from('deals')
      .select('id, stage_id, value')
      .eq('agency_id', profile.agency_id)
      .eq('status', 'open'),

    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', profile.agency_id)
      .eq('status', 'available'),

    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', profile.agency_id)
      .eq('status', 'pending')
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString()),

    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('sort_order'),

    supabase
      .from('clients')
      .select('id, full_name, phone, status')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('activities')
      .select('id, type, title, scheduled_at, clients(full_name)')
      .eq('agency_id', profile.agency_id)
      .eq('status', 'pending')
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ])

  const stages = stagesRes.data ?? []
  const openDeals = openDealsRes.data ?? []
  const totalOpenValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0)

  const funnelStages = stages
    .filter(s => !s.is_lost)
    .map(s => ({
      id: s.id,
      name: s.name,
      is_won: s.is_won,
      count: openDeals.filter(d => d.stage_id === s.id).length,
    }))

  const recentClients = (recentClientsRes.data ?? []) as unknown as ClientRow[]
  const upcomingActivities = (upcomingActRes.data ?? []) as unknown as ActivityRow[]

  const firstName = profile.full_name?.split(' ')[0] ?? 'Corretor'
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4 text-foreground" />}
          label="Leads ativos"
          value={String(leadsRes.count ?? 0)}
          accent="bg-muted"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-foreground" />}
          label="Negociações abertas"
          value={String(openDeals.length)}
          sub={totalOpenValue > 0 ? `· ${formatCurrency(totalOpenValue)}` : undefined}
          accent="bg-muted"
        />
        <KpiCard
          icon={<Building2 className="h-4 w-4 text-foreground" />}
          label="Imóveis disponíveis"
          value={String(propertiesRes.count ?? 0)}
          accent="bg-muted"
        />
        <KpiCard
          icon={<CalendarCheck className="h-4 w-4 text-foreground" />}
          label="Compromissos hoje"
          value={String(todayActRes.count ?? 0)}
          accent="bg-muted"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-5 items-start">
        {/* Vertical funnel */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Funil de vendas
          </p>
          <VerticalFunnel stages={funnelStages} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming activities */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              Próximos compromissos
            </p>
            {upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 py-6 text-center">
                Nenhum compromisso pendente
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingActivities.map(act => (
                  <div key={act.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="mt-0.5 shrink-0 text-muted-foreground/50">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{act.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activityTypeLabel[act.type] ?? act.type}
                        {act.clients?.full_name ? ` · ${act.clients.full_name}` : ''}
                      </p>
                    </div>
                    {act.scheduled_at && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tabular-nums">
                          {new Date(act.scheduled_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(act.scheduled_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent clients */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              Clientes recentes
            </p>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 py-6 text-center">
                Nenhum cliente cadastrado
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {recentClients.map(client => (
                  <div key={client.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {client.full_name
                          .split(' ')
                          .slice(0, 2)
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone ?? '—'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        clientStatusColor[client.status] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {clientStatusLabel[client.status] ?? client.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
