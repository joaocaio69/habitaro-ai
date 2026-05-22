'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Deal, PipelineStage, Client, Property } from '@/types/database'

interface DealWithRelationsPartial extends Deal {
  clients?: { full_name: string; phone: string | null } | null
  properties?: { title: string; address: string | null } | null
}

interface Props {
  open: boolean
  deal: DealWithRelationsPartial | null
  stages: PipelineStage[]
  defaultStageId?: string
  onClose: () => void
  onSuccess: (deal: Deal) => void
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

function SearchSelect<T extends { id: string; full_name?: string; title?: string; price?: number | null }>({
  placeholder,
  value,
  onSearch,
  onFocusTrigger,
  onSelect,
  onClear,
  results,
  displayField,
}: {
  placeholder: string
  value: string
  onSearch: (q: string) => void
  onFocusTrigger: () => void
  onSelect: (item: T) => void
  onClear: () => void
  results: T[]
  displayField: keyof T
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={e => { onSearch(e.target.value); setOpen(true) }}
          onFocus={() => { onFocusTrigger(); setOpen(true) }}
          className="pl-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onClear(); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-lg py-1">
          {results.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => { onSelect(item); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              {String(item[displayField] ?? '')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DealModal({ open, deal, stages, defaultStageId, onClose, onSuccess }: Props) {
  const [stageId, setStageId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Pick<Client, 'id' | 'full_name'>[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [propertyResults, setPropertyResults] = useState<Pick<Property, 'id' | 'title' | 'price'>[]>([])
  const [value, setValue] = useState('')
  const [commissionPct, setCommissionPct] = useState('')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const propertyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (deal) {
      setStageId(deal.stage_id)
      setClientId(deal.client_id)
      setClientSearch(deal.clients?.full_name ?? '')
      setPropertyId(deal.property_id ?? '')
      setPropertySearch(deal.properties?.title ?? '')
      setValue(deal.value != null ? String(deal.value) : '')
      setCommissionPct(deal.commission_pct != null ? String(deal.commission_pct) : '')
      setExpectedCloseDate(deal.expected_close_date ?? '')
      setNotes(deal.notes ?? '')
    } else {
      setStageId(defaultStageId ?? stages[0]?.id ?? '')
      setClientId('')
      setClientSearch('')
      setPropertyId('')
      setPropertySearch('')
      setValue('')
      setCommissionPct('')
      setExpectedCloseDate('')
      setNotes('')
    }
    setError(null)
    // Pre-load initial results
    fetch('/api/clients?limit=6')
      .then(r => r.json())
      .then(j => setClientResults((j.data ?? []).map((c: Client) => ({ id: c.id, full_name: c.full_name }))))
    fetch('/api/properties?limit=6')
      .then(r => r.json())
      .then(j => setPropertyResults((j.data ?? []).map((p: Property) => ({ id: p.id, title: p.title, price: p.price }))))
  }, [open, deal, defaultStageId, stages])

  function searchClients(q: string) {
    setClientSearch(q)
    setClientId('')
    if (clientDebounce.current) clearTimeout(clientDebounce.current)
    clientDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=6`)
      if (res.ok) {
        const json = await res.json()
        setClientResults((json.data ?? []).map((c: Client) => ({ id: c.id, full_name: c.full_name })))
      }
    }, q.trim() ? 300 : 0)
  }

  function searchProperties(q: string) {
    setPropertySearch(q)
    setPropertyId('')
    if (propertyDebounce.current) clearTimeout(propertyDebounce.current)
    propertyDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/properties?search=${encodeURIComponent(q)}&limit=6`)
      if (res.ok) {
        const json = await res.json()
        setPropertyResults((json.data ?? []).map((p: Property) => ({ id: p.id, title: p.title, price: p.price })))
      }
    }, q.trim() ? 300 : 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Selecione um cliente.'); return }
    if (!stageId) { setError('Selecione uma etapa.'); return }
    setError(null)
    setLoading(true)

    const autoTitle = propertySearch.trim()
      ? `${clientSearch.trim()} × ${propertySearch.trim()}`
      : clientSearch.trim() || 'Negociação'

    const body = {
      title: deal?.title ?? autoTitle,
      client_id: clientId,
      stage_id: stageId,
      property_id: propertyId || null,
      value: value ? Number(value) : null,
      commission_pct: commissionPct ? Number(commissionPct) : null,
      expected_close_date: expectedCloseDate || null,
      notes: notes || null,
    }

    const url = deal ? `/api/deals/${deal.id}` : '/api/deals'
    const method = deal ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-background rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{deal ? 'Editar negociação' : 'Nova negociação'}</h2>
          <button onClick={!loading ? onClose : undefined} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Cliente" required>
            <SearchSelect
              placeholder="Selecionar cliente..."
              value={clientSearch}
              onSearch={searchClients}
              onFocusTrigger={() => searchClients(clientSearch)}
              onSelect={c => { setClientId(c.id); setClientSearch(c.full_name ?? '') }}
              onClear={() => { setClientId(''); setClientSearch('') }}
              results={clientResults}
              displayField="full_name"
            />
          </Field>

          <Field label="Etapa" required>
            <select
              value={stageId}
              onChange={e => setStageId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Imóvel">
            <SearchSelect
              placeholder="Selecionar imóvel (opcional)..."
              value={propertySearch}
              onSearch={searchProperties}
              onFocusTrigger={() => searchProperties(propertySearch)}
              onSelect={p => { setPropertyId(p.id); setPropertySearch(p.title ?? ''); setValue(p.price != null ? String(p.price) : '') }}
              onClear={() => { setPropertyId(''); setPropertySearch(''); setValue('') }}
              results={propertyResults}
              displayField="title"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input
                type="number"
                min="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Selecione um imóvel"
                readOnly={!!propertyId}
                className={propertyId ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
              />
            </Field>
            <Field label="Comissão (%)">
              <Input type="number" min="0" max="100" step="0.1" value={commissionPct} onChange={e => setCommissionPct(e.target.value)} placeholder="6" />
            </Field>
          </div>

          <Field label="Previsão de fechamento">
            <Input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} />
          </Field>

          <Field label="Notas">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre a negociação..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando…' : deal ? 'Salvar alterações' : 'Criar negociação'}
          </Button>
        </div>
      </div>
    </div>
  )
}
