import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ALLOWED_FIELDS = [
  'title', 'transaction_type', 'status', 'type_id', 'description', 'internal_code',
  'is_exclusive',
  'zip_code', 'address', 'number', 'complement', 'neighborhood', 'city', 'state',
  'price', 'condo_fee', 'iptu_yearly', 'area_total', 'area_useful',
  'bedrooms', 'suites', 'bathrooms', 'parking_spots', 'floor', 'total_floors', 'amenities',
  'owner_name', 'owner_phone', 'owner_email', 'broker_id',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_types(name), property_images(*)')
    .eq('id', id)
    .single()

  if (error) return err('Property not found', 404)
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
    .from('properties')
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
  const { error } = await supabase.from('properties').delete().eq('id', id)

  if (error) return err(error.message, 400)
  return new Response(null, { status: 204 })
}
