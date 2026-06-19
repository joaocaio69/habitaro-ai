import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/api'

// GET — validate token and return email
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('pending_invitations')
    .select('email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) return err('Link inválido.', 400)
  if (data.used_at) return err('Este link já foi utilizado.', 400)
  if (new Date(data.expires_at) < new Date()) return err('Link expirado.', 400)

  return ok({ email: data.email })
}

// POST — mark token as used after successful registration
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  await supabase
    .from('pending_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)

  return ok({ ok: true })
}
