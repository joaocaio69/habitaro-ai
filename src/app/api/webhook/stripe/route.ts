import { type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return Response.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status !== 'paid') return Response.json({ ok: true })

    const email = session.customer_details?.email ?? session.customer_email
    if (!email) return Response.json({ ok: true })

    const supabase = createAdminClient()

    // Idempotency — skip if already processed
    const { data: existing } = await supabase
      .from('pending_invitations')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existing) return Response.json({ ok: true })

    // Create invitation token
    const { data: invitation, error } = await supabase
      .from('pending_invitations')
      .insert({ email, stripe_session_id: session.id })
      .select('token')
      .single()

    if (error || !invitation) {
      console.error('[stripe-webhook] failed to create invitation:', error?.message)
      return Response.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    try {
      await sendInvitationEmail(email, invitation.token)
    } catch (e) {
      console.error('[stripe-webhook] failed to send email:', e)
    }
  }

  return Response.json({ ok: true })
}
