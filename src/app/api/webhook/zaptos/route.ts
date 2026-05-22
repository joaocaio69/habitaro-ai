import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── helpers ────────────────────────────────────────────────
function phoneFromJid(jid: string) {
  return jid.split('@')[0]
}

function isGroupJid(jid: string) {
  return jid.endsWith('@g.us') || jid === 'status@broadcast'
}

type MsgObj = Record<string, unknown>

function extractContent(message: MsgObj): { content: string | null; type: string } {
  if (!message) return { content: null, type: 'text' }
  if (typeof message.conversation === 'string') return { content: message.conversation, type: 'text' }
  const ext = message.extendedTextMessage as MsgObj | undefined
  if (typeof ext?.text === 'string') return { content: ext.text, type: 'text' }
  if (message.imageMessage) return { content: ((message.imageMessage as MsgObj).caption as string) || null, type: 'image' }
  if (message.videoMessage) return { content: ((message.videoMessage as MsgObj).caption as string) || null, type: 'video' }
  if (message.audioMessage) return { content: null, type: 'audio' }
  if (message.documentMessage) return { content: ((message.documentMessage as MsgObj).fileName as string) || null, type: 'document' }
  if (message.stickerMessage) return { content: null, type: 'sticker' }
  return { content: null, type: 'other' }
}

function mapStatus(raw: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    SERVER_ACK: 'sent',
    DELIVERY_ACK: 'delivered',
    READ: 'read',
    ERROR: 'failed',
  }
  return map[raw] ?? 'sent'
}

// ── route ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return Response.json({ ok: true }) }

  const event = body.event as string | undefined
  const instanceName = body.instance as string | undefined
  const data = body.data as MsgObj | undefined

  if (!event || !instanceName) return Response.json({ ok: true })

  const supabase = createAdminClient()

  // ── connection status ──────────────────────────────────
  if (event === 'connection.update') {
    const state = (data?.state as string) ?? ''
    const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected'
    const meId = ((data?.me as MsgObj)?.id as string) ?? ''
    const phone = meId ? phoneFromJid(meId) : undefined

    await supabase
      .from('zaptos_instances')
      .update({ status, ...(phone ? { phone_number: phone } : {}) })
      .eq('instance_name', instanceName)

    return Response.json({ ok: true })
  }

  // ── new message ────────────────────────────────────────
  if (event === 'messages.upsert') {
    const key = data?.key as MsgObj | undefined
    const remoteJid = key?.remoteJid as string | undefined
    if (!remoteJid || isGroupJid(remoteJid)) return Response.json({ ok: true })

    const fromMe = Boolean(key?.fromMe)
    const messageId = key?.id as string | undefined
    const contactJid = remoteJid
    const contactPhone = phoneFromJid(contactJid)
    const contactName = (data?.pushName as string) || null
    const { content, type } = extractContent((data?.message as MsgObj) ?? {})
    const rawTs = data?.messageTimestamp
    const timestamp = rawTs
      ? new Date(Number(rawTs) * 1000).toISOString()
      : new Date().toISOString()
    const status = fromMe ? mapStatus((data?.status as string) ?? 'PENDING') : 'read'

    // Find instance
    const { data: instance } = await supabase
      .from('zaptos_instances')
      .select('id, agency_id')
      .eq('instance_name', instanceName)
      .single()

    if (!instance) return Response.json({ ok: true })

    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, unread_count, client_id')
      .eq('instance_id', instance.id)
      .eq('contact_jid', contactJid)
      .single()

    let conversationId: string

    if (existing) {
      conversationId = existing.id
      await supabase
        .from('conversations')
        .update({
          last_message_at: timestamp,
          last_message_preview: content,
          ...(contactName ? { contact_name: contactName } : {}),
          ...(!fromMe ? { unread_count: (existing.unread_count ?? 0) + 1 } : {}),
        })
        .eq('id', existing.id)
    } else {
      // Try to match existing CRM client by phone (last 8 digits)
      const tail = contactPhone.slice(-8)
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', instance.agency_id)
        .ilike('phone', `%${tail}`)
        .limit(1)
        .maybeSingle()

      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agency_id: instance.agency_id,
          instance_id: instance.id,
          contact_jid: contactJid,
          contact_phone: contactPhone,
          contact_name: contactName,
          client_id: client?.id ?? null,
          last_message_at: timestamp,
          last_message_preview: content,
          unread_count: fromMe ? 0 : 1,
        })
        .select('id')
        .single()

      if (!newConv) return Response.json({ ok: true })
      conversationId = newConv.id
    }

    // Insert message (idempotent via unique zaptos_message_id)
    if (messageId) {
      await supabase.from('messages').upsert(
        {
          conversation_id: conversationId,
          zaptos_message_id: messageId,
          from_me: fromMe,
          content,
          type,
          status,
          timestamp,
        },
        { onConflict: 'zaptos_message_id', ignoreDuplicates: true }
      )
    }

    return Response.json({ ok: true })
  }

  // ── message status updates ─────────────────────────────
  if (event === 'messages.update') {
    const updates = (Array.isArray(data) ? data : [data]) as MsgObj[]
    for (const u of updates) {
      const msgId = ((u?.key as MsgObj)?.id) as string | undefined
      const newStatus = ((u?.update as MsgObj)?.status) as string | undefined
      if (!msgId || !newStatus) continue
      await supabase
        .from('messages')
        .update({ status: mapStatus(newStatus) })
        .eq('zaptos_message_id', msgId)
    }
    return Response.json({ ok: true })
  }

  return Response.json({ ok: true })
}
