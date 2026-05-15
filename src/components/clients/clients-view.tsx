'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LeadModal } from './lead-modal'
import { clientStatusLabel, clientStatusColor, sourceLabel, intentLabel } from '@/lib/labels'
import { formatBudget, formatDate } from '@/lib/format'
import type { Client, ClientStatus } from '@/types/database'

const STATUS_OPTIONS: ClientStatus[] = ['lead', 'active', 'inactive', 'converted', 'lost']

const DOT_COLOR: Record<string, string> = {
  lead:      'bg-blue-500',
  active:    'bg-green-500',
  inactive:  'bg-amber-500',
  converted: 'bg-purple-500',
  lost:      'bg-red-500',
}

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
      // fixed positioning — coordenadas já são relativas ao viewport
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  async function handleSelect(status: ClientStatus) {
    setOpen(false)
    if (status === currentStatus) return
    setCurrentStatus(status)   // atualiza visualmente na hora
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
      setCurrentStatus(client.status)  // reverte se falhar
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
          {/* Backdrop invisível fecha o dropdown ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown posicionado com fixed (não sofre com overflow-hidden) */}
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="z-50 min-w-[140px] rounded-lg border border-border bg-card text-card-foreground shadow-lg py-1"
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
interface Filters { status?: string; source?: string; search?: string }

interface Props {
  clients: Client[]
  total: number
  page: number
  limit: number
  stats: Stats
  filters: Filters
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

export function ClientsView({ clients, total, page, limit, stats, filters }: Props) {
  const router = useRouter()
  const [localClients, setLocalClients] = useState<Client[]>(clients)
  const [search, setSearch] = useState(filters.search ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalClients(clients) }, [clients])

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { status: filters.status ?? '', source: filters.source ?? '', search, page: String(page), ...overrides }
    if (merged.status) params.set('status', merged.status)
    if (merged.source) params.set('source', merged.source)
    if (merged.search) params.set('search', merged.search)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    return `/clients?${params.toString()}`
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value, page: '1' }))
    }, 350)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditClient(null)
  }

  function handleModalSuccess() {
    handleModalClose()
    router.refresh()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes & Leads</h1>
          <p className="text-muted-foreground text-sm">{total} registros no total</p>
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
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

        <div className="flex gap-2 sm:ml-auto">
          {/* Source filter */}
          <select
            value={filters.source ?? ''}
            onChange={e => router.push(buildUrl({ source: e.target.value, page: '1' }))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {SOURCE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8 w-52"
            />
            {search && (
              <button onClick={() => handleSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
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
                  {client.email && (
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {client.phone ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {client.source ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {sourceLabel[client.source] ?? client.source}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {client.intent ? (
                    <span className="text-xs">{intentLabel[client.intent] ?? client.intent}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusDropdown
                    client={client}
                    onUpdated={updated =>
                      setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c))
                    }
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
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
