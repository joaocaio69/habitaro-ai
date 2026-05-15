'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PropertyModal } from './property-modal'
import { clientStatusLabel, clientStatusColor } from '@/lib/labels'
import type { PropertyWithRelations, Client } from '@/types/database'

interface InterestedClient {
  client_id: string
  property_id: string
  notes: string | null
  created_at: string
  clients: Pick<Client, 'id' | 'full_name' | 'phone' | 'email' | 'status'>
}

interface Props {
  property: PropertyWithRelations
  agencyId: string
  interestedClients: InterestedClient[]
}

export function PropertyDetailActions({ property, agencyId, interestedClients: initial }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [interested, setInterested] = useState(initial)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Pick<Client, 'id' | 'full_name' | 'status'>[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=5`)
    if (res.ok) {
      const json = await res.json()
      const results = (json.data ?? []) as Pick<Client, 'id' | 'full_name' | 'status'>[]
      // exclude already linked
      const linkedIds = new Set(interested.map(i => i.client_id))
      setSearchResults(results.filter(c => !linkedIds.has(c.id)))
    }
    setSearching(false)
  }

  async function linkClient(client: Pick<Client, 'id' | 'full_name' | 'status'>) {
    setLinking(true)
    const res = await fetch(`/api/properties/${property.id}/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id }),
    })
    if (res.ok) {
      const json = await res.json()
      setInterested(prev => [json.data ?? json, ...prev])
    }
    setSearchQuery('')
    setSearchResults([])
    setLinking(false)
  }

  async function unlinkClient(clientId: string) {
    await fetch(`/api/properties/${property.id}/interests/${clientId}`, { method: 'DELETE' })
    setInterested(prev => prev.filter(i => i.client_id !== clientId))
  }

  return (
    <>
      {/* Edit button */}
      <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      {/* Leads interessados */}
      <div className="rounded-xl ring-1 ring-foreground/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Leads Interessados</h3>
          <span className="text-xs text-muted-foreground">{interested.length}</span>
        </div>

        {/* Search to add */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar lead para vincular..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border bg-card shadow-lg py-1">
              {searchResults.map(client => (
                <button
                  key={client.id}
                  disabled={linking}
                  onClick={() => linkClient(client)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <span>{client.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${clientStatusColor[client.status]}`}>
                    {clientStatusLabel[client.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchQuery && !searching && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border bg-card shadow-lg py-3 px-3 text-sm text-muted-foreground">
              Nenhum lead encontrado.
            </div>
          )}
        </div>

        {/* List */}
        {interested.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum lead vinculado.
          </p>
        ) : (
          <div className="divide-y">
            {interested.map(i => (
              <div key={i.client_id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <a
                    href={`/clients/${i.clients.id}`}
                    className="text-sm font-medium hover:underline block truncate"
                  >
                    {i.clients.full_name}
                  </a>
                  {i.clients.phone && (
                    <p className="text-xs text-muted-foreground">{i.clients.phone}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${clientStatusColor[i.clients.status]}`}>
                  {clientStatusLabel[i.clients.status]}
                </span>
                <button
                  onClick={() => unlinkClient(i.client_id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PropertyModal
        open={modalOpen}
        property={property}
        agencyId={agencyId}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); router.refresh() }}
      />
    </>
  )
}
