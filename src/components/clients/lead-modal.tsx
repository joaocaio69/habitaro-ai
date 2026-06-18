'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Client } from '@/types/database'

interface Props {
  open: boolean
  client?: Client | null
  onClose: () => void
  onSuccess: () => void
}

const EMPTY = {
  full_name: '', email: '', phone: '', cpf: '',
  status: 'lead', source: '', intent: '',
  budget_min: '', budget_max: '',
  preferred_type: '', preferred_location: '', preferred_bedrooms: '',
  notes: '',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function SelectInput({ value, onChange, children, placeholder }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
}

export function LeadModal({ open, client, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setForm({
        full_name: client.full_name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        cpf: client.cpf ?? '',
        status: client.status ?? 'lead',
        source: client.source ?? '',
        intent: client.intent ?? '',
        budget_min: client.budget_min != null ? String(client.budget_min) : '',
        budget_max: client.budget_max != null ? String(client.budget_max) : '',
        preferred_type: (client as unknown as Record<string, unknown>).preferred_type as string ?? '',
        preferred_location: (client as unknown as Record<string, unknown>).preferred_location as string ?? '',
        preferred_bedrooms: (client as unknown as Record<string, unknown>).preferred_bedrooms != null
          ? String((client as unknown as Record<string, unknown>).preferred_bedrooms) : '',
        notes: client.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setError(null)
  }, [client, open])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const setVal = (field: string) => (v: string) => setForm(f => ({ ...f, [field]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Nome é obrigatório.'); return }
    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      preferred_bedrooms: form.preferred_bedrooms ? Number(form.preferred_bedrooms) : null,
      source: form.source || null,
      intent: form.intent || null,
    }

    const url = client ? `/api/clients/${client.id}` : '/api/clients'
    const method = client ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Erro ao salvar.')
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto h-full w-full max-w-lg bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-base">{client ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <Section title="Contato">
            <Field label="Nome completo *">
              <Input value={form.full_name} onChange={set('full_name')} placeholder="João da Silva" required />
            </Field>
            <Row>
              <Field label="E-mail">
                <Input type="email" value={form.email} onChange={set('email')} placeholder="joao@email.com" />
              </Field>
              <Field label="Telefone">
                <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" />
              </Field>
            </Row>
            <Field label="CPF">
              <Input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" className="max-w-[180px]" />
            </Field>
          </Section>

          <Section title="Classificação">
            <Row>
              <Field label="Status">
                <SelectInput value={form.status} onChange={setVal('status')}>
                  <option value="lead">Lead</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="converted">Convertido</option>
                  <option value="lost">Perdido</option>
                </SelectInput>
              </Field>
              <Field label="Origem">
                <SelectInput value={form.source} onChange={setVal('source')} placeholder="Selecionar...">
                  <option value="portal">Portal</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="referral">Indicação</option>
                  <option value="cold_call">Ligação</option>
                  <option value="event">Evento</option>
                  <option value="other">Outro</option>
                </SelectInput>
              </Field>
            </Row>
            <Field label="Intenção">
              <SelectInput value={form.intent} onChange={setVal('intent')} placeholder="Selecionar...">
                <option value="buy">Comprar</option>
                <option value="rent">Alugar</option>
                <option value="sell">Vender</option>
                <option value="buy_and_sell">Comprar e Vender</option>
              </SelectInput>
            </Field>
          </Section>

          <Section title="Perfil de Interesse">
            <Row>
              <Field label="Tipo de imóvel">
                <Input value={form.preferred_type} onChange={set('preferred_type')} placeholder="Ex: Apartamento" />
              </Field>
              <Field label="Quartos">
                <Input type="number" min="0" max="20" value={form.preferred_bedrooms}
                  onChange={set('preferred_bedrooms')} placeholder="Ex: 2" />
              </Field>
            </Row>
            <Field label="Localização preferida">
              <Input value={form.preferred_location} onChange={set('preferred_location')}
                placeholder="Ex: São Paulo – Pinheiros" />
            </Field>
            <Row>
              <Field label="Orçamento mínimo">
                <Input type="number" min="0" value={form.budget_min} onChange={set('budget_min')}
                  placeholder="R$ 0" />
              </Field>
              <Field label="Orçamento máximo">
                <Input type="number" min="0" value={form.budget_max} onChange={set('budget_max')}
                  placeholder="R$ 0" />
              </Field>
            </Row>
          </Section>

          <Section title="Notas">
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Observações sobre o lead..."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
          </Section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit as unknown as () => void} disabled={loading}>
            {loading ? 'Salvando...' : client ? 'Salvar alterações' : 'Criar lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}
