'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { PropertyWithRelations, PropertyImage, PropertyStatus, TransactionType } from '@/types/database'

const PROPERTY_TYPES = [
  { id: 1, name: 'Apartamento' },
  { id: 2, name: 'Casa' },
  { id: 3, name: 'Casa de Condomínio' },
  { id: 4, name: 'Terreno' },
  { id: 5, name: 'Sala Comercial' },
  { id: 6, name: 'Loja' },
  { id: 7, name: 'Galpão' },
  { id: 8, name: 'Fazenda' },
  { id: 9, name: 'Sítio' },
  { id: 10, name: 'Outro' },
]

const AMENITIES_LIST = [
  'Piscina', 'Academia', 'Salão de Festas', 'Churrasqueira',
  'Portaria 24h', 'Elevador', 'Playground', 'Quadra Esportiva',
  'Sauna', 'Pet Friendly', 'Varanda', 'Jardim',
  'Vista Mar', 'Segurança Eletrônica', 'Gerador', 'Depósito',
]

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: 'available',   label: 'Disponível' },
  { value: 'negotiating', label: 'Em Negociação' },
  { value: 'capturing',   label: 'Captando' },
  { value: 'sold',        label: 'Vendido' },
  { value: 'rented',      label: 'Alugado' },
  { value: 'inactive',    label: 'Inativo' },
]

const TRANSACTION_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'sale',         label: 'Venda' },
  { value: 'rent',         label: 'Locação' },
  { value: 'sale_or_rent', label: 'Venda ou Locação' },
]

const INITIAL_FORM = {
  title: '',
  transaction_type: 'sale' as TransactionType,
  status: 'available' as PropertyStatus,
  type_id: '',
  description: '',
  internal_code: '',
  is_exclusive: false,
  zip_code: '',
  address: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  price: '',
  condo_fee: '',
  iptu_yearly: '',
  area_total: '',
  area_useful: '',
  bedrooms: '',
  suites: '',
  bathrooms: '',
  parking_spots: '',
  floor: '',
  total_floors: '',
  amenities: [] as string[],
  owner_name: '',
  owner_phone: '',
  owner_email: '',
}

interface PendingFile { file: File; preview: string }

