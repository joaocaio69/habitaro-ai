import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ALLOWED_FIELDS = [
  'type', 'status', 'title', 'description', 'deal_id', 'client_id',
  'property_id', 'scheduled_at', 'completed_at', 'broker_id',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { data, error } = await supabase
    .from('activities')
    .select('*, clients(full_name, phone), deals(title), properties(title)')
    .eq('id', id)
    .single()

  if (error) return err('Activity not found', 404)
  return ok(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const body = await request.json()
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )

  if (Object.keys(patch).length === 0) return err('No valid fields to update', 400)

  // Auto-set completed_at when status changes to completed
  if (patch.status === 'completed' && !patch.completed_at) {
    patch.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return err(error.message, 400)
  return ok(data)
}
