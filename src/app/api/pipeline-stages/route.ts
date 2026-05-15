import { requireAuth, ok, err } from '@/lib/api'

export async function GET() {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return err(error.message, 500)
  return ok(data)
}
