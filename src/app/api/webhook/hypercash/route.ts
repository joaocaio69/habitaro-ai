import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const secret = process.env.HYPERCASH_WEBHOOK_SECRET
  if (secret && request.nextUrl.searchParams.get('secret') !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  console.log('[hypercash-webhook] received:', JSON.stringify(body))

  const data = body.data as Record<string, unknown> | undefined
  const status = (data?.status as string | undefined)?.toLowerCase()

  // Accept both transaction and subscription events when status is paid
  if (status !== 'paid') return Response.json({ ok: true })

  const transactionId = (body.objectId ?? data?.id) as string | undefined
  const customer = data?.customer as Record<string, unknown> | undefined
  const email = customer?.email as string | undefined

  if (!email || !transactionId) {
    console.warn('[hypercash-webhook] missing email or transactionId:', { email, transactionId })
    return Response.json({ ok: true })
  }

  const supabase = createAdminClient()

  // Idempotency — skip if already processed
  const { data: existing } = await supabase
    .from('pending_invitations')
    .select('id')
    .eq('stripe_session_id', transactionId)
    .maybeSingle()

  if (existing) return Response.json({ ok: true })

  const { data: invitation, error } = await supabase
    .from('pending_invitations')
    .insert({ email, stripe_session_id: transactionId })
    .select('token')
    .single()

  if (error || !invitation) {
    console.error('[hypercash-webhook] failed to create invitation:', error?.message)
    return Response.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  try {
    await sendInvitationEmail(email, invitation.token)
  } catch (e) {
    console.error('[hypercash-webhook] failed to send email:', e)
  }

  return Response.json({ ok: true })
}
