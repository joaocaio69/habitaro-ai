import { createClient } from '@/lib/supabase/server'
import { ClientsView } from '@/components/clients/clients-view'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const status = typeof sp.status === 'string' ? sp.status : undefined
  const source = typeof sp.source === 'string' ? sp.source : undefined
  const search = typeof sp.search === 'string' ? sp.search : undefined
  const page = Math.max(1, Number(sp.page ?? 1))
  const limit = 20

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
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (status) q = q.eq('status', status)
      if (source) q = q.eq('source', source)
      if (search) q = q.ilike('full_name', `%${search}%`)

      return q
    })(),
  ])

  return (
    <ClientsView
      clients={filteredResult.data ?? []}
      total={filteredResult.count ?? 0}
      page={page}
      limit={limit}
      stats={{
        leads: leads ?? 0,
        active: active ?? 0,
        converted: converted ?? 0,
        lost: lost ?? 0,
      }}
      filters={{ status, source, search }}
    />
  )
}
