'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, XCircle } from 'lucide-react'

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(!!token)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate invitation token on mount
  useEffect(() => {
    if (!token) return
    setValidating(true)
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then((data: { email?: string; error?: string }) => {
        if (data.email) {
          setEmail(data.email)
        } else {
          setTokenError(data.error ?? 'Link inválido.')
        }
      })
      .catch(() => setTokenError('Erro ao validar o link.'))
      .finally(() => setValidating(false))
  }, [token])

  // No token — redirect to /planos
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Para criar uma conta, você precisa assinar um plano primeiro.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/planos">
              <Button>Ver planos</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Token invalid / expired
  if (!validating && tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>{tokenError}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-3 flex-col">
            <Link href="/planos">
              <Button>Ver planos</Button>
            </Link>
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:underline">
              Já tenho conta
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Mark invitation token as used
    await fetch(`/api/invite/${token}`, { method: 'POST' })

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Habitaro AI</CardTitle>
          <CardDescription>
            {validating ? 'Validando seu link…' : 'Crie sua conta para começar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validating ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="João da Silva"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando conta…</>
                  : 'Criar conta'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/auth/login" className="underline hover:text-foreground">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
