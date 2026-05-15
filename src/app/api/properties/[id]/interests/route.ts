import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { data, error } = await supabase
    .from('client_property_interests')
    .select('*, clients(id, full_name, phone, email, status)')
    .eq('property_id', id)
    .order('created_at', { ascending: false })

  if (error) return err(error.message, 500)
  return ok(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id: property_id } = await params
  const { client_id, notes } = await request.json()
  if (!client_id) return err('client_id is required', 400)

  const { data, error } = await supabase
    .from('client_property_interests')
    .upsert({ client_id, property_id, notes: notes ?? null }, { onConflict: 'client_id,property_id' })
    .select('*, clients(id, full_name, phone, email, status)')
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
