'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { WifiOff, Loader2, Copy, Trash2, Link2, CheckCircle2, ExternalLink, Calendar, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ZaptosInstance } from '@/types/database'


interface Props {
  instance: ZaptosInstance | null
  googleConnected: boolean
}

export function IntegrationsView({ instance: initial, googleConnected: initialGoogle }: Props) {
  const [instance, setInstance] = useState(initial)
  const [googleConnected, setGoogleConnected] = useState(initialGoogle)
  const [googleNotice, setGoogleNotice] = useState<'ok' | 'error' | null>(null)
  const [instanceName, setInstanceName] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_ok')) { setGoogleConnected(true); setGoogleNotice('ok') }
    if (params.get('google_error')) setGoogleNotice('error')
  }, [])
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
          {instance ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <WifiOff className="h-3 w-3" /> Desconectado
            </span>
          )}
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
            <>
            <a
              href="https://panel.zaptoswpp.com/registration/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-green-800">Ainda não tem conta na ZaptoWPP?</p>
                <p className="text-xs text-green-700 mt-0.5">Crie sua conta e escolha um plano para começar.</p>
              </div>
              <ExternalLink className="h-4 w-4 text-green-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </a>
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
            </>
          )}
        </div>
      </div>

      {/* Google Calendar card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Sincronize compromissos em tempo real</p>
            </div>
          </div>
          {googleConnected
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle className="h-3 w-3" /> Conectado</span>
            : <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full"><WifiOff className="h-3 w-3" /> Não conectado</span>
          }
        </div>

        <div className="px-6 py-5 space-y-4">
          {googleNotice === 'ok' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Google Calendar conectado! Seus compromissos serão sincronizados automaticamente.
            </div>
          )}
          {googleNotice === 'error' && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
              Erro ao conectar. Tente novamente.
            </p>
          )}

          {googleConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Novos compromissos criados no CRM serão adicionados ao seu Google Calendar automaticamente. Alterações e exclusões também são sincronizadas.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={async () => {
                  await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' })
                  setGoogleConnected(false)
                  setGoogleNotice(null)
                }}
              >
                Desconectar Google Calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Google para sincronizar compromissos entre o CRM e o Google Calendar.
              </p>
              <Button className="gap-2" onClick={() => { window.location.href = '/api/auth/google-calendar' }}>
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Conectar Google Calendar</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
