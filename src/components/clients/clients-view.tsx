'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown, Pencil, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LeadModal } from './lead-modal'
import { clientStatusLabel, clientStatusColor, sourceLabel, intentLabel } from '@/lib/labels'
import { formatBudget, formatDate } from '@/lib/format'
import type { Client, ClientStatus } from '@/types/database'

const STATUS_OPTIONS: ClientStatus[] = ['lead', 'active', 'inactive', 'converted', 'lost']

const DOT_COLOR: Record<string, string> = {
  lead: 'bg-blue-500', active: 'bg-green-500', inactive: 'bg-amber-500',
  converted: 'bg-purple-500', lost: 'bg-red-500',
}

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'lead', label: 'Leads' },
  { value: 'active', label: 'Ativos' },
  { value: 'converted', label: 'Convertidos' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'lost', label: 'Perdidos' },
]

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas as origens' },
  { value: 'portal', label: 'Portal' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Indicação' },
  { value: 'cold_call', label: 'Ligação' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Outro' },
]

const INTENT_OPTIONS = [
  { value: '', label: 'Qualquer intenção' },
  { value: 'buy', label: 'Comprar' },
  { value: 'rent', label: 'Alugar' },
  { value: 'sell', label: 'Vender' },
  { value: 'buy_and_sell', label: 'Comprar e Vender' },
]

const DATE_OPTIONS = [
  { value: '', label: 'Qualquer data' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais recente' },
  { value: 'oldest', label: 'Mais antigo' },
  { value: 'budget_desc', label: 'Maior orçamento' },
  { value: 'budget_asc', label: 'Menor orçamento' },
  { value: 'name_asc', label: 'Nome A→Z' },
  { value: 'no_contact', label: 'Sem contato há mais tempo' },
]

const SELECT_CLS = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring'

function StatusDropdown({ client, onUpdated }: { client: Client; onUpdated: (updated: Client) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<ClientStatus>(client.status)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setCurrentStatus(client.status) }, [client.status])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  async function handleSelect(status: ClientStatus) {
    setOpen(false)
    if (status === currentStatus) return
    setCurrentStatus(status)
    setLoading(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: Client = await res.json()
      onUpdated(updated)
    } else {
      setCurrentStatus(client.status)
    }
    setLoading(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-opacity w-24 ${clientStatusColor[currentStatus]} ${loading ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        {clientStatusLabel[currentStatus]}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg py-1"
          >
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={e => { e.stopPropagation(); handleSelect(s) }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${s === currentStatus ? 'font-semibold' : 'font-normal'}`}
              >
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[s]}`} />
                {clientStatusLabel[s]}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

interface Stats { leads: number; active: number; converted: number; lost: number }
interface Filters {
  status?: string; source?: string; search?: string; intent?: string
  propType?: string; location?: string; budgetMin?: string; budgetMax?: string
  dateRange?: string; dateFrom?: string; dateTo?: string; sort?: string
}
interface Props {
  clients: Client[]; total: number; page: number; limit: number; stats: Stats; filters: Filters
}

type LF = {
  search: string; source: string; intent: string; propType: string; location: string
  budgetMin: string; budgetMax: string; dateRange: string; dateFrom: string; dateTo: string; sort: string
}

function lfFromFilters(f: Filters): LF {
  return {
    search: f.search ?? '', source: f.source ?? '', intent: f.intent ?? '',
    propType: f.propType ?? '', location: f.location ?? '',
    budgetMin: f.budgetMin ?? '', budgetMax: f.budgetMax ?? '',
    dateRange: f.dateRange ?? '', dateFrom: f.dateFrom ?? '', dateTo: f.dateTo ?? '',
    sort: f.sort ?? 'newest',
  }
}

export function ClientsView({ clients, total, page, limit, stats, filters }: Props) {
  const router = useRouter()
  const [localClients, setLocalClients] = useState<Client[]>(clients)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [lf, setLf] = useState<LF>(() => lfFromFilters(filters))
  const hasAdvanced = !!(filters.source || filters.intent || filters.propType || filters.location || filters.budgetMin || filters.budgetMax || filters.dateRange)
  const [filtersOpen, setFiltersOpen] = useState(hasAdvanced)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalClients(clients) }, [clients])
  useEffect(() => { setLf(lfFromFilters(filters)) }, [filters])

  function buildUrl(overrides: Partial<LF & { status: string; page: string }> = {}) {
    const m = { ...lf, status: filters.status ?? '', page: String(page), ...overrides }
    const p = new URLSearchParams()
    if (m.status)    p.set('status', m.status)
    if (m.source)    p.set('source', m.source)
    if (m.search)    p.set('search', m.search)
    if (m.intent)    p.set('intent', m.intent)
    if (m.propType)  p.set('prop_type', m.propType)
    if (m.location)  p.set('location', m.location)
    if (m.budgetMin) p.set('budget_min', m.budgetMin)
    if (m.budgetMax) p.set('budget_max', m.budgetMax)
    if (m.dateRange) {
      p.set('date_range', m.dateRange)
      if (m.dateRange === 'custom') {
        if (m.dateFrom) p.set('date_from', m.dateFrom)
        if (m.dateTo)   p.set('date_to',   m.dateTo)
      }
    }
    if (m.sort && m.sort !== 'newest') p.set('sort', m.sort)
    if (m.page && m.page !== '1') p.set('page', m.page)
    return `/clients?${p.toString()}`
  }

  function debounce(field: keyof LF, value: string) {
    setLf(prev => ({ ...prev, [field]: value }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ [field]: value, page: '1' }))
    }, 350)
  }

  function immediate(overrides: Partial<LF & { status: string; page: string }>) {
    setLf(prev => ({ ...prev, ...overrides }))
    router.push(buildUrl({ ...overrides, page: '1' }))
  }

  // Active chips
  const chips: { key: string; label: string }[] = []
  if (lf.source)    chips.push({ key: 'source',    label: `Origem: ${sourceLabel[lf.source] ?? lf.source}` })
  if (lf.intent)    chips.push({ key: 'intent',    label: `Intenção: ${intentLabel[lf.intent] ?? lf.intent}` })
  if (lf.propType)  chips.push({ key: 'propType',  label: `Tipo: ${lf.propType}` })
  if (lf.location)  chips.push({ key: 'location',  label: `Local: ${lf.location}` })
  if (lf.budgetMin) chips.push({ key: 'budgetMin', label: `Orç. mín: R$${Number(lf.budgetMin).toLocaleString('pt-BR')}` })
  if (lf.budgetMax) chips.push({ key: 'budgetMax', label: `Orç. máx: R$${Number(lf.budgetMax).toLocaleString('pt-BR')}` })
  if (lf.dateRange === '7d')     chips.push({ key: 'date', label: 'Últimos 7 dias' })
  else if (lf.dateRange === '30d')    chips.push({ key: 'date', label: 'Últimos 30 dias' })
  else if (lf.dateRange === 'custom') {
    const from = lf.dateFrom ? new Date(lf.dateFrom + 'T00:00:00').toLocaleDateString('pt-BR') : ''
    const to   = lf.dateTo   ? new Date(lf.dateTo   + 'T00:00:00').toLocaleDateString('pt-BR') : ''
    chips.push({ key: 'date', label: `Data: ${from}${to ? ` – ${to}` : ''}` })
  }

  function removeChip(key: string) {
    const ov: Partial<LF & { status: string; page: string }> = { page: '1' }
    if (key === 'source')    ov.source    = ''
    if (key === 'intent')    ov.intent    = ''
    if (key === 'propType')  ov.propType  = ''
    if (key === 'location')  ov.location  = ''
    if (key === 'budgetMin') ov.budgetMin = ''
    if (key === 'budgetMax') ov.budgetMax = ''
    if (key === 'date')      Object.assign(ov, { dateRange: '', dateFrom: '', dateTo: '' })
    setLf(prev => ({ ...prev, ...ov }))
    router.push(buildUrl(ov))
  }

  function clearAll() {
    const cleared: Partial<LF & { status: string; page: string }> = {
      status: '', source: '', search: '', intent: '', propType: '', location: '',
      budgetMin: '', budgetMax: '', dateRange: '', dateFrom: '', dateTo: '', page: '1',
    }
    setLf(prev => ({ ...prev, ...cleared }))
    router.push(buildUrl(cleared))
  }

  const totalPages = Math.ceil(total / limit)
  const activeFilterCount = chips.length + (filters.status ? 1 : 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes & Leads</h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? 'resultado' : 'resultados'}
            {activeFilterCount > 0 && <span className="ml-1 text-primary font-medium">({activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'})</span>}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Leads', value: stats.leads, status: 'lead' },
          { label: 'Ativos', value: stats.active, status: 'active' },
          { label: 'Convertidos', value: stats.converted, status: 'converted' },
          { label: 'Perdidos', value: stats.lost, status: 'lost' },
        ].map(({ label, value, status }) => (
          <Link key={status} href={buildUrl({ status, page: '1' })}
            className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 hover:bg-muted/50 transition-colors">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </Link>
        ))}
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap flex-1">
            {STATUS_TABS.map(({ value, label }) => (
              <Link key={value} href={buildUrl({ status: value, page: '1' })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  (filters.status ?? '') === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Sort */}
          <select
            value={lf.sort}
            onChange={e => immediate({ sort: e.target.value })}
            className={SELECT_CLS + ' w-auto'}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-sm font-medium transition-colors ${
              filtersOpen || chips.length > 0
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {chips.length > 0 && (
              <span className="ml-0.5 bg-primary-foreground text-primary rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {chips.length}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Nome, e-mail ou telefone..."
              value={lf.search}
              onChange={e => debounce('search', e.target.value)}
              className="pl-8 w-56"
            />
            {lf.search && (
              <button onClick={() => { setLf(p => ({ ...p, search: '' })); router.push(buildUrl({ search: '', page: '1' })) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Advanced filter panel */}
        {filtersOpen && (
          <div className="rounded-xl border border-border bg-card/50 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Source */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Origem</label>
              <select value={lf.source} onChange={e => immediate({ source: e.target.value })} className={SELECT_CLS}>
                {SOURCE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {/* Intent */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Intenção</label>
              <select value={lf.intent} onChange={e => immediate({ intent: e.target.value })} className={SELECT_CLS}>
                {INTENT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {/* Property type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de imóvel</label>
              <Input
                placeholder="Ex: Apartamento"
                value={lf.propType}
                onChange={e => debounce('propType', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Localização</label>
              <Input
                placeholder="Ex: Pinheiros"
                value={lf.location}
                onChange={e => debounce('location', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Budget min */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Orçamento mínimo (R$)</label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 200000"
                value={lf.budgetMin}
                onChange={e => debounce('budgetMin', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Budget max */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Orçamento máximo (R$)</label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 800000"
                value={lf.budgetMax}
                onChange={e => debounce('budgetMax', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Criado em</label>
              <select value={lf.dateRange} onChange={e => immediate({ dateRange: e.target.value })} className={SELECT_CLS}>
                {DATE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {/* Custom date range */}
            {lf.dateRange === 'custom' && (
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Período</label>
                <div className="flex gap-1.5 items-center">
                  <Input
                    type="date"
                    value={lf.dateFrom}
                    onChange={e => immediate({ dateFrom: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-xs">até</span>
                  <Input
                    type="date"
                    value={lf.dateTo}
                    onChange={e => immediate({ dateTo: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(({ key, label }) => (
              <span key={key}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
                {label}
                <button onClick={() => removeChip(key)} className="hover:text-primary/60 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contato</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Origem</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Intenção</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Orçamento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Criado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {localClients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            )}
            {localClients.map(client => (
              <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                    {client.full_name}
                  </Link>
                  {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{client.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  {client.source ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {sourceLabel[client.source] ?? client.source}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {client.intent ? <span className="text-xs">{intentLabel[client.intent] ?? client.intent}</span> : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusDropdown
                    client={client}
                    onUpdated={updated => setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c))}
                  />
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                  {formatBudget(client.budget_min, client.budget_max)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                  {formatDate(client.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon-sm"
                    onClick={() => { setEditClient(client); setModalOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={page <= 1}
              onClick={() => router.push(buildUrl({ page: String(page - 1) }))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={page >= totalPages}
              onClick={() => router.push(buildUrl({ page: String(page + 1) }))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <LeadModal
        open={modalOpen}
        client={editClient}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        onSuccess={() => { setModalOpen(false); setEditClient(null); router.refresh() }}
      />
    </div>
  )
}
