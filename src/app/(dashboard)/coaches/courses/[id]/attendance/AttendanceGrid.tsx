'use client'

import { useState } from 'react'
import { Check, X, Clock, HelpCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tardanza',
  excused: 'Justificado',
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500/20 text-green-400',
  absent: 'bg-red-500/20 text-red-400',
  late: 'bg-yellow-500/20 text-yellow-400',
  excused: 'bg-blue-500/20 text-blue-400',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  present: <Check size={14} />,
  absent: <X size={14} />,
  late: <Clock size={14} />,
  excused: <HelpCircle size={14} />,
}

export default function AttendanceGrid({
  courseId,
  enrollments,
  attendanceMap,
  dates,
}: {
  courseId: string
  enrollments: any[]
  attendanceMap: Record<string, any[]>
  dates: string[]
}) {
  const supabase = createClient()
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [updating, setUpdating] = useState<string | null>(null)

  async function setAttendance(enrollmentId: string, date: string, status: string) {
    setUpdating(`${enrollmentId}-${date}`)
    try {
      const existing = attendanceMap[enrollmentId]?.find((r) => r.date === date)
      if (existing) {
        if (status === 'none') {
          await supabase.from('attendance').delete().eq('id', existing.id)
        } else {
          await supabase.from('attendance').update({ status }).eq('id', existing.id)
        }
      } else if (status !== 'none') {
        const { data: season } = await supabase
          .from('enrollments')
          .select('season_id')
          .eq('id', enrollmentId)
          .maybeSingle()

        await supabase.from('attendance').insert({
          enrollment_id: enrollmentId,
          season_id: season?.season_id,
          date,
          status,
        })
      }
    } finally {
      setUpdating(null)
    }
  }

  async function addDate() {
    if (!newDate) return
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <p className="text-xs text-zinc-500">Selecciona una fecha y haz clic en el estado de cada alumno.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="sticky left-0 z-10 bg-zinc-900/50 px-4 py-3 font-medium text-zinc-400">
                Alumno
              </th>
              {dates.map((d) => (
                <th key={d} className="min-w-[100px] px-3 py-3 text-center text-xs text-zinc-500">
                  {new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </th>
              ))}
              <th className="min-w-[100px] px-3 py-3 text-center text-xs text-purple-400">
                {newDate ? new Date(newDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Nueva'}
              </th>
            </tr>
          </thead>
          <tbody>
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={dates.length + 2} className="px-4 py-8 text-center text-zinc-500">
                  No hay alumnos inscritos en este curso.
                </td>
              </tr>
            )}
            {enrollments.map((enr: any) => (
              <tr key={enr.id} className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30">
                <td className="sticky left-0 z-10 flex items-center gap-2 bg-[#0A0A0A] px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                    {enr.profiles?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <span className="text-white">{enr.profiles?.full_name}</span>
                </td>
                {dates.map((d) => {
                  const record = attendanceMap[enr.id]?.find((r: any) => r.date === d)
                  return (
                    <td key={`${enr.id}-${d}`} className="px-3 py-3 text-center">
                      {record ? (
                        <button
                          onClick={() => {
                            const next = record.status === 'present' ? 'absent' : record.status === 'absent' ? 'late' : record.status === 'late' ? 'excused' : 'none'
                            setAttendance(enr.id, d, next)
                          }}
                          disabled={updating === `${enr.id}-${d}`}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[record.status]}`}
                        >
                          {STATUS_ICONS[record.status]}
                          {STATUS_LABELS[record.status]}
                        </button>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {(['present', 'absent', 'late', 'excused'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAttendance(enr.id, newDate, s)}
                        disabled={updating === `${enr.id}-${newDate}`}
                        className={`rounded-full p-1.5 text-xs transition hover:scale-110 ${STATUS_COLORS[s]}`}
                        title={STATUS_LABELS[s]}
                      >
                        {STATUS_ICONS[s]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
