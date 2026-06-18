import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGoogleEvent } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const deal_id = searchParams.get('deal_id')
  const client_id = searchParams.get('client_id')
  const broker_id = searchParams.get('broker_id')
  const from_date = searchParams.get('from_date')
  const to_date = searchParams.get('to_date')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500)
  const offset = (page - 1) * limit

  let query = supabase
    .from('activities')
    .select('*, clients(full_name, phone), deals(title)', { count: 'exact' })
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (deal_id) query = query.eq('deal_id', deal_id)
  if (client_id) query = query.eq('client_id', client_id)
  if (broker_id) query = query.eq('broker_id', broker_id)
  if (from_date) query = query.gte('scheduled_at', from_date)
  if (to_date) query = query.lte('scheduled_at', to_date)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return ok({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const body = await request.json()
  const { type, title, description, deal_id, client_id, property_id,
    scheduled_at, broker_id } = body

  if (!title?.trim()) return err('title is required', 400)
  if (!type) return err('type is required', 400)
  if (!deal_id && !client_id) return err('deal_id or client_id is required', 400)

  const { data, error } = await supabase
    .from('activities')
    .insert({
      agency_id: profile.agency_id,
      broker_id: broker_id ?? (user as { id: string }).id,
      type, title, description, deal_id, client_id, property_id, scheduled_at,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)

  // Sync to Google Calendar if user has it connected and activity has a date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actData = data as any
  const userId = (user as { id: string }).id
  if (actData?.scheduled_at) {
    const googleEventId = await createGoogleEvent(userId, {
      title: actData.title,
      description: actData.description,
      scheduled_at: actData.scheduled_at,
    })
    if (googleEventId) {
      await createAdminClient().from('activities').update({
        google_event_id: googleEventId,
        google_calendar_user_id: userId,
      }).eq('id', actData.id)
    }
  }

  return ok(data, 201)
}
