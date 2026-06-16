export function parseDateTime(value: string): string {
  if (!value) return new Date().toISOString()
  if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value).toISOString()
  }
  return new Date(value + 'Z').toISOString()
}

export function parseDateOnly(value: string): string {
  if (!value) return new Date().toISOString().slice(0, 10)
  return new Date(value + 'T12:00:00Z').toISOString().slice(0, 10)
}

export function parseDateTimeLocal(value: string, tzOffsetMinutes: number): string {
  if (!value) return new Date().toISOString()
  const d = new Date(value + (tzOffsetMinutes >= 0 ? '-' : '+') +
    String(Math.abs(tzOffsetMinutes) / 60).padStart(2, '0') + ':' +
    String(Math.abs(tzOffsetMinutes) % 60).padStart(2, '0'))
  return d.toISOString()
}
