import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, Home, BedDouble, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ActivityFeed } from '@/components/clients/activity-feed'
import { ClientDetailActions } from '@/components/clients/client-detail-actions'
import { clientStatusLabel, clientStatusColor, sourceLabel, intentLabel } from '@/lib/labels'
import { formatBudget, formatDate } from '@/lib/format'
import type { Activity } from '@/types/database'

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: activities }, { data: deals }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('activities').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('id, title, status, value, pipeline_stages(name, color)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const preferredType = (client as Record<string, unknown>).preferred_type as string | null
  const preferredLocation = (client as Record<string, unknown>).preferred_location as string | null
  const preferredBedrooms = (client as Record<string, unknown>).preferred_bedrooms as number | null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              Cadastrado em {formatDate(client.created_at)}
              {client.source && ` · via ${sourceLabel[client.source]}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${clientStatusColor[client.status]}`}>
            {clientStatusLabel[client.status]}
          </span>
          <ClientDetailActions client={client as Parameters<typeof ClientDetailActions>[0]['client']} />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact */}
          <SectionCard title="Contato">
            <InfoRow icon={Mail} label="E-mail" value={client.email} />
            <InfoRow icon={Phone} label="Telefone" value={client.phone} />
            <InfoRow icon={MapPin} label="CPF" value={client.cpf} />
            {!client.email && !client.phone && !client.cpf && (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            )}
          </SectionCard>

          {/* Interest Profile */}
          <SectionCard title="Perfil de Interesse">
            {client.intent && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {intentLabel[client.intent]}
                </span>
              </div>
            )}
            <InfoRow icon={Home} label="Tipo de imóvel" value={preferredType} />
            <InfoRow icon={MapPin} label="Localização" value={preferredLocation} />
            {preferredBedrooms != null && (
              <InfoRow icon={BedDouble} label="Quartos" value={`${preferredBedrooms} quarto${preferredBedrooms !== 1 ? 's' : ''}`} />
            )}
            <InfoRow
              icon={Wallet}
              label="Orçamento"
              value={formatBudget(client.budget_min, client.budget_max) === '—' ? null : formatBudget(client.budget_min, client.budget_max)}
            />
            {!client.intent && !preferredType && !preferredLocation && preferredBedrooms == null && !client.budget_min && !client.budget_max && (
              <p className="text-sm text-muted-foreground">Perfil de interesse não preenchido.</p>
            )}
          </SectionCard>

          {/* Deals */}
          {deals && deals.length > 0 && (
            <SectionCard title={`Negociações (${deals.length})`}>
              <div className="space-y-2">
                {deals.map((deal: Record<string, unknown>) => {
                  const stage = deal.pipeline_stages as { name: string; color: string } | null
                  return (
                    <Link key={deal.id as string} href={`/deals/${deal.id}`}
                      className="block rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors">
                      <p className="text-sm font-medium leading-snug">{deal.title as string}</p>
                      {stage && (
                        <p className="text-xs text-muted-foreground mt-1">{stage.name}</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* Notes */}
          {client.notes && (
            <SectionCard title="Notas">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{client.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* Right column — Activity Feed */}
        <div className="rounded-xl ring-1 ring-foreground/10 bg-card p-4">
          <ActivityFeed
            clientId={id}
            initialActivities={(activities ?? []) as Activity[]}
          />
        </div>
      </div>
    </div>
  )
}
