import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ALLOWED_FIELDS = ['full_name', 'email', 'phone', 'cpf', 'intent', 'status', 'source', 'budget_min', 'budget_max', 'notes', 'broker_id', 'preferred_type', 'preferred_location', 'preferred_bedrooms']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return err('Client not found', 404)
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

  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return err(error.message, 400)
  return ok(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) return err(error.message, 400)
  return new Response(null, { status: 204 })
}
