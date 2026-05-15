import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ALLOWED_FIELDS = [
  'title', 'client_id', 'property_id', 'broker_id', 'stage_id', 'status',
  'value', 'commission_pct', 'commission_value', 'expected_close_date',
  'closed_at', 'lost_reason', 'notes',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { data, error } = await supabase
    .from('deals')
    .select('*, clients(full_name, phone, email), properties(title, address, price), pipeline_stages(name, color, is_won, is_lost)')
    .eq('id', id)
    .single()

  if (error) return err('Deal not found', 404)
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

  // Auto-set closed_at when status changes to won or lost
  if (patch.status === 'won' || patch.status === 'lost') {
    patch.closed_at = patch.closed_at ?? new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return err(error.message, 400)
  return ok(data)
}
