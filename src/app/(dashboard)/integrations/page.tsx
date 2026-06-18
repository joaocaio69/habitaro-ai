import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsView } from '@/components/integrations/integrations-view'
import type { ZaptosInstance } from '@/types/database'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const [{ data: instance }, { data: googleConn }] = await Promise.all([
    supabase
      .from('zaptos_instances')
      .select('id, instance_name, status, phone_number, created_at')
      .eq('agency_id', profile.agency_id)
      .maybeSingle(),
    supabase
      .from('google_calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <IntegrationsView
      instance={(instance ?? null) as ZaptosInstance | null}
      googleConnected={!!googleConn}
    />
  )
}
