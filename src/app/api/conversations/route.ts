import { requireAuth, ok, err } from '@/lib/api'

export async function GET() {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { data, error } = await supabase
    .from('conversations')
    .select('*, clients(full_name, phone)')
    .eq('agency_id', profile.agency_id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) return err(error.message, 500)
  return ok(data)
}
