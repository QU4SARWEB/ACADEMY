import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'

async function createSchedule(formData: FormData) {
  'use server'
  const supabase = await createClient()

  await supabase.from('schedules').insert({
    season_id: formData.get('seasonId') as string,
    week_number: parseInt(formData.get('weekNumber') as string),
    day_of_week: parseInt(formData.get('dayOfWeek') as string),
    start_time: formData.get('startTime') as string,
    end_time: formData.get('endTime') as string,
    type: formData.get('type') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    location: formData.get('location') as string || null,
  })

  revalidatePath('/coaches/schedules')
  redirect('/coaches/schedules')
}

async function deleteSchedule(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('schedules').delete().eq('id', formData.get('id') as string)
  revalidatePath('/coaches/schedules')
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default async function SchedulesPage() {
  const supabase = await createClient()
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, seasons(name)')
    .order('week_number')
    .order('day_of_week')
    .order('start_time')

  const { data: seasons } = await supabase.from('seasons').select('id, name, is_active')
  const { data: activeSeason } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Horarios</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#111]">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Semana</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Día</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Horario</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Título</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Ubicación</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Season</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(schedules ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">Sin horarios programados.</td>
                  </tr>
                )}
                {(schedules ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800 transition hover:bg-[#111]">
                    <td className="px-4 py-3 text-zinc-300">Semana {s.week_number}</td>
                    <td className="px-4 py-3 text-zinc-300">{DAYS[s.day_of_week]}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                    <td className="px-4 py-3 font-medium text-white" title={s.description ?? ''}>
                      {s.title}
                      {s.description && <span className="ml-1 text-xs text-zinc-500">ℹ</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{s.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${s.type === 'academic' ? 'text-purple-400' : 'text-green-400'}`}>
                        {s.type === 'academic' ? 'Académico' : 'Competitivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{s.seasons?.name}</td>
                    <td className="px-4 py-3">
                      <form action={deleteSchedule}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="glass rounded-xl p-5">
            <h2 className="font-heading text-lg font-bold text-white">Nuevo horario</h2>
            <form action={createSchedule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Título</label>
                <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Semana (1-24)</label>
                  <input name="weekNumber" type="number" min={1} max={24} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Día</label>
                  <select name="dayOfWeek" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Inicio</label>
                  <input name="startTime" type="time" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Fin</label>
                  <input name="endTime" type="time" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">Tipo</label>
                <select name="type" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="academic">Académico</option>
                  <option value="competitive">Competitivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">Descripción (opcional)</label>
                <textarea name="description" rows={2} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">Ubicación / Link (opcional)</label>
                <input name="location" placeholder="Ej: Sala A / https://..." className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">Season</label>
                <select name="seasonId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  {(seasons ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Activa)' : ''}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-glow w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                Programar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
