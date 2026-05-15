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
    .from('property_images')
    .select('*')
    .eq('property_id', id)
    .order('sort_order')

  if (error) return err(error.message, 500)
  return ok(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const { url, is_cover, sort_order } = await request.json()
  if (!url) return err('url is required', 400)

  if (is_cover) {
    await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', id)
  }

  const { data, error } = await supabase
    .from('property_images')
    .insert({ property_id: id, url, is_cover: is_cover ?? false, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
