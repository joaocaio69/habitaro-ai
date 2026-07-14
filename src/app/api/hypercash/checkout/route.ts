import { type NextRequest } from 'next/server'
import { hypercashFetch } from '@/lib/hypercash'
import { ok, err } from '@/lib/api'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://habitaro-ai.vercel.app'
const PLAN_AMOUNT = 14700 // R$147,00 em centavos

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email : undefined

  try {
    const secret = process.env.HYPERCASH_WEBHOOK_SECRET
    const postbackUrl = `${SITE}/api/webhook/hypercash${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`

    const transaction = await hypercashFetch<Record<string, unknown>>('/api/user/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount: PLAN_AMOUNT,
        paymentMethod: 'CREDIT_CARD',
        ...(email ? { customer: { email } } : {}),
        items: [
          {
            title: 'Habitaro AI Pro — Plano Mensal',
            unitPrice: PLAN_AMOUNT,
            quantity: 1,
            tangible: false,
          },
        ],
        postbackUrl,
        successUrl: `${SITE}/pagamento/sucesso`,
        cancelUrl: `${SITE}/planos`,
      }),
    })

    // Hypercash may return the URL under different field names
    const checkoutUrl =
      transaction.checkoutUrl ??
      transaction.checkout_url ??
      transaction.paymentUrl ??
      transaction.payment_url ??
      (transaction.links as Record<string, string> | undefined)?.checkout ??
      transaction.url

    if (!checkoutUrl) {
      console.error('[hypercash-checkout] no checkout URL in response:', JSON.stringify(transaction))
      return err('Gateway não retornou URL de pagamento', 500)
    }

    return ok({ url: checkoutUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar sessão de pagamento'
    return err(msg, 500)
  }
}
