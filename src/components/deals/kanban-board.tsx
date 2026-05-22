'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, GripVertical, Building2, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DealModal } from './deal-modal'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Deal, PipelineStage } from '@/types/database'

interface DealWithRelations extends Deal {
  clients: { full_name: string; phone: string | null } | null
  properties: { title: string; address: string | null } | null
  pipeline_stages: { name: string; color: string } | null
}

function daysInStage(deal: DealWithRelations) {
  const date = new Date(deal.stage_changed_at ?? deal.created_at)
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ── Deal Card ──────────────────────────────────────────────
function DealCard({
  deal,
  onEdit,
  overlay = false,
}: {
  deal: DealWithRelations
  onEdit: (deal: DealWithRelations) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })

  const style = overlay
    ? {}
    : { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }

  const days = daysInStage(deal)
  const isOverdue = deal.expected_close_date && new Date(deal.expected_close_date) < new Date()
  const staleLevel = days >= 14 ? 'danger' : days >= 7 ? 'warn' : 'ok'

  const clientName = deal.clients?.full_name ?? '—'
  const commission =
    deal.value != null && deal.commission_pct != null
      ? deal.value * (deal.commission_pct / 100)
      : null
  const hasFooter = commission != null || !!deal.expected_close_date || days >= 7

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      onClick={overlay ? undefined : () => onEdit(deal)}
      className={`
        bg-card rounded-lg border select-none group
        transition-shadow hover:shadow-md
        ${!overlay ? 'cursor-pointer' : ''}
        ${staleLevel === 'danger' ? 'border-red-200/60' : staleLevel === 'warn' ? 'border-amber-200/40' : 'border-border'}
      `}
    >
      <div className="p-3 space-y-2">
        {/* Client name + grip */}
        <div className="flex items-center gap-1.5">
          <div
            {...(overlay ? {} : { ...listeners, ...attributes })}
            onClick={e => e.stopPropagation()}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold flex-1 truncate leading-snug">
            {clientName}
          </span>
        </div>

        {/* Property */}
        {deal.properties && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.properties.title}</span>
          </div>
        )}

        {/* Footer — only when there's something to show */}
        {hasFooter && (
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50">
            {commission != null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold">{formatCurrency(commission)}</span>
                <span className="text-[10px] text-muted-foreground font-medium">comissão</span>
              </div>
            ) : <span />}
            <div className="flex items-center gap-1.5">
              {deal.expected_close_date && (
                <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-muted-foreground/60'}`}>
                  {formatDate(deal.expected_close_date)}
                </span>
              )}
              {days >= 7 && (
                <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${days >= 14 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {days}d
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────
function KanbanColumn({
  stage,
  deals,
  onEditDeal,
}: {
  stage: PipelineStage
  deals: DealWithRelations[]
  onEditDeal: (deal: DealWithRelations) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const dangerCount = deals.filter(d => daysInStage(d) >= 14).length
  const warnCount   = deals.filter(d => daysInStage(d) >= 7 && daysInStage(d) < 14).length

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-xl overflow-hidden ring-1 ring-foreground/8 bg-muted/20">
      {/* Header */}
      <div
        className="px-3.5 py-3 border-b border-border/50"
        style={{ borderLeftWidth: 3, borderLeftColor: stage.color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">{stage.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {deals.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {dangerCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                {dangerCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-[10px] font-medium text-amber-400">{warnCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-36 p-2.5 space-y-2 transition-all duration-150 ${
          isOver ? 'bg-primary/5 ring-inset ring-2 ring-primary/20' : ''
        }`}
      >
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onEdit={onEditDeal} />
        ))}
      </div>
    </div>
  )
}

// ── Main Board ─────────────────────────────────────────────
interface Props {
  stages: PipelineStage[]
  initialDeals: DealWithRelations[]
}

export function KanbanBoard({ stages, initialDeals }: Props) {
  const router = useRouter()

  const [dealsByStage, setDealsByStage] = useState<Map<string, DealWithRelations[]>>(() => {
    const map = new Map<string, DealWithRelations[]>()
    for (const stage of stages) map.set(stage.id, [])
    for (const deal of initialDeals) {
      const arr = map.get(deal.stage_id) ?? []
      arr.push(deal)
      map.set(deal.stage_id, arr)
    }
    return map
  })

  const [activeId, setActiveId]       = useState<string | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editDeal, setEditDeal]       = useState<DealWithRelations | null>(null)
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openStages   = stages.filter(s => !s.is_won && !s.is_lost)
  const closedStages = stages.filter(s => s.is_won || s.is_lost)

  const allOpenDeals = openStages.flatMap(s => dealsByStage.get(s.id) ?? [])
  const activeDeal   = activeId ? allOpenDeals.find(d => d.id === activeId) ?? null : null

  const totalOpenValue  = allOpenDeals.reduce((n, d) => n + (d.value ?? 0), 0)
  const bottleneckCount = allOpenDeals.filter(d => daysInStage(d) >= 14).length

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)) }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const dealId = String(active.id)
    const targetStageId = String(over.id)

    let fromStageId: string | null = null
    let draggedDeal: DealWithRelations | null = null

    for (const [stageId, deals] of dealsByStage) {
      const found = deals.find(d => d.id === dealId)
      if (found) { fromStageId = stageId; draggedDeal = found; break }
    }

    if (!fromStageId || fromStageId === targetStageId || !draggedDeal) return

    setDealsByStage(prev => {
      const next = new Map(prev)
      next.set(fromStageId!, (next.get(fromStageId!) ?? []).filter(d => d.id !== dealId))
      next.set(targetStageId, [{ ...draggedDeal!, stage_id: targetStageId }, ...(next.get(targetStageId) ?? [])])
      return next
    })

    fetch(`/api/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage_id: targetStageId }),
    }).catch(() => {
      setDealsByStage(prev => {
        const next = new Map(prev)
        next.set(targetStageId, (next.get(targetStageId) ?? []).filter(d => d.id !== dealId))
        next.set(fromStageId!, [draggedDeal!, ...(next.get(fromStageId!) ?? [])])
        return next
      })
    })
  }

  function handleAddDeal(stageId: string) {
    setEditDeal(null); setDefaultStageId(stageId); setModalOpen(true)
  }

  function handleEditDeal(deal: DealWithRelations) {
    setEditDeal(deal); setDefaultStageId(undefined); setModalOpen(true)
  }

  function handleModalSuccess(saved: Deal) {
    setModalOpen(false)
    router.refresh()
    if (!editDeal) {
      setDealsByStage(prev => {
        const next = new Map(prev)
        next.set(saved.stage_id, [saved as DealWithRelations, ...(next.get(saved.stage_id) ?? [])])
        return next
      })
    } else {
      setDealsByStage(prev => {
        const next = new Map(prev)
        for (const [sid, deals] of next)
          next.set(sid, deals.map(d => d.id === saved.id ? { ...d, ...saved } : d))
        return next
      })
    }
    setEditDeal(null)
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allOpenDeals.length} negociações em aberto
            {totalOpenValue > 0 && ` · ${formatCurrency(totalOpenValue)} em volume`}
          </p>
        </div>
        <Button onClick={() => handleAddDeal(openStages[0]?.id ?? '')}>
          <Plus className="h-4 w-4" />
          Nova negociação
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm border-b border-border/40 pb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Volume em aberto</p>
          <p className="font-bold text-base">{formatCurrency(totalOpenValue)}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Negociações</p>
          <p className="font-bold text-base">{allOpenDeals.length}</p>
        </div>
        {bottleneckCount > 0 && (
          <>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Gargalos</p>
                <p className="font-bold text-base text-red-400">{bottleneckCount}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
          {openStages.map((stage, i) => (
            <>
              {i > 0 && <div key={`div-${stage.id}`} className="w-px bg-border/20 self-stretch shrink-0" />}
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage.get(stage.id) ?? []}
                onEditDeal={handleEditDeal}
              />
            </>
          ))}

          {closedStages.length > 0 && (
            <div className="w-px bg-border/20 self-stretch shrink-0 mx-1" />
          )}

          {closedStages.map((stage, i) => (
            <>
              {i > 0 && <div key={`div-${stage.id}`} className="w-px bg-border/20 self-stretch shrink-0" />}
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage.get(stage.id) ?? []}
                onEditDeal={handleEditDeal}
              />
            </>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal && (
            <div className="rotate-1 shadow-2xl w-72 opacity-95">
              <DealCard deal={activeDeal} onEdit={() => {}} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DealModal
        open={modalOpen}
        deal={editDeal}
        stages={openStages}
        defaultStageId={defaultStageId}
        onClose={() => { setModalOpen(false); setEditDeal(null) }}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
