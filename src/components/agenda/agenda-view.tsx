'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus,
  Phone, Home, Users, CheckSquare2, Mail, MessageCircle, FileText,
  Check, X, Bell, Clock, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivityModal } from './activity-modal'
import type { Activity } from '@/types/database'

interface ActivityWithRelations extends Activity {
  clients: { full_name: string; phone: string | null } | null
  deals: { title: string } | null
}

interface Props {
  initialPending: ActivityWithRelations[]
  initialHistory: ActivityWithRelations[]
}

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const ACTIVITY_CONFIG = {
  call:     { label: 'Ligação',   Icon: Phone,         color: 'text-blue-500',    bg: 'bg-blue-100' },
  visit:    { label: 'Visita',    Icon: Home,          color: 'text-green-500',   bg: 'bg-green-100' },
  meeting:  { label: 'Reunião',   Icon: Users,         color: 'text-purple-500',  bg: 'bg-purple-100' },
  task:     { label: 'Tarefa',    Icon: CheckSquare2,  color: 'text-orange-500',  bg: 'bg-orange-100' },
  email:    { label: 'E-mail',    Icon: Mail,          color: 'text-gray-500',    bg: 'bg-gray-100' },
  whatsapp: { label: 'WhatsApp',  Icon: MessageCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  note:     { label: 'Nota',      Icon: FileText,      color: 'text-yellow-600',  bg: 'bg-yellow-100' },
} as const

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDayHeader(date: Date) {
  const today = startOfDay(new Date())
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (isSameDay(date, today)) return 'Hoje'
  if (isSameDay(date, tomorrow)) return 'Amanhã'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Mini Calendar ──────────────────────────────────────────
function MiniCalendar({
  year, month, activities, selected, onSelect, onPrev, onNext,
}: {
  year: number; month: number
  activities: ActivityWithRelations[]
  selected: Date
  onSelect: (d: Date) => void
  onPrev: () => void
  onNext: () => void
}) {
  const today = startOfDay(new Date())
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const activeDays = useMemo(() => {
    const s = new Set<number>()
    for (const a of activities) {
      if (!a.scheduled_at) continue
      const d = new Date(a.scheduled_at)
      if (d.getFullYear() === year && d.getMonth() === month) s.add(d.getDate())
    }
    return s
  }, [activities, year, month])

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{MONTHS_PT[month]} {year}</span>
        <button onClick={onNext} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const date = new Date(year, month, day)
          const isToday = isSameDay(date, today)
          const isSel = isSameDay(date, selected)
          const hasDot = activeDays.has(day)
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className={`
                relative flex flex-col items-center justify-center h-8 w-full rounded-md text-xs transition-colors
                ${isSel ? 'bg-primary text-primary-foreground font-semibold'
                  : isToday ? 'bg-muted font-bold'
                  : 'hover:bg-muted/60 text-foreground'}
              `}
            >
              {day}
              {hasDot && (
                <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSel ? 'bg-primary-foreground/70' : 'bg-primary'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Activity Card ──────────────────────────────────────────
function ActivityCard({
  activity,
  onComplete,
  onCancel,
  onEdit,
}: {
  activity: ActivityWithRelations
  onComplete: () => void
  onCancel: () => void
  onEdit: () => void
}) {
  const [confirming, setConfirming] = useState<'complete' | 'cancel' | null>(null)
  const cfg = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.task
  const { Icon } = cfg
  const isCompleted = activity.status === 'completed'

  function confirm() {
    if (confirming === 'complete') onComplete()
    else if (confirming === 'cancel') onCancel()
    setConfirming(null)
  }

  if (isCompleted) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-green-50/60 opacity-80">
        <div className={`shrink-0 h-8 w-8 rounded-md flex items-center justify-center ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate line-through text-muted-foreground">{activity.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {activity.clients && (
              <span className="text-xs text-muted-foreground truncate">{activity.clients.full_name}</span>
            )}
            {activity.scheduled_at && (
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {formatTime(activity.scheduled_at)}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={confirming ? undefined : onEdit}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all bg-card
        ${confirming ? 'border-border cursor-default' : 'hover:shadow-sm cursor-pointer group border-border'}
        ${confirming === 'complete' ? 'bg-green-50 border-green-200' : ''}
        ${confirming === 'cancel' ? 'bg-red-50 border-red-200' : ''}
      `}
    >
      <div className={`shrink-0 h-8 w-8 rounded-md flex items-center justify-center ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {activity.clients && (
            <span className="text-xs text-muted-foreground truncate">{activity.clients.full_name}</span>
          )}
          {activity.scheduled_at && (
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatTime(activity.scheduled_at)}
            </span>
          )}
        </div>
        {activity.description && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{activity.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        {confirming ? (
          <>
            <span className={`text-xs font-medium mr-1 ${confirming === 'complete' ? 'text-green-700' : 'text-red-600'}`}>
              {confirming === 'complete' ? 'Marcar como concluído?' : 'Cancelar compromisso?'}
            </span>
            <button
              onClick={confirm}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors
                ${confirming === 'complete' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-500 text-white hover:bg-red-600'}
              `}
            >
              Sim
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Não
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirming('complete')}
              title="Concluir"
              className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-green-600 hover:bg-green-50 transition-all"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setConfirming('cancel')}
              title="Cancelar compromisso"
              className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── History Card ──────────────────────────────────────────
function HistoryCard({ activity }: { activity: ActivityWithRelations }) {
  const cfg = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.task
  const { Icon } = cfg
  const date = activity.completed_at ?? activity.scheduled_at
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={`shrink-0 h-7 w-7 rounded-md flex items-center justify-center ${cfg.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        {activity.description && (
          <p className="text-xs text-muted-foreground/70 truncate">{activity.description}</p>
        )}
      </div>
      {date && (
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────
export function AgendaView({ initialPending, initialHistory }: Props) {
  const today = startOfDay(new Date())

  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [tab, setTab] = useState<'agenda' | 'history'>('agenda')
  // activities inclui pendentes + concluídos/cancelados desta sessão
  const [activities, setActivities] = useState<ActivityWithRelations[]>(initialPending)
  const [history, setHistory] = useState<ActivityWithRelations[]>(initialHistory)
  const [modalOpen, setModalOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null)
  const [historySearch, setHistorySearch] = useState('')

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // Todos os compromissos do dia (pendentes + concluídos visíveis)
  const dayActivities = useMemo(() =>
    activities
      .filter(a => a.scheduled_at && isSameDay(new Date(a.scheduled_at), selectedDate))
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()),
    [activities, selectedDate]
  )

  // Pontos no calendário: apenas pendentes
  const pendingActivities = useMemo(() => activities.filter(a => a.status === 'pending'), [activities])

  // Próximas 48h (apenas pendentes)
  const upcoming = useMemo(() => {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    return pendingActivities
      .filter(a => {
        if (!a.scheduled_at) return false
        const t = new Date(a.scheduled_at)
        return t >= now && t <= in48h
      })
      .slice(0, 5)
  }, [pendingActivities])

  // Histórico: concluídos do servidor + concluídos desta sessão, sem duplicatas
  const allHistory = useMemo(() => {
    const sessionCompleted = activities.filter(a => a.status === 'completed')
    const sessionIds = new Set(sessionCompleted.map(a => a.id))
    return [...sessionCompleted, ...history.filter(h => !sessionIds.has(h.id))]
  }, [activities, history])

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase()
    return allHistory.filter(a =>
      !q ||
      a.clients?.full_name.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q)
    )
  }, [allHistory, historySearch])

  const historyByClient = useMemo(() => {
    const map = new Map<string, { name: string; items: ActivityWithRelations[] }>()
    for (const a of filteredHistory) {
      const key = a.client_id ?? '__none__'
      const name = a.clients?.full_name ?? 'Sem cliente'
      if (!map.has(key)) map.set(key, { name, items: [] })
      map.get(key)!.items.push(a)
    }
    return [...map.values()]
  }, [filteredHistory])

  async function handleComplete(id: string) {
    const res = await fetch(`/api/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (res.ok) {
      const json = await res.json()
      const completed = json.data ?? json
      // Mantém visível no dia com status atualizado
      setActivities(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', completed_at: completed.completed_at } : a))
    }
  }

  async function handleCancel(id: string) {
    await fetch(`/api/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  function handleModalSuccess(saved: ActivityWithRelations) {
    setModalOpen(false)
    if (editActivity) {
      setActivities(prev => prev.map(a => a.id === saved.id ? saved : a))
    } else {
      setActivities(prev => [...prev, saved].sort((a, b) =>
        (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')
      ))
    }
    setEditActivity(null)
  }

  function handleDelete(id: string) {
    setModalOpen(false)
    setActivities(prev => prev.filter(a => a.id !== id))
    setEditActivity(null)
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendingActivities.length} compromisso{pendingActivities.length !== 1 ? 's' : ''} pendente{pendingActivities.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setEditActivity(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4" />
          Novo compromisso
        </Button>
      </div>

      {/* Body */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-64 shrink-0 flex flex-col gap-5">
          {/* Mini calendar */}
          <div className="rounded-xl border border-border bg-card p-4">
            <MiniCalendar
              year={calYear}
              month={calMonth}
              activities={pendingActivities}
              selected={selectedDate}
              onSelect={d => { setSelectedDate(d); setTab('agenda') }}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          </div>

          {/* Upcoming notifications */}
          {upcoming.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Bell className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Próximas 48h</span>
              </div>
              <div className="space-y-2">
                {upcoming.map(a => {
                  const cfg = ACTIVITY_CONFIG[a.type] ?? ACTIVITY_CONFIG.task
                  const { Icon } = cfg
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedDate(startOfDay(new Date(a.scheduled_at!))); setTab('agenda') }}
                      className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900 truncate">{a.clients?.full_name ?? a.title}</p>
                        <p className="text-[10px] text-amber-700">{cfg.label} · {a.scheduled_at ? formatTime(a.scheduled_at) : '—'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-border/50">
            {(['agenda', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'agenda' ? 'Agenda' : 'Histórico'}
              </button>
            ))}
          </div>

          {/* Agenda tab */}
          {tab === 'agenda' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold capitalize">{formatDayHeader(selectedDate)}</h2>
                <button
                  onClick={() => { setEditActivity(null); setModalOpen(true) }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>

              {dayActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <CheckSquare2 className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
                  <button
                    onClick={() => { setEditActivity(null); setModalOpen(true) }}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Criar compromisso
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayActivities.map(a => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      onComplete={() => handleComplete(a.id)}
                      onCancel={() => handleCancel(a.id)}
                      onEdit={() => { setEditActivity(a); setModalOpen(true) }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou atividade..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {historyByClient.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma atividade concluída nos últimos 30 dias.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyByClient.map(({ name, items }) => (
                    <div key={name} className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-sm font-semibold mb-1">{name}</p>
                      <p className="text-xs text-muted-foreground mb-3">{items.length} atividade{items.length !== 1 ? 's' : ''}</p>
                      {items.map(a => <HistoryCard key={a.id} activity={a} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ActivityModal
        open={modalOpen}
        activity={editActivity}
        defaultDate={selectedDate.toISOString().slice(0, 10)}
        onClose={() => { setModalOpen(false); setEditActivity(null) }}
        onSuccess={a => handleModalSuccess(a as ActivityWithRelations)}
        onDelete={handleDelete}
      />
    </div>
  )
}
