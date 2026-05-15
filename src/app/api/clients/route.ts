import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

export async function GET(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const broker_id = searchParams.get('broker_id')
  const search = searchParams.get('search')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const from = (page - 1) * limit

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  if (broker_id) query = query.eq('broker_id', broker_id)
  if (search) query = query.ilike('full_name', `%${search}%`)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return ok({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const body = await request.json()
  const { full_name, email, phone, cpf, intent, status, source, budget_min, budget_max, notes,
    preferred_type, preferred_location, preferred_bedrooms, broker_id } = body

  if (!full_name?.trim()) return err('full_name is required', 400)

  const { data, error } = await supabase
    .from('clients')
    .insert({
      agency_id: profile.agency_id,
      broker_id: broker_id ?? (user as { id: string }).id,
      full_name, email, phone, cpf, intent, status, source, budget_min, budget_max, notes,
      preferred_type, preferred_location, preferred_bedrooms,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
