import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KanbanBoard } from '@/components/deals/kanban-board'
import type { PipelineStage, Deal } from '@/types/database'

interface DealWithRelations extends Deal {
  clients: { full_name: string; phone: string | null } | null
  properties: { title: string; address: string | null } | null
  pipeline_stages: { name: string; color: string } | null
}

export default async function DealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const [stagesResult, dealsResult] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('*')
      .order('sort_order'),
    supabase
      .from('deals')
      .select('*, clients(full_name, phone), properties(title, address), pipeline_stages(name, color)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ])

  const stages = (stagesResult.data ?? []) as PipelineStage[]
  const deals = (dealsResult.data ?? []) as DealWithRelations[]

  return (
    <KanbanBoard
      stages={stages}
      initialDeals={deals}
    />
  )
}
