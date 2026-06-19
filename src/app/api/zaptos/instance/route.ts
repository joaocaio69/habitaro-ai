import { type NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ZAPTOS_BASE = 'https://api.zaptos.com.br'

// GET — return current instance (status + config)
export async function GET() {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { data, error } = await supabase
    .from('zaptos_instances')
    .select('id, instance_name, status, phone_number, created_at')
    .eq('agency_id', profile.agency_id)
    .maybeSingle()

  if (error) return err(error.message, 500)
  return ok(data)
}

// POST — create or update instance connection
export async function POST(request: NextRequest) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const body = await request.json()
  const { instance_name, token } = body as { instance_name: string; token: string }

  if (!instance_name?.trim()) return err('instance_name is required', 400)
  if (!token?.trim()) return err('token is required', 400)

  // Verify token against ZaptoWPP (check connection status)
  let remoteStatus = 'disconnected'
  try {
    const res = await fetch(`${ZAPTOS_BASE}/instance/status`, {
      headers: { token, 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      const json = await res.json() as Record<string, unknown>
      const status = json?.status as Record<string, unknown> | undefined
      if (status?.connected) remoteStatus = 'connected'
    }
  } catch { /* ignore — save anyway */ }

  // Upsert instance
  const { data, error } = await supabase
    .from('zaptos_instances')
    .upsert(
      {
        agency_id: profile.agency_id,
        instance_name: instance_name.trim(),
        token: token.trim(),
        status: remoteStatus,
      },
      { onConflict: 'agency_id' }
    )
    .select('id, instance_name, status, phone_number')
    .single()

  if (error) return err(error.message, 500)

  // Register webhook at ZaptoWPP (best-effort)
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/webhook/zaptos`
  try {
    await fetch(`${ZAPTOS_BASE}/webhook/set/${instance_name}`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        events: ['messages.upsert', 'messages.update', 'connection.update'],
      }),
    })
  } catch { /* non-fatal */ }

  return ok(data, 201)
}

// DELETE — disconnect / remove instance
export async function DELETE() {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { data: instance } = await supabase
    .from('zaptos_instances')
    .select('instance_name, token')
    .eq('agency_id', profile.agency_id)
    .maybeSingle()

  if (instance) {
    // Best-effort: disable webhook
    try {
      await fetch(`${ZAPTOS_BASE}/webhook/set/${instance.instance_name}`, {
        method: 'POST',
        headers: { token: instance.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
    } catch { /* ignore */ }
  }

  const { error } = await supabase
    .from('zaptos_instances')
    .delete()
    .eq('agency_id', profile.agency_id)

  if (error) return err(error.message, 500)
  return ok({ deleted: true })
}
