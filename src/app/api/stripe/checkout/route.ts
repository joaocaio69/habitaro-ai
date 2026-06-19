import { type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { ok, err } from '@/lib/api'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://habitaro-ai.vercel.app'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email : undefined

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...(email ? { customer_email: email } : {}),
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${SITE}/pagamento/sucesso`,
      cancel_url: `${SITE}/planos`,
      allow_promotion_codes: true,
    })

    return ok({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar sessão de pagamento'
    return err(msg, 500)
  }
}
