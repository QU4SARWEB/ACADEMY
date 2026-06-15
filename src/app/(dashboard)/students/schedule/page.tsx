import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default async function StudentSchedulePage() {
  const supabase = await createClient()

  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('season_id', activeSeason?.id ?? 'none')
    .eq('type', 'academic')
    .order('week_number')
    .order('day_of_week')
    .order('start_time')

  const grouped: Record<number, typeof schedules> = {}
  for (const s of schedules ?? []) {
    if (!grouped[s.week_number]) grouped[s.week_number] = []
    grouped[s.week_number]!.push(s)
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Horario académico</h1>

      {Object.keys(grouped).length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Calendar size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No hay horario publicado todavía.</p>
        </div>
      )}

      {Object.entries(grouped).map(([week, entries]) => {
        if (!entries) return null
        return (
          <div key={week} className="mb-6">
            <h2 className="mb-3 font-heading text-lg font-bold text-white">Semana {week}</h2>
            <div className="space-y-2">
              {entries.map((s) => (
                <div key={s.id} className="glass flex items-center gap-4 rounded-xl px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Calendar size={18} className="text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{s.title}</p>
                    <p className="text-xs text-zinc-500">
                      {DAYS[s.day_of_week]} · {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
