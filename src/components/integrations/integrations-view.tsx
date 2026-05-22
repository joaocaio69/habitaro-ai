'use client'

import { useState } from 'react'
import { Wifi, WifiOff, Loader2, Copy, Trash2, Link2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ZaptosInstance } from '@/types/database'

function statusBadge(status: string) {
  if (status === 'connected')
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
        <Wifi className="h-3 w-3" /> Conectado
      </span>
    )
  if (status === 'connecting')
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
        <Loader2 className="h-3 w-3 animate-spin" /> Conectando…
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
      <WifiOff className="h-3 w-3" /> Desconectado
    </span>
  )
}

interface Props {
  instance: ZaptosInstance | null
}

export function IntegrationsView({ instance: initial }: Props) {
  const [instance, setInstance] = useState(initial)
  const [instanceName, setInstanceName] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook/zaptos`
      : '/api/webhook/zaptos'

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/zaptos/instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_name: instanceName.trim(), token: token.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Erro ao conectar.')
    } else {
      setInstance(json)
      setInstanceName('')
      setToken('')
    }
    setLoading(false)
  }

  async function handleDisconnect() {
    setDeleting(true)
    await fetch('/api/zaptos/instance', { method: 'DELETE' })
    setInstance(null)
    setConfirmDelete(false)
    setDeleting(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conecte ferramentas externas ao Habitaro AI.
        </p>
      </div>

      {/* ZaptoWPP card */}
      <div className="rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">ZaptoWPP</p>
              <p className="text-xs text-muted-foreground">WhatsApp para leads e corretores</p>
            </div>
          </div>
          {instance && statusBadge(instance.status)}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Webhook URL — always visible */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              URL do Webhook
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 border border-border truncate font-mono">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border hover:bg-muted"
              >
                {copied
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copiado</>
                  : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure este URL no painel da ZaptoWPP antes de conectar.
            </p>
          </div>

          {/* Connected state */}
          {instance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 px-4 py-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Instância</p>
                  <p className="font-medium">{instance.instance_name}</p>
                </div>
                {instance.phone_number && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Número</p>
                    <p className="font-medium">{instance.phone_number}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Conectado desde{' '}
                  {new Date(instance.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </p>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confirmar desconexão?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDisconnect}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Desconectar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive gap-1.5"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Connect form */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome da instância</Label>
                  <Input
                    placeholder="ex: habitaro-sp"
                    value={instanceName}
                    onChange={e => setInstanceName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Token da instância</Label>
                  <Input
                    type="password"
                    placeholder="Token gerado na ZaptoWPP"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Conectando…</>
                  : 'Conectar ZaptoWPP'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