interface Props {
  open: boolean
  property: PropertyWithRelations | null
  agencyId: string
  onClose: () => void
  onSuccess: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t pt-5 mt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        {children}
      </p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

export function PropertyModal({ open, property, agencyId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [existingImages, setExistingImages] = useState<PropertyImage[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open && property) {
      setForm({
        title:            property.title,
        transaction_type: property.transaction_type,
        status:           property.status,
        type_id:          property.type_id ? String(property.type_id) : '',
        description:      property.description ?? '',
        internal_code:    property.internal_code ?? '',
        is_exclusive:     property.is_exclusive,
        zip_code:         property.zip_code ?? '',
        address:          property.address ?? '',
        number:           property.number ?? '',
        complement:       property.complement ?? '',
        neighborhood:     property.neighborhood ?? '',
        city:             property.city ?? '',
        state:            property.state ?? '',
        price:            property.price != null ? String(property.price) : '',
        condo_fee:        property.condo_fee != null ? String(property.condo_fee) : '',
        iptu_yearly:      property.iptu_yearly != null ? String(property.iptu_yearly) : '',
        area_total:       property.area_total != null ? String(property.area_total) : '',
        area_useful:      property.area_useful != null ? String(property.area_useful) : '',
        bedrooms:         property.bedrooms != null ? String(property.bedrooms) : '',
        suites:           property.suites != null ? String(property.suites) : '',
        bathrooms:        property.bathrooms != null ? String(property.bathrooms) : '',
        parking_spots:    property.parking_spots != null ? String(property.parking_spots) : '',
        floor:            property.floor != null ? String(property.floor) : '',
        total_floors:     property.total_floors != null ? String(property.total_floors) : '',
        amenities:        property.amenities ?? [],
        owner_name:       property.owner_name ?? '',
        owner_phone:      property.owner_phone ?? '',
        owner_email:      property.owner_email ?? '',
      })
      setExistingImages(property.property_images ?? [])
    } else if (open && !property) {
      setForm(INITIAL_FORM)
      setExistingImages([])
    }
    setPendingFiles([])
    setError(null)
    setUploadProgress(0)
  }, [open, property])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function numOrNull(v: string) {
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  function intOrNull(v: string) {
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newFiles = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPendingFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  function removePending(index: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function removeExisting(imageId: string, propertyId: string) {
    await fetch(`/api/properties/${propertyId}/images/${imageId}`, { method: 'DELETE' })
    setExistingImages(prev => prev.filter(img => img.id !== imageId))
  }

  async function setCover(imageId: string, propertyId: string) {
    await fetch(`/api/properties/${propertyId}/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_cover: true }),
    })
    setExistingImages(prev => prev.map(img => ({ ...img, is_cover: img.id === imageId })))
  }

  async function uploadImages(propertyId: string) {
    const total = pendingFiles.length
    if (total === 0) return
    const coverExists = existingImages.some(img => img.is_cover)

    for (let i = 0; i < total; i++) {
      const { file, preview } = pendingFiles[i]
      const sanitized = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${propertyId}/${Date.now()}_${sanitized}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError || !uploadData) continue

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(uploadData.path)

      const isCover = !coverExists && i === 0

      await fetch(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, is_cover: isCover, sort_order: existingImages.length + i }),
      })

      URL.revokeObjectURL(preview)
      setUploadProgress(Math.round(((i + 1) / total) * 100))
    }

    setPendingFiles([])
    setUploadProgress(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    setError(null)
    setLoading(true)

    const body = {
      title:            form.title.trim(),
      transaction_type: form.transaction_type,
      status:           form.status,
      type_id:          form.type_id ? Number(form.type_id) : null,
      description:      form.description || null,
      internal_code:    form.internal_code || null,
      is_exclusive:     form.is_exclusive,
      zip_code:         form.zip_code || null,
      address:          form.address || null,
      number:           form.number || null,
      complement:       form.complement || null,
      neighborhood:     form.neighborhood || null,
      city:             form.city || null,
      state:            form.state || null,
      price:            numOrNull(form.price),
      condo_fee:        numOrNull(form.condo_fee),
      iptu_yearly:      numOrNull(form.iptu_yearly),
      area_total:       numOrNull(form.area_total),
      area_useful:      numOrNull(form.area_useful),
      bedrooms:         intOrNull(form.bedrooms),
      suites:           intOrNull(form.suites),
      bathrooms:        intOrNull(form.bathrooms),
      parking_spots:    intOrNull(form.parking_spots),
      floor:            intOrNull(form.floor),
      total_floors:     intOrNull(form.total_floors),
      amenities:        form.amenities,
      owner_name:       form.owner_name || null,
      owner_phone:      form.owner_phone || null,
      owner_email:      form.owner_email || null,
    }

    const url = property ? `/api/properties/${property.id}` : '/api/properties'
    const method = property ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Erro ao salvar imóvel.')
      setLoading(false)
      return
    }

    const saved = await res.json()
    const savedId = (saved.data ?? saved).id ?? property?.id

    if (pendingFiles.length > 0 && savedId) {
      await uploadImages(savedId)
    }

    setLoading(false)
    onSuccess()
  }

  function toggleAmenity(amenity: string) {
    set('amenities', form.amenities.includes(amenity)
      ? form.amenities.filter(a => a !== amenity)
      : [...form.amenities, amenity]
    )
  }

  if (!open) return null

  const isEdit = !!property
  const busy = loading
  const uploadMsg = uploadProgress > 0 ? `Enviando fotos… ${uploadProgress}%` : ''

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={!busy ? onClose : undefined} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-background shadow-xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Editar imóvel' : 'Novo imóvel'}
          </h2>
          <button onClick={!busy ? onClose : undefined} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Dados Básicos ── */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Título" required>
                  <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Apartamento 3 quartos no Brooklin" />
                </Field>
              </div>

              <Field label="Tipo de imóvel">
                <select
                  value={form.type_id}
                  onChange={e => set('type_id', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecione</option>
                  {PROPERTY_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Código interno">
                <Input value={form.internal_code} onChange={e => set('internal_code', e.target.value)} placeholder="AP-001" />
              </Field>

              <Field label="Negociação" required>
                <select
                  value={form.transaction_type}
                  onChange={e => set('transaction_type', e.target.value as TransactionType)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {TRANSACTION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as PropertyStatus)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <div className="col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_exclusive}
                    onChange={e => set('is_exclusive', e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">Imóvel exclusivo</span>
                </label>
              </div>

              <div className="col-span-2">
                <Field label="Descrição">
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={3}
                    placeholder="Descrição completa do imóvel..."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Localização ── */}
          <SectionTitle>Localização</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CEP">
              <Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
            </Field>
            <Field label="Estado">
              <Input value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
            </Field>
            <div className="col-span-2">
              <Field label="Endereço">
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, Avenida..." />
              </Field>
            </div>
            <Field label="Número">
              <Input value={form.number} onChange={e => set('number', e.target.value)} placeholder="123" />
            </Field>
            <Field label="Complemento">
              <Input value={form.complement} onChange={e => set('complement', e.target.value)} placeholder="Apto 42" />
            </Field>
            <Field label="Bairro">
              <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Brooklin" />
            </Field>
            <Field label="Cidade">
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
            </Field>
          </div>

          {/* ── Valores ── */}
          <SectionTitle>Valores</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Preço (R$)">
              <Input type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Condomínio (R$)">
              <Input type="number" min="0" value={form.condo_fee} onChange={e => set('condo_fee', e.target.value)} placeholder="0" />
            </Field>
            <Field label="IPTU anual (R$)">
              <Input type="number" min="0" value={form.iptu_yearly} onChange={e => set('iptu_yearly', e.target.value)} placeholder="0" />
            </Field>
          </div>

          {/* ── Características ── */}
          <SectionTitle>Características</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Área total (m²)">
              <Input type="number" min="0" value={form.area_total} onChange={e => set('area_total', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Área útil (m²)">
              <Input type="number" min="0" value={form.area_useful} onChange={e => set('area_useful', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Quartos">
              <Input type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Suítes">
              <Input type="number" min="0" value={form.suites} onChange={e => set('suites', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Banheiros">
              <Input type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Vagas">
              <Input type="number" min="0" value={form.parking_spots} onChange={e => set('parking_spots', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Andar">
              <Input type="number" min="0" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="1" />
            </Field>
            <Field label="Total de andares">
              <Input type="number" min="0" value={form.total_floors} onChange={e => set('total_floors', e.target.value)} placeholder="10" />
            </Field>
          </div>

          {/* Amenidades */}
          <div className="mt-4">
            <p className="text-sm font-medium mb-3">Comodidades</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {AMENITIES_LIST.map(amenity => (
                <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          {/* ── Proprietário ── */}
          <SectionTitle>Proprietário</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Nome">
                <Input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Nome do proprietário" />
              </Field>
            </div>
            <Field label="Telefone">
              <Input value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="proprietario@email.com" />
            </Field>
          </div>

          {/* ── Fotos ── */}
          <SectionTitle>Fotos</SectionTitle>

          {/* Existing images */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {existingImages.map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.is_cover && (
                    <span className="absolute top-1 left-1 text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-semibold">
                      Capa
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.is_cover && property && (
                      <button
                        type="button"
                        onClick={() => setCover(img.id, property.id)}
                        className="p-1 bg-yellow-400 rounded text-yellow-900 hover:bg-yellow-300"
                        title="Definir como capa"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {property && (
                      <button
                        type="button"
                        onClick={() => removeExisting(img.id, property.id)}
                        className="p-1 bg-red-500 rounded text-white hover:bg-red-400"
                        title="Remover foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending previews */}
          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
                  <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                    Nova
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="p-1 bg-red-500 rounded text-white hover:bg-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Upload className="h-4 w-4" />
            Selecionar fotos
          </button>

          {/* Error */}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0">
          {uploadMsg && <p className="text-xs text-muted-foreground">{uploadMsg}</p>}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? (uploadMsg || 'Salvando…') : isEdit ? 'Salvar alterações' : 'Cadastrar imóvel'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
