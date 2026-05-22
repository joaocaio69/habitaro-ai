import { type NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api'

const ZAPTOS_BASE = 'https://api.zaptos.com.br'

// GET — fetch messages + mark conversation as read
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 200)
  const before = request.nextUrl.searchParams.get('before') // ISO timestamp for pagination

  // Verify conversation belongs to this agency
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('agency_id', profile.agency_id)
    .single()

  if (!conv) return err('Not found', 404)

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('timestamp', before)

  const { data, error } = await query
  if (error) return err(error.message, 500)

  // Reset unread count
  await supabase
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', id)

  return ok((data ?? []).reverse())
}

// POST — send a text message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, profile } = await requireAuth()
  if (!user || !profile?.agency_id) return err('Unauthorized', 401)

  const { id } = await params
  const body = await request.json()
  const text = (body.text as string)?.trim()
  if (!text) return err('text is required', 400)

  // Load conversation + instance token
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, contact_phone, instance_id, zaptos_instances(instance_name, token)')
    .eq('id', id)
    .eq('agency_id', profile.agency_id)
    .single()

  if (!conv) return err('Not found', 404)

  const instance = conv.zaptos_instances as unknown as { instance_name: string; token: string } | null
  if (!instance) return err('Instance not configured', 400)

  // Send via ZaptoWPP
  const zapRes = await fetch(`${ZAPTOS_BASE}/message/sendText/${instance.instance_name}`, {
    method: 'POST',
    headers: { token: instance.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: conv.contact_phone, text }),
  })

  const zapJson = await zapRes.json().catch(() => ({})) as Record<string, unknown>

  if (!zapRes.ok) {
    return err((zapJson.message as string) ?? 'Failed to send message', 502)
  }

  const extKey = zapJson.key as Record<string, unknown> | undefined
  const zapMsgId = (extKey?.id as string) ?? null
  const now = new Date().toISOString()

  // Save message locally
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      zaptos_message_id: zapMsgId,
      from_me: true,
      content: text,
      type: 'text',
      status: 'sent',
      timestamp: now,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)

  // Update conversation preview
  await supabase
    .from('conversations')
    .update({ last_message_at: now, last_message_preview: text })
    .eq('id', id)

  return ok(msg, 201)
}
