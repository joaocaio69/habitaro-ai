import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PropertiesView } from '@/components/properties/properties-view'

interface SearchParams {
  status?: string
  transaction_type?: string
  search?: string
  bedrooms?: string
  exclusive?: string
  match_client?: string
  page?: string
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const sp = await searchParams
  const status = sp.status ?? ''
  const transaction_type = sp.transaction_type ?? ''
  const search = sp.search ?? ''
  const bedrooms = sp.bedrooms ?? ''
  const exclusive = sp.exclusive ?? ''
  const matchClientId = sp.match_client ?? ''
  const page = Math.max(1, Number(sp.page ?? 1))
  const limit = 12

  // Fetch client profile for "compatible properties" feature
  let matchClient: { id: string; full_name: string; preferred_type: string | null; preferred_location: string | null; preferred_bedrooms: number | null; budget_max: number | null } | null = null
  if (matchClientId) {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, preferred_type, preferred_location, preferred_bedrooms, budget_max')
      .eq('id', matchClientId)
      .single()
    matchClient = data
  }

  // Stats (all properties, RLS filters by agency)
  const { data: allProps } = await supabase.from('properties').select('status')
  const stats = {
    total:       allProps?.length ?? 0,
    available:   allProps?.filter(p => p.status === 'available').length ?? 0,
    negotiating: allProps?.filter(p => p.status === 'negotiating').length ?? 0,
    sold:        allProps?.filter(p => p.status === 'sold').length ?? 0,
    rented:      allProps?.filter(p => p.status === 'rented').length ?? 0,
  }

  // Filtered list
  const from = (page - 1) * limit
  let query = supabase
    .from('properties')
    .select('*, property_types(name), property_images(id, url, is_cover, sort_order)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  if (transaction_type) query = query.eq('transaction_type', transaction_type)
  if (exclusive === '1') query = query.eq('is_exclusive', true)
  if (bedrooms) query = query.eq('bedrooms', Number(bedrooms))
  if (search) query = query.ilike('title', `%${search}%`)

  // Apply client profile filters
  if (matchClient) {
    if (matchClient.preferred_bedrooms) query = query.eq('bedrooms', matchClient.preferred_bedrooms)
    if (matchClient.budget_max) query = query.lte('price', matchClient.budget_max)
    if (matchClient.preferred_location) query = query.ilike('city', `%${matchClient.preferred_location}%`)
  }

  const { data: properties, count } = await query

  return (
    <PropertiesView
      properties={(properties ?? []) as Parameters<typeof PropertiesView>[0]['properties']}
      total={count ?? 0}
      page={page}
      limit={limit}
      stats={stats}
      agencyId={profile.agency_id}
      matchClient={matchClient}
      filters={{ status, transaction_type, search, bedrooms, exclusive }}
    />
  )
}
