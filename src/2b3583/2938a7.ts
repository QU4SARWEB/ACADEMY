// Timezone utilities for schedule display
// Converts a time string from a source timezone to the user's local timezone

export function getTZOffset(tz: string): number {
  try {
    const now = new Date()
    const utcStr = now.toLocaleString('en', { timeZone: 'UTC', hour12: false })
    const tzStr = now.toLocaleString('en', { timeZone: tz, hour12: false })
    const utcH = parseInt(utcStr.split(',')[1]?.trim().split(':')[0] || '0')
    const tzH = parseInt(tzStr.split(',')[1]?.trim().split(':')[0] || '0')
    const utcD = parseInt(utcStr.split(',')[0]?.split('/')[1]?.trim() || '1')
    const tzD = parseInt(tzStr.split(',')[0]?.split('/')[1]?.trim() || '1')
    let diff = tzH - utcH
    if (tzD > utcD) diff += 24
    if (tzD < utcD) diff -= 24
    return diff
  } catch {
    return 0
  }
}

export function getLocalTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function convertTime(timeStr: string, sourceTZ: string): string {
  if (!sourceTZ || sourceTZ === getLocalTZ()) return timeStr
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const sourceOff = getTZOffset(sourceTZ)
    const localOff = -new Date().getTimezoneOffset() / 60
    let localH = h - sourceOff + localOff
    localH = ((localH % 24) + 24) % 24
    return `${Math.floor(localH).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  } catch {
    return timeStr
  }
}

export function formatTimeWithTZ(timeStr: string, sourceTZ: string): string {
  const local = convertTime(timeStr, sourceTZ)
  if (local === timeStr) return local
  return local
}
