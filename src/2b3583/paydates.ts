// Fechas de vencimiento por modalidad.
// group/individual: ciclo mensual (día 2 renovación, día 5 corte).
// intensive:        15 días de acceso + 15 días para renovar (due_at + 15).
// scholarship/free: sin fechas.

export function nextPayDay(from: Date = new Date()): Date {
  const d = from.getDate()
  let target = new Date(from.getFullYear(), from.getMonth(), 2)
  if (d >= 2) target = new Date(from.getFullYear(), from.getMonth() + 1, 2)
  return target
}

export function schedulePayDates(from: Date = new Date(), courseType?: string): { due_at: string; expires_at: string } | {} {
  if (courseType === 'intensive') {
    const due = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 15)
    const expires = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 15)
    return { due_at: due.toISOString(), expires_at: expires.toISOString() }
  }
  const due = nextPayDay(from)
  const expires = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 3)
  return { due_at: due.toISOString(), expires_at: expires.toISOString() }
}

export function dueTs(p: { due_at?: string | null }): number | null {
  return p.due_at ? new Date(p.due_at).getTime() : null
}

export function expiresTs(p: { expires_at?: string | null }): number | null {
  return p.expires_at ? new Date(p.expires_at).getTime() : null
}
