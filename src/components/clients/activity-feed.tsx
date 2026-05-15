'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MapPin, Users, CheckSquare, Mail, MessageCircle, FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { activityTypeLabel, activityStatusLabel, activityStatusColor } from '@/lib/labels'
import { formatDateTime } from '@/lib/format'
import type { Activity } from '@/types/database'

interface Props {
  clientId: string
  initialActivities: Activity[]
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, visit: MapPin, meeting: Users,
  task: CheckSquare, email: Mail, whatsapp: MessageCircle, note: FileText,
}

const TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-100 text-blue-600',
  visit: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  task: 'bg-amber-100 text-amber-600',
  email: 'bg-sky-100 text-sky-600',
  whatsapp: 'bg-emerald-100 text-emerald-600',
  note: 'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = { type: 'note', title: '', description: '', scheduled_at: '' }

export function ActivityFeed({ clientId, initialActivities }: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        title: form.title,
        description: form.description || null,
        scheduled_at: form.scheduled_at || null,
        client_id: clientId,
      }),
    })

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Erro ao salvar.')
      setLoading(false)
      return
    }

    const newActivity: Activity = await res.json()
    setActivities(prev => [newActivity, ...prev])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function markCompleted(id: string) {
    const res = await fetch(`/api/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (res.ok) {
      const updated: Activity = await res.json()
      setActivities(prev => prev.map(a => a.id === id ? updated : a))
    }
  }

  return (
    <div className="space-y-4">
      {/* Add activity toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Histórico de Interações</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Fechar' : 'Adicionar'}
        </Button>
      </div>

      {/* Add activity form */}
      {showForm && (
        <form onSubmit={handleAddActivity}
          className="rounded-xl ring-1 ring-foreground/10 bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <select value={form.type} onChange={set('type')}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring">
                <option value="call">Ligação</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="visit">Visita</option>
                <option value="meeting">Reunião</option>
                <option value="task">Tarefa</option>
                <option value="note">Nota</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data / Hora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={set('title')} placeholder="Ex: Ligação de acompanhamento" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <textarea value={form.description} onChange={set('description')}
              placeholder="Detalhes da interação..."
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {activities.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma interação registrada ainda.
        </p>
      )}

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = TYPE_ICONS[activity.type] ?? FileText
          const iconColor = TYPE_COLORS[activity.type] ?? TYPE_COLORS.note
          const isPending = activity.status === 'pending'

          return (
            <div key={activity.id} className="flex gap-3">
              {/* Icon */}
              <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium leading-snug">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activityTypeLabel[activity.type]} · {formatDateTime(activity.scheduled_at ?? activity.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activityStatusColor[activity.status]}`}>
                      {activityStatusLabel[activity.status]}
                    </span>
                    {isPending && (
                      <button onClick={() => markCompleted(activity.id)}
                        className="text-xs text-muted-foreground hover:text-foreground underline">
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
                {activity.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{activity.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
