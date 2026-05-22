'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Activity, ActivityType, Client } from '@/types/database'

interface ActivityWithRelations extends Activity {
  clients: { full_name: string; phone: string | null } | null
  deals: { title: string } | null
}

interface Props {
  open: boolean
  activity: ActivityWithRelations | null
  defaultDate?: string
  onClose: () => void
  onSuccess: (activity: ActivityWithRelations) => void
  onDelete?: (id: string) => void
}

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'visit',    label: 'Visita' },
  { value: 'call',     label: 'Ligação' },
  { value: 'meeting',  label: 'Reunião' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'task',     label: 'Tarefa' },
  { value: 'email',    label: 'E-mail' },
  { value: 'note',     label: 'Nota' },
]

function ClientSearch({
  value, onSearch, onSelect, onClear, results,
}: {
  value: string
  onSearch: (q: string) => void
  onSelect: (c: Pick<Client, 'id' | 'full_name'>) => void
  onClear: () => void
  results: Pick<Client, 'id' | 'full_name'>[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={value}
          onChange={e => { onSearch(e.target.value); setOpen(true) }}
          onFocus={() => { onSearch(value); setOpen(true) }}
          className="pl-8"
        />
        {value && (
          <button type="button" onClick={() => { onClear(); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-lg py-1">
          {results.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { onSelect(c); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
              {c.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ActivityModal({ open, activity, defaultDate, onClose, onSuccess, onDelete }: Props) {
  const [type, setType] = useState<ActivityType>('visit')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Pick<Client, 'id' | 'full_name'>[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (activity) {
      setType(activity.type)
      setTitle(activity.title)
      setClientId(activity.client_id ?? '')
      setClientSearch(activity.clients?.full_name ?? '')
      if (activity.scheduled_at) {
        const d = new Date(activity.scheduled_at)
        setScheduledDate(d.toISOString().slice(0, 10))
        setScheduledTime(d.toTimeString().slice(0, 5))
      } else {
        setScheduledDate('')
        setScheduledTime('')
      }
      setDescription(activity.description ?? '')
    } else {
      setType('visit')
      setTitle('')
      setClientId('')
      setClientSearch('')
      setScheduledDate(defaultDate ?? new Date().toISOString().slice(0, 10))
      setScheduledTime('09:00')
      setDescription('')
    }
    setError(null)
    setConfirmDelete(false)
    fetch('/api/clients?limit=6').then(r => r.json())
      .then(j => setClientResults((j.data ?? []).map((c: Client) => ({ id: c.id, full_name: c.full_name }))))
  }, [open, activity, defaultDate])

  function searchClients(q: string) {
    setClientSearch(q)
    setClientId('')
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=6`)
      if (res.ok) {
        const json = await res.json()
        setClientResults((json.data ?? []).map((c: Client) => ({ id: c.id, full_name: c.full_name })))
      }
    }, q.trim() ? 300 : 0)
  }

  function autoTitle(t: ActivityType, name: string) {
    const label = TYPE_OPTIONS.find(o => o.value === t)?.label ?? ''
    return name ? `${label} — ${name}` : label
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Selecione um cliente.'); return }
    setError(null)
    setLoading(true)

    const scheduled_at = scheduledDate
      ? new Date(`${scheduledDate}T${scheduledTime || '00:00'}`).toISOString()
      : null

    const finalTitle = title.trim() || autoTitle(type, clientSearch)

    const body = { type, title: finalTitle, client_id: clientId, scheduled_at, description: description || null }
    const url = activity ? `/api/activities/${activity.id}` : '/api/activities'
    const method = activity ? 'PUT' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Erro ao salvar.')
      setLoading(false)
      return
    }
    const json = await res.json()
    onSuccess(json.data ?? json)
    setLoading(false)
  }

  async function handleDelete() {
    if (!activity) return
    setLoading(true)
    await fetch(`/api/activities/${activity.id}`, { method: 'DELETE' })
    onDelete?.(activity.id)
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-md bg-background rounded-xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{activity ? 'Editar atividade' : 'Nova atividade'}</h2>
          <button onClick={!loading ? onClose : undefined} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select
              value={type}
              onChange={e => { const t = e.target.value as ActivityType; setType(t); setTitle(autoTitle(t, clientSearch)) }}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            <ClientSearch
              value={clientSearch}
              onSearch={searchClients}
              onSelect={c => { setClientId(c.id); setClientSearch(c.full_name ?? ''); setTitle(autoTitle(type, c.full_name ?? '')) }}
              onClear={() => { setClientId(''); setClientSearch(''); setTitle(autoTitle(type, '')) }}
              results={clientResults}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle(type, clientSearch) || 'Ex: Visita — Apto Brooklin'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalhes do compromisso..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t flex items-center justify-between gap-2 shrink-0">
          {activity && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confirmar exclusão?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>Excluir</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando…' : activity ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
