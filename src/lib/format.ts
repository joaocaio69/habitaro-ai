const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const DATETIME = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const formatCurrency = (v: number | null) => v != null ? BRL.format(v) : '—'
export const formatDate = (v: string | null) => v ? DATE.format(new Date(v)) : '—'
export const formatDateTime = (v: string | null) => v ? DATETIME.format(new Date(v)) : '—'

export function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return '—'
  if (min && max) return `${formatCurrency(min)} – ${formatCurrency(max)}`
  if (min) return `A partir de ${formatCurrency(min)}`
  return `Até ${formatCurrency(max!)}`
}
