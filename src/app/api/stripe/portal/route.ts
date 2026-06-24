import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { err } from '@/lib/api'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://habitaro-ai.vercel.app'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Não autenticado', 401)

  const stripe = getStripe()

  // Find Stripe customer by email
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  const customer = customers.data[0]
  if (!customer) return err('Nenhuma assinatura encontrada', 404)

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${SITE}/settings`,
  })

  return Response.json({ url: session.url })
}
