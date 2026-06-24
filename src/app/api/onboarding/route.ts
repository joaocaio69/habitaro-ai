import { requireAuth, ok, err } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { user, supabase } = await requireAuth()
  if (!user || !supabase) return err('Unauthorized', 401)

  // Verify the user registered via a paid invitation
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('pending_invitations')
    .select('id')
    .eq('email', authUser?.email ?? '')
    .not('used_at', 'is', null)
    .maybeSingle()

  if (!invitation) return err('Acesso não autorizado. Assine um plano para continuar.', 403)

  const { name, cnpj, phone, city, state } = await request.json()
  if (!name?.trim()) return err('Nome é obrigatório.', 400)

  // Chama função SECURITY DEFINER — bypassa RLS e garante auth.uid() válido
  const { data: agencyId, error } = await supabase.rpc('create_agency_for_user', {
    p_name:  name,
    p_cnpj:  cnpj  || null,
    p_phone: phone || null,
    p_city:  city  || null,
    p_state: state || null,
  })

  if (error) return err(error.message, 500)

  return ok({ agency_id: agencyId })
}
