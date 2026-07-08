import { createClient } from '@/lib/supabase/server'
import { ClientsView } from '@/components/clients/clients-view'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const str = (k: string) => typeof sp[k] === 'string' ? sp[k] as string : undefined

  const status    = str('status')
  const source    = str('source')
  const search    = str('search')
  const intent    = str('intent')
  const propType  = str('prop_type')
  const location  = str('location')
  const dateRange = str('date_range')
  const dateFrom  = str('date_from')
  const dateTo    = str('date_to')
  const sort      = str('sort') ?? 'newest'
  const budgetMin = str('budget_min') && !isNaN(Number(str('budget_min'))) ? Number(str('budget_min')) : undefined
  const budgetMax = str('budget_max') && !isNaN(Number(str('budget_max'))) ? Number(str('budget_max')) : undefined
  const page      = Math.max(1, Number(sp.page ?? 1))
  const limit     = 20

  const supabase = await createClient()

  const [
    { count: leads },
    { count: active },
    { count: converted },
    { count: lost },
    filteredResult,
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'lead'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'lost'),
    (() => {
      let q = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .range((page - 1) * limit, page * limit - 1)

      if (status)   q = q.eq('status', status)
      if (source)   q = q.eq('source', source)
      if (intent)   q = q.eq('intent', intent)
      if (propType) q = q.ilike('preferred_type', `%${propType}%`)
      if (location) q = q.ilike('preferred_location', `%${location}%`)
      if (budgetMin !== undefined) q = q.gte('budget_max', budgetMin)
      if (budgetMax !== undefined) q = q.lte('budget_min', budgetMax)

      if (search) {
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      if (dateRange === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7)
        q = q.gte('created_at', d.toISOString())
      } else if (dateRange === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30)
        q = q.gte('created_at', d.toISOString())
      } else if (dateRange === 'custom') {
        if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString())
        if (dateTo) {
          const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
          q = q.lte('created_at', end.toISOString())
        }
      }

      switch (sort) {
        case 'oldest':      q = q.order('created_at', { ascending: true }); break
        case 'budget_desc': q = q.order('budget_max', { ascending: false, nullsFirst: false }); break
        case 'budget_asc':  q = q.order('budget_min', { ascending: true, nullsFirst: false }); break
        case 'name_asc':    q = q.order('full_name',  { ascending: true }); break
        case 'no_contact':  q = q.order('updated_at', { ascending: true }); break
        default:            q = q.order('created_at', { ascending: false }); break
      }

      return q
    })(),
  ])

  return (
    <ClientsView
      clients={filteredResult.data ?? []}
      total={filteredResult.count ?? 0}
      page={page}
      limit={limit}
      stats={{ leads: leads ?? 0, active: active ?? 0, converted: converted ?? 0, lost: lost ?? 0 }}
      filters={{ status, source, search, intent, propType, location, budgetMin: budgetMin?.toString(), budgetMax: budgetMax?.toString(), dateRange, dateFrom, dateTo, sort }}
    />
  )
}
