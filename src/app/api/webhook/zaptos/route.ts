import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type MsgObj = Record<string, unknown>

function phoneFromJid(jid: string) {
  return jid.split('@')[0]
}

function isGroupJid(jid: string) {
  return jid.endsWith('@g.us') || jid === 'status@broadcast'
}

function extractContent(msg: MsgObj): { content: string | null; type: string } {
  const text = msg.text as string | undefined
  const mediaType = msg.mediaType as string | undefined
  const type = (msg.type as string) || 'text'

  if (text) return { content: text, type: 'text' }
  if (mediaType === 'image') return { content: null, type: 'image' }
  if (mediaType === 'video') return { content: null, type: 'video' }
  if (mediaType === 'audio' || mediaType === 'ptt') return { content: null, type: 'audio' }
  if (mediaType === 'document') return { content: null, type: 'document' }
  if (type === 'sticker') return { content: null, type: 'sticker' }
  return { content: null, type: 'text' }
}

export async function POST(request: NextRequest) {
  let body: MsgObj
  try { body = await request.json() } catch { return Response.json({ ok: true }) }

  // uazapiGO format: EventType + instanceName
  const eventType = body.EventType as string | undefined
  const instanceName = (body.instanceName as string | undefined)

  if (!eventType || !instanceName) return Response.json({ ok: true })

  const supabase = createAdminClient()

  // ── connection status ──────────────────────────────────
  if (eventType === 'connection') {
    const state = (body.state as string) ?? ''
    const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected'
    await supabase
      .from('zaptos_instances')
      .update({ status })
      .eq('instance_name', instanceName)
    return Response.json({ ok: true })
  }

  // ── new message ────────────────────────────────────────
  if (eventType === 'messages') {
    const message = body.message as MsgObj | undefined
    const chat = body.chat as MsgObj | undefined

    if (!message) return Response.json({ ok: true })

    const contactJid = message.chatid as string | undefined
    if (!contactJid || isGroupJid(contactJid) || Boolean(message.isGroup)) {
      return Response.json({ ok: true })
    }

    const fromMe = Boolean(message.fromMe)
    const messageId = message.messageid as string | undefined
    const contactPhone = phoneFromJid(contactJid)
    const contactName = (chat?.wa_contactName as string) || (chat?.wa_name as string) || null
    const { content, type } = extractContent(message)
    const rawTs = message.messageTimestamp
    // uazapiGO sends timestamp already in milliseconds
    const timestamp = rawTs ? new Date(Number(rawTs)).toISOString() : new Date().toISOString()
    const msgStatus = fromMe ? 'pending' : 'read'

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
      const tail = contactPhone.slice(-8)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', instance.agency_id)
        .ilike('phone', `%${tail}`)
        .limit(1)
        .maybeSingle()

      let clientId = existingClient?.id ?? null

      if (!fromMe && !clientId) {
        const displayName = contactName || `+${contactPhone}`
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            agency_id: instance.agency_id,
            full_name: displayName,
            phone: contactPhone,
            status: 'lead',
            source: 'whatsapp',
          })
          .select('id')
          .single()
        clientId = newClient?.id ?? null
      }

      if (!fromMe && clientId) {
        const { data: firstStage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('agency_id', instance.agency_id)
          .eq('is_won', false)
          .eq('is_lost', false)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstStage) {
          await supabase.from('deals').insert({
            agency_id: instance.agency_id,
            client_id: clientId,
            stage_id: firstStage.id,
            title: contactName ? `WhatsApp — ${contactName}` : `WhatsApp — +${contactPhone}`,
            status: 'open',
          })
        }
      }

      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agency_id: instance.agency_id,
          instance_id: instance.id,
          contact_jid: contactJid,
          contact_phone: contactPhone,
          contact_name: contactName,
          client_id: clientId,
          last_message_at: timestamp,
          last_message_preview: content,
          unread_count: fromMe ? 0 : 1,
        })
        .select('id')
        .single()

      if (!newConv) return Response.json({ ok: true })
      conversationId = newConv.id
    }

    if (messageId) {
      await supabase.from('messages').upsert(
        {
          conversation_id: conversationId,
          zaptos_message_id: messageId,
          from_me: fromMe,
          content,
          type,
          status: msgStatus,
          timestamp,
        },
        { onConflict: 'zaptos_message_id', ignoreDuplicates: true }
      )
    }

    return Response.json({ ok: true })
  }

  return Response.json({ ok: true })
}
