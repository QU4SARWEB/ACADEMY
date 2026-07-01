import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { renderSchedulePage } from '@/b3b32a/shared/schedule'

export function renderPlayerSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [{ data: seasons }, { data: schedules }] = await Promise.all([
      supabase.from('courses').select('id, name').eq('is_active', true).maybeSingle(),
      supabase.from('schedules').select('*').eq('type', 'competitive').order('day_of_week').order('start_time'),
    ])

    if (!seasons) {
      document.getElementById('page-content')!.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay curso activo.</p></div>'
      return
    }

    const seasonScheds = (schedules ?? []).filter((s: any) => s.course_id === seasons.id)
    renderSchedulePage(seasonScheds, 'Horario competitivo', seasons.name, 'sword', 'ring-1 ring-green-400/30', 'entrenamiento')
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
