import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgendaView } from '@/components/agenda/agenda-view'
import type { Activity } from '@/types/database'

interface ActivityWithRelations extends Activity {
  clients: { full_name: string; phone: string | null } | null
  deals: { title: string } | null
}

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [pendingResult, historyResult] = await Promise.all([
    supabase
      .from('activities')
      .select('*, clients(full_name, phone), deals(title)')
      .in('status', ['pending'])
      .order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('activities')
      .select('*, clients(full_name, phone), deals(title)')
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(200),
  ])

  return (
    <AgendaView
      initialPending={(pendingResult.data ?? []) as ActivityWithRelations[]}
      initialHistory={(historyResult.data ?? []) as ActivityWithRelations[]}
    />
  )
}
