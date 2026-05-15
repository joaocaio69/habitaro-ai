'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadModal } from './lead-modal'
import type { Client } from '@/types/database'

export function ClientDetailActions({ client }: { client: Client }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>
      <LeadModal
        open={open}
        client={client}
        onClose={() => setOpen(false)}
        onSuccess={() => { setOpen(false); router.refresh() }}
      />
    </>
  )
}
