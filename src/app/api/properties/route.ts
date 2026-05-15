import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

export async function GET(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const transaction_type = searchParams.get('transaction_type')
  const city = searchParams.get('city')
  const broker_id = searchParams.get('broker_id')
  const search = searchParams.get('search')
  const min_price = searchParams.get('min_price')
  const max_price = searchParams.get('max_price')
  const bedrooms = searchParams.get('bedrooms')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const from = (page - 1) * limit

  let query = supabase
    .from('properties')
    .select('*, property_types(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  if (transaction_type) query = query.eq('transaction_type', transaction_type)
  if (city) query = query.ilike('city', `%${city}%`)
  if (broker_id) query = query.eq('broker_id', broker_id)
  if (min_price) query = query.gte('price', Number(min_price))
  if (max_price) query = query.lte('price', Number(max_price))
  if (bedrooms) query = query.eq('bedrooms', Number(bedrooms))
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return ok({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const body = await request.json()
  const { title, transaction_type, status, type_id, description, internal_code,
    zip_code, address, number, complement, neighborhood, city, state,
    price, condo_fee, iptu_yearly, area_total, area_useful,
    bedrooms, suites, bathrooms, parking_spots, floor, total_floors, amenities,
    owner_name, owner_phone, owner_email, broker_id } = body

  if (!title?.trim()) return err('title is required', 400)
  if (!transaction_type) return err('transaction_type is required', 400)

  const { is_exclusive } = body

  const { data, error } = await supabase
    .from('properties')
    .insert({
      agency_id: profile.agency_id,
      broker_id: broker_id ?? (user as { id: string }).id,
      title, transaction_type, status, type_id, description, internal_code,
      is_exclusive: is_exclusive ?? false,
      zip_code, address, number, complement, neighborhood, city, state,
      price, condo_fee, iptu_yearly, area_total, area_useful,
      bedrooms, suites, bathrooms, parking_spots, floor, total_floors,
      amenities: amenities ?? [],
      owner_name, owner_phone, owner_email,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
