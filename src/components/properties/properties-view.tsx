'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, X, ChevronLeft, ChevronRight,
  Building2, BedDouble, Maximize2, Lock, Pencil, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PropertyModal } from './property-modal'
import {
  propertyStatusLabel, propertyStatusColor,
  transactionTypeLabel, transactionTypeColor,
} from '@/lib/labels'
import { formatCurrency } from '@/lib/format'
import type { PropertyWithRelations, PropertyStatus, TransactionType } from '@/types/database'

interface Stats {
  total: number
  available: number
  negotiating: number
  sold: number
  rented: number
}

interface Filters {
  status?: string
  transaction_type?: string
  search?: string
  bedrooms?: string
  exclusive?: string
}

interface MatchClient {
  id: string
  full_name: string
  preferred_type: string | null
  preferred_location: string | null
  preferred_bedrooms: number | null
  budget_max: number | null
}

interface Props {
  properties: PropertyWithRelations[]
  total: number
  page: number
  limit: number
  stats: Stats
  agencyId: string
  matchClient: MatchClient | null
  filters: Filters
}

const STATUS_TABS = [
  { value: '',            label: 'Todos' },
  { value: 'available',   label: 'Disponíveis' },
  { value: 'negotiating', label: 'Negociando' },
  { value: 'capturing',   label: 'Captando' },
  { value: 'sold',        label: 'Vendidos' },
  { value: 'rented',      label: 'Alugados' },
  { value: 'inactive',    label: 'Inativos' },
]

const BEDROOMS_OPTIONS = [
  { value: '', label: 'Quartos' },
  { value: '1', label: '1 quarto' },
  { value: '2', label: '2 quartos' },
  { value: '3', label: '3 quartos' },
  { value: '4', label: '4+ quartos' },
]

export function PropertiesView({
  properties, total, page, limit, stats, agencyId, matchClient, filters,
}: Props) {
  const router = useRouter()
  const [localProperties, setLocalProperties] = useState<PropertyWithRelations[]>(properties)
  const [search, setSearch] = useState(filters.search ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProperty, setEditProperty] = useState<PropertyWithRelations | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = {
      status: filters.status ?? '',
      transaction_type: filters.transaction_type ?? '',
      search,
      bedrooms: filters.bedrooms ?? '',
      exclusive: filters.exclusive ?? '',
      page: String(page),
      ...overrides,
    }
    if (merged.status)           params.set('status', merged.status)
    if (merged.transaction_type) params.set('transaction_type', merged.transaction_type)
    if (merged.search)           params.set('search', merged.search)
    if (merged.bedrooms)         params.set('bedrooms', merged.bedrooms)
    if (merged.exclusive)        params.set('exclusive', merged.exclusive)
    if (matchClient && !overrides.match_client) params.set('match_client', matchClient.id)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    return `/properties?${params.toString()}`
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
    setEditProperty(null)
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
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-muted-foreground text-sm">{stats.total} imóveis cadastrados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Imóvel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Disponíveis',    value: stats.available,   status: 'available' },
          { label: 'Em Negociação',  value: stats.negotiating, status: 'negotiating' },
          { label: 'Vendidos',       value: stats.sold,        status: 'sold' },
          { label: 'Alugados',       value: stats.rented,      status: 'rented' },
        ].map(({ label, value, status }) => (
          <Link key={status} href={buildUrl({ status, page: '1' })}
            className="rounded-xl ring-1 ring-foreground/10 bg-card p-4 hover:bg-muted/50 transition-colors">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </Link>
        ))}
      </div>

      {/* Match client banner */}
      {matchClient && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span>
            Mostrando imóveis compatíveis com{' '}
            <Link href={`/clients/${matchClient.id}`} className="font-semibold hover:underline">
              {matchClient.full_name}
            </Link>
          </span>
          <button
            onClick={() => router.push('/properties')}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
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

        {/* Secondary filters */}
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {/* Transaction type */}
          <select
            value={filters.transaction_type ?? ''}
            onChange={e => router.push(buildUrl({ transaction_type: e.target.value, page: '1' }))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Tipo de negócio</option>
            <option value="sale">Venda</option>
            <option value="rent">Locação</option>
            <option value="sale_or_rent">Venda/Locação</option>
          </select>

          {/* Bedrooms */}
          <select
            value={filters.bedrooms ?? ''}
            onChange={e => router.push(buildUrl({ bedrooms: e.target.value, page: '1' }))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {BEDROOMS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Exclusive toggle */}
          <button
            onClick={() => router.push(buildUrl({ exclusive: filters.exclusive === '1' ? '' : '1', page: '1' }))}
            className={`h-8 px-3 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              filters.exclusive === '1'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Exclusivos
          </button>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar imóvel..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8 w-56"
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

      {/* Grid */}
      {localProperties.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10 py-20 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Nenhum imóvel encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {localProperties.map(property => {
            const coverImage =
              property.property_images?.find(img => img.is_cover) ??
              property.property_images?.[0]

            return (
              <div key={property.id}
                className="rounded-xl ring-1 ring-foreground/10 overflow-hidden bg-card hover:shadow-md transition-shadow flex flex-col">
                {/* Image */}
                <div className="relative h-44 bg-muted shrink-0">
                  {coverImage ? (
                    <img
                      src={coverImage.url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Building2 className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${propertyStatusColor[property.status]}`}>
                    {propertyStatusLabel[property.status]}
                  </span>
                  {property.is_exclusive && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Exclusivo
                    </span>
                  )}
                  {property.property_images && property.property_images.length > 1 && (
                    <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded bg-black/50 text-white">
                      {property.property_images.length} fotos
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start gap-1">
                    <Link
                      href={`/properties/${property.id}`}
                      className="font-semibold text-sm hover:underline line-clamp-2 flex-1"
                    >
                      {property.title}
                    </Link>
                    <Button
                      variant="ghost" size="icon-sm"
                      className="shrink-0 -mt-0.5"
                      onClick={() => { setEditProperty(property); setModalOpen(true) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {(property.neighborhood || property.city) && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {[property.neighborhood, property.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {property.property_types?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {(property.property_types as { name: string }).name}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${transactionTypeColor[property.transaction_type]}`}>
                      {transactionTypeLabel[property.transaction_type]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        {property.bedrooms}
                      </span>
                    )}
                    {(property.area_useful ?? property.area_total) != null && (
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-3 w-3" />
                        {(property.area_useful ?? property.area_total)}m²
                      </span>
                    )}
                    {property.internal_code && (
                      <span className="text-muted-foreground/60">#{property.internal_code}</span>
                    )}
                  </div>

                  {property.price != null && (
                    <p className="text-base font-bold mt-auto pt-1">
                      {formatCurrency(property.price)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages} — {total} imóveis</span>
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

      <PropertyModal
        open={modalOpen}
        property={editProperty}
        agencyId={agencyId}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
