import type { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { imageId } = await params
  const { error } = await supabase
    .from('property_images')
    .delete()
    .eq('id', imageId)

  if (error) return err(error.message, 400)
  return new Response(null, { status: 204 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id, imageId } = await params
  const { is_cover } = await request.json()

  if (is_cover) {
    await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', id)
  }

  const { data, error } = await supabase
    .from('property_images')
    .update({ is_cover })
    .eq('id', imageId)
    .select()
    .single()

  if (error) return err(error.message, 400)
  return ok(data)
}
