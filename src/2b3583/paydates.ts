// Fechas del ciclo mensual de pagos.
// due_at:     día 2 del mes (renovación).
// expires_at: día 5 del mes de due_at (corte con 3 días de gracia).

export function nextPayDay(from: Date = new Date()): Date {
  const d = from.getDate()
  let target = new Date(from.getFullYear(), from.getMonth(), 2)
  if (d >= 2) target = new Date(from.getFullYear(), from.getMonth() + 1, 2)
  return target
}

export function schedulePayDates(from: Date = new Date()): { due_at: string; expires_at: string } {
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
