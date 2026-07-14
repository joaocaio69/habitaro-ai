'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, LogOut, CheckCircle2 } from 'lucide-react'

type Profile = {
  full_name: string
  creci: string
  phone: string
  city: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile>({ full_name: '', creci: '', phone: '', city: '' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [accountSuccess, setAccountSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('full_name, creci, phone, city')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          full_name: data.full_name ?? '',
          creci: data.creci ?? '',
          phone: data.phone ?? '',
          city: data.city ?? '',
        })
      }
      setLoadingProfile(false)
    }
    load()
  }, [supabase])

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setSavingAccount(true)
    setAccountError(null)
    setAccountSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        creci: profile.creci || null,
        phone: profile.phone || null,
        city: profile.city || null,
      })
      .eq('id', user.id)

    if (error) {
      setAccountError('Erro ao salvar. Tente novamente.')
    } else {
      setAccountSuccess(true)
      setTimeout(() => setAccountSuccess(false), 3000)
    }
    setSavingAccount(false)
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setPasswordError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setSavingPassword(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    startTransition(() => router.push('/auth/login'))
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie sua conta e perfil profissional.</p>
      </div>

      {/* Minha conta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minha conta</CardTitle>
          <CardDescription>Nome de exibição e dados de contato.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={email} readOnly className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Seu nome"
                required
              />
            </div>

            <hr className="border-border" />

            <p className="text-sm font-medium text-foreground">Perfil profissional</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creci">CRECI</Label>
                <Input
                  id="creci"
                  value={profile.creci}
                  onChange={e => setProfile(p => ({ ...p, creci: e.target.value }))}
                  placeholder="123456-F"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade de atuação</Label>
              <Input
                id="city"
                value={profile.city}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                placeholder="São Paulo, SP"
              />
            </div>

            {accountError && <p className="text-sm text-destructive">{accountError}</p>}
            {accountSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Salvo com sucesso.
              </p>
            )}
            <Button type="submit" disabled={savingAccount}>
              {savingAccount ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Senha alterada com sucesso.
              </p>
            )}
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando…</> : 'Alterar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Plano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Habitaro AI Pro</p>
              <p className="text-xs text-muted-foreground">R$ 147/mês · Renovação automática</p>
            </div>
            <span className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-medium">Ativo</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Para cancelar sua assinatura, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>

      {/* Sair */}
      <div className="pt-2">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
