import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type AuthResult =
  | { user: null; supabase: null; profile: null }
  | { user: NonNullable<unknown>; supabase: SupabaseClient; profile: { id: string; agency_id: string | null; role: string } | null }

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { user: null, supabase: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, agency_id, role')
    .eq('id', user.id)
    .single()

  return { user, supabase, profile }
}

export function ok(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function err(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
