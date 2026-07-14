const HYPERCASH_BASE = 'https://api.hypercashbrasil.com.br'

function authHeader(): string {
  const key = process.env.HYPERCASH_SECRET_KEY
  if (!key) throw new Error('HYPERCASH_SECRET_KEY is not configured')
  return 'Basic ' + Buffer.from(`x:${key}`).toString('base64')
}

export async function hypercashFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${HYPERCASH_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      ...(options.headers as Record<string, string>),
    },
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Hypercash ${res.status}: ${text}`)

  return JSON.parse(text) as T
}
