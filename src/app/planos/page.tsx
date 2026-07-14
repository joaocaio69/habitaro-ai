'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  'CRM completo para imobiliárias',
  'Chat WhatsApp integrado (ZaptoWPP)',
  'Pipeline de negociações (Kanban)',
  'Gestão de imóveis e clientes',
  'Agenda e Google Calendar',
  'Relatórios e dashboard em tempo real',
  'Suporte via WhatsApp',
]

export default function PlanosPage() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/hypercash/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const json = await res.json() as { url?: string; error?: string }
      if (json.url) window.location.href = json.url
      else alert(json.error ?? 'Erro ao iniciar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Habitaro AI</h1>
        <p className="mt-2 text-muted-foreground text-base">O CRM completo para a sua imobiliária</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Plan header */}
        <div className="bg-foreground px-8 py-8 text-center">
          <p className="text-sm font-semibold text-background/60 uppercase tracking-widest mb-1">Plano Pro</p>
          <div className="flex items-end justify-center gap-1">
            <span className="text-background/60 text-lg self-start mt-2">R$</span>
            <span className="text-5xl font-bold text-background tracking-tight">147</span>
            <span className="text-background/60 text-base self-end mb-1">/mês</span>
          </div>
          <p className="mt-3 text-sm text-background/50">Cancele quando quiser</p>
        </div>

        {/* Features */}
        <div className="px-8 py-7 space-y-3.5">
          {features.map(f => (
            <div key={f} className="flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-green-600 stroke-[3]" />
              </div>
              <span className="text-sm text-foreground/80">{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8">
          <Button className="w-full h-11 text-base" onClick={handleCheckout} disabled={loading}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aguarde…</>
              : 'Assinar agora'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pagamento seguro via Hypercash · Cartão de crédito
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Já tem uma conta?{' '}
        <a href="/auth/login" className="underline hover:text-foreground">Entrar</a>
      </p>
    </div>
  )
}
