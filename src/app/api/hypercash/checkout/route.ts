import { ok, err } from '@/lib/api'

export async function POST() {
  const url = process.env.HYPERCASH_CHECKOUT_URL
  if (!url) return err('HYPERCASH_CHECKOUT_URL não configurada', 500)
  return ok({ url })
}
