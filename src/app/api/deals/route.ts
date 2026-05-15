import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

export async function GET(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const stage_id = searchParams.get('stage_id')
  const broker_id = searchParams.get('broker_id')
  const client_id = searchParams.get('client_id')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const from = (page - 1) * limit

  let query = supabase
    .from('deals')
    .select('*, clients(full_name, phone), properties(title, address), pipeline_stages(name, color)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  if (stage_id) query = query.eq('stage_id', stage_id)
  if (broker_id) query = query.eq('broker_id', broker_id)
  if (client_id) query = query.eq('client_id', client_id)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return ok({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const body = await request.json()
  const { title, client_id, stage_id, property_id, value, commission_pct,
    commission_value, expected_close_date, notes, broker_id } = body

  if (!title?.trim()) return err('title is required', 400)
  if (!client_id) return err('client_id is required', 400)
  if (!stage_id) return err('stage_id is required', 400)

  const { data, error } = await supabase
    .from('deals')
    .insert({
      agency_id: profile.agency_id,
      broker_id: broker_id ?? (user as { id: string }).id,
      title, client_id, stage_id, property_id, value, commission_pct,
      commission_value, expected_close_date, notes,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
