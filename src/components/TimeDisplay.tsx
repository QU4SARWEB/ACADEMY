'use client'

export function TimeDisplay({ date, format }: { date: string; format?: 'full' | 'date' | 'time' }) {
  const d = new Date(date)
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  switch (format) {
    case 'date':
      opts.year = 'numeric'
      opts.month = 'long'
      opts.day = 'numeric'
      break
    case 'time':
      opts.hour = '2-digit'
      opts.minute = '2-digit'
      break
    default:
      opts.year = 'numeric'
      opts.month = 'long'
      opts.day = 'numeric'
      opts.hour = '2-digit'
      opts.minute = '2-digit'
  }

  return <span>{d.toLocaleString('es-ES', opts)}</span>
}
