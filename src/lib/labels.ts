export const clientStatusLabel: Record<string, string> = {
  lead: 'Lead', active: 'Ativo', inactive: 'Inativo', converted: 'Convertido', lost: 'Perdido',
}

export const clientStatusColor: Record<string, string> = {
  lead:      'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-amber-100 text-amber-700',
  converted: 'bg-purple-100 text-purple-700',
  lost:      'bg-red-100 text-red-700',
}

export const sourceLabel: Record<string, string> = {
  referral: 'Indicação', portal: 'Portal', instagram: 'Instagram',
  facebook: 'Facebook', google: 'Google', whatsapp: 'WhatsApp',
  cold_call: 'Ligação', event: 'Evento', other: 'Outro',
}

export const intentLabel: Record<string, string> = {
  buy: 'Comprar', rent: 'Alugar', sell: 'Vender', buy_and_sell: 'Comprar e Vender',
}

export const activityTypeLabel: Record<string, string> = {
  call: 'Ligação', visit: 'Visita', meeting: 'Reunião',
  task: 'Tarefa', email: 'E-mail', whatsapp: 'WhatsApp', note: 'Nota',
}

export const activityStatusLabel: Record<string, string> = {
  pending: 'Pendente', completed: 'Concluída', cancelled: 'Cancelada',
}

export const activityStatusColor: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export const propertyStatusLabel: Record<string, string> = {
  available:   'Disponível',
  negotiating: 'Em Negociação',
  sold:        'Vendido',
  rented:      'Alugado',
  inactive:    'Inativo',
  capturing:   'Captando',
}

export const propertyStatusColor: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  negotiating: 'bg-amber-100 text-amber-700',
  sold:        'bg-purple-100 text-purple-700',
  rented:      'bg-blue-100 text-blue-700',
  inactive:    'bg-zinc-100 text-zinc-600',
  capturing:   'bg-sky-100 text-sky-700',
}

export const transactionTypeLabel: Record<string, string> = {
  sale:         'Venda',
  rent:         'Locação',
  sale_or_rent: 'Venda/Locação',
}

export const transactionTypeColor: Record<string, string> = {
  sale:         'bg-indigo-100 text-indigo-700',
  rent:         'bg-teal-100 text-teal-700',
  sale_or_rent: 'bg-violet-100 text-violet-700',
}
