// Fechas de vencimiento por modalidad.
// group/individual: ciclo mensual (día 2 renovación, día 5 corte).
// intensive:        15 días de acceso + 15 días para renovar (due_at + 15).
// scholarship/free: sin fechas.

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 12, 0, 0))
}

export function nextPayDay(from: Date = new Date()): Date {
  const d = from.getUTCDate()
  let target = utcDate(from.getUTCFullYear(), from.getUTCMonth(), 2)
  if (d >= 2) target = utcDate(from.getUTCFullYear(), from.getUTCMonth() + 1, 2)
  return target
}

export function schedulePayDates(from: Date = new Date(), courseType?: string): { due_at: string; expires_at: string } | {} {
  if (courseType === 'intensive') {
    const due = utcDate(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 15)
    const expires = utcDate(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 15)
    return { due_at: due.toISOString(), expires_at: expires.toISOString() }
  }
  const due = nextPayDay(from)
  const expires = utcDate(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 3)
  return { due_at: due.toISOString(), expires_at: expires.toISOString() }
}

export function dueTs(p: { due_at?: string | null }): number | null {
  return p.due_at ? new Date(p.due_at).getTime() : null
}

export function expiresTs(p: { expires_at?: string | null }): number | null {
  return p.expires_at ? new Date(p.expires_at).getTime() : null
}
