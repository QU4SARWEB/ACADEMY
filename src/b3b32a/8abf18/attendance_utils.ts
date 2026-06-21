import { Icon } from '@/2b3583/bd2119'

export const STATUS_LABELS: Record<string, string> = {
  present: 'Presente', absent: 'Ausente', late: 'Tardanza', excused: 'Justificado',
}

export const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500/20 text-green-400', absent: 'bg-red-500/20 text-red-400',
  late: 'bg-yellow-500/20 text-yellow-400', excused: 'bg-blue-500/20 text-blue-400',
}

export const STATUS_ICONS: Record<string, string> = {
  present: Icon('checkCircle', 14), absent: Icon('x', 14),
  late: Icon('alertTriangle', 14), excused: Icon('info', 14),
}

export const STATUSES = ['present', 'absent', 'late', 'excused'] as const
export const CYCLE_ORDER = ['', 'present', 'absent', 'late', 'excused']
