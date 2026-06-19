import Link from 'next/link'
import { CheckCircle2, Mail } from 'lucide-react'

export default function PagamentoSucesso() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Pagamento confirmado!</h1>
          <p className="text-muted-foreground">
            Em instantes você receberá um e-mail com o link para criar sua conta e acessar o Habitaro AI.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-6 py-5 flex items-start gap-4 text-left">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Verifique sua caixa de entrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              O e-mail pode levar até 2 minutos para chegar. Confira também a pasta de spam.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Já tem sua conta?{' '}
          <Link href="/auth/login" className="underline hover:text-foreground">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
