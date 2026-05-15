import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, MapPin, BedDouble, Bath, Car, Maximize2,
  Lock, ChevronLeft, Tag, User, Phone, Mail,
} from 'lucide-react'
import { PropertyDetailActions } from '@/components/properties/property-detail-actions'
import {
  propertyStatusLabel, propertyStatusColor,
  transactionTypeLabel, transactionTypeColor,
} from '@/lib/labels'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PropertyWithRelations } from '@/types/database'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const { id } = await params

  const [propertyResult, interestsResult, dealsResult] = await Promise.all([
    supabase
      .from('properties')
      .select('*, property_types(id, name), property_images(id, url, is_cover, sort_order)')
      .eq('id', id)
      .single(),
    supabase
      .from('client_property_interests')
      .select('*, clients(id, full_name, phone, email, status)')
      .eq('property_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('id, title, status, value, pipeline_stages(name, color), clients(full_name)')
      .eq('property_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (propertyResult.error || !propertyResult.data) notFound()

  const property = propertyResult.data as PropertyWithRelations
  const interestedClients = (interestsResult.data ?? []) as Parameters<typeof PropertyDetailActions>[0]['interestedClients']
  const deals = dealsResult.data ?? []

  // Sort images: cover first
  const images = [...(property.property_images ?? [])].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return a.sort_order - b.sort_order
  })

  const location = [
    property.address && property.number
      ? `${property.address}, ${property.number}`
      : property.address,
    property.complement,
    property.neighborhood,
    property.city,
    property.state,
  ].filter(Boolean).join(' — ')

  return (
    <div className="space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/properties" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Imóveis
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium line-clamp-1">{property.title}</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${propertyStatusColor[property.status]}`}>
            {propertyStatusLabel[property.status]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${transactionTypeColor[property.transaction_type]}`}>
            {transactionTypeLabel[property.transaction_type]}
          </span>
          {property.is_exclusive && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Exclusivo
            </span>
          )}
          {property.internal_code && (
            <span className="text-xs text-muted-foreground">#{property.internal_code}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
        {location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location}
          </p>
        )}
        {property.price != null && (
          <p className="text-3xl font-bold text-primary">{formatCurrency(property.price)}</p>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <div key={img.id}
              className={`relative shrink-0 rounded-xl overflow-hidden bg-muted ${i === 0 ? 'w-96 h-60' : 'w-48 h-60'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {img.is_cover && (
                <span className="absolute bottom-2 left-2 text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-semibold">
                  Capa
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="rounded-xl ring-1 ring-foreground/10 p-5">
            <h2 className="font-semibold mb-4">Características</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {property.property_types && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{(property.property_types as { name: string }).name}</span>
                </div>
              )}
              {property.bedrooms != null && (
                <div className="flex items-center gap-2 text-sm">
                  <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.bedrooms} quartos{property.suites ? ` (${property.suites} suítes)` : ''}</span>
                </div>
              )}
              {property.bathrooms != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Bath className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.bathrooms} banheiros</span>
                </div>
              )}
              {property.parking_spots != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.parking_spots} vagas</span>
                </div>
              )}
              {property.area_useful != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Maximize2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.area_useful}m² úteis</span>
                </div>
              )}
              {property.area_total != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Maximize2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.area_total}m² total</span>
                </div>
              )}
              {property.floor != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{property.floor}º andar{property.total_floors ? ` / ${property.total_floors}` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Valores */}
          {(property.price != null || property.condo_fee != null || property.iptu_yearly != null) && (
            <div className="rounded-xl ring-1 ring-foreground/10 p-5">
              <h2 className="font-semibold mb-4">Valores</h2>
              <div className="grid grid-cols-3 gap-4">
                {property.price != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="font-semibold">{formatCurrency(property.price)}</p>
                  </div>
                )}
                {property.condo_fee != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Condomínio</p>
                    <p className="font-semibold">{formatCurrency(property.condo_fee)}</p>
                  </div>
                )}
                {property.iptu_yearly != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">IPTU anual</p>
                    <p className="font-semibold">{formatCurrency(property.iptu_yearly)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {property.description && (
            <div className="rounded-xl ring-1 ring-foreground/10 p-5">
              <h2 className="font-semibold mb-3">Descrição</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="rounded-xl ring-1 ring-foreground/10 p-5">
              <h2 className="font-semibold mb-3">Comodidades</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map(a => (
                  <span key={a} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    <Tag className="h-3 w-3" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Owner */}
          {(property.owner_name || property.owner_phone || property.owner_email) && (
            <div className="rounded-xl ring-1 ring-foreground/10 p-5">
              <h2 className="font-semibold mb-4">Proprietário</h2>
              <div className="space-y-2">
                {property.owner_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {property.owner_name}
                  </div>
                )}
                {property.owner_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {property.owner_phone}
                  </div>
                )}
                {property.owner_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {property.owner_email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Edit + Leads interessados */}
          <PropertyDetailActions
            property={property}
            agencyId={profile.agency_id}
            interestedClients={interestedClients}
          />

          {/* Negociações */}
          {deals.length > 0 && (
            <div className="rounded-xl ring-1 ring-foreground/10 p-5 space-y-3">
              <h3 className="font-semibold text-sm">Negociações</h3>
              <div className="divide-y">
                {deals.map((deal: { id: string; title: string; status: string; value: number | null; pipeline_stages: { name: string; color: string } | null; clients: { full_name: string } | null }) => (
                  <Link key={deal.id} href={`/deals/${deal.id}`}
                    className="flex items-center justify-between py-2.5 hover:text-primary transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.clients?.full_name}</p>
                    </div>
                    {deal.pipeline_stages && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white shrink-0 ml-2"
                        style={{ backgroundColor: deal.pipeline_stages.color }}
                      >
                        {deal.pipeline_stages.name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl ring-1 ring-foreground/10 p-5 space-y-3">
            <h3 className="font-semibold text-sm">Informações</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastrado</span>
                <span>{formatDate(property.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado</span>
                <span>{formatDate(property.updated_at)}</span>
              </div>
              {property.zip_code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CEP</span>
                  <span>{property.zip_code}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
