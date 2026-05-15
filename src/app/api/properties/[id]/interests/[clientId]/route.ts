import type { NextRequest } from 'next/server'
import { requireAuth, err } from '@/lib/api'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id: property_id, clientId: client_id } = await params
  const { error } = await supabase
    .from('client_property_interests')
    .delete()
    .eq('property_id', property_id)
    .eq('client_id', client_id)

  if (error) return err(error.message, 400)
  return new Response(null, { status: 204 })
}
