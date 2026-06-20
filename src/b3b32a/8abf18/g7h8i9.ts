import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

export function renderCoachAttendanceOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachAttendanceOverview(): Promise<void> {
  try {
    const { data: courses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courseIds = (courses ?? []).map(c => c.id)
    const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', courseIds.length > 0 ? courseIds : ['none'])
    const countByCourse: Record<string, number> = {}
    for (const e of enrolls ?? []) {
      if (!countByCourse[e.course_id]) countByCourse[e.course_id] = 0
      countByCourse[e.course_id]++
    }
    const html = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Asistencias</h1><p class="mt-1 text-sm text-zinc-500">${(courses ?? []).length} cursos activos · ${(enrolls ?? []).length} inscripciones</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${(courses ?? []).map(c => '<a href="#/coaches/courses/' + c.id + '/attendance" class="glass rounded-xl p-5 transition hover:scale-[1.02] hover:shadow-lg"><div class="flex items-center justify-between"><div><h3 class="font-medium text-white">' + escapeHtml(c.name) + '</h3><p class="mt-1 text-sm text-zinc-500">' + (countByCourse[c.id] || 0) + ' estudiantes</p></div>' + Icon('chevronRight', 20) + '</div></a>').join('')}
      </div>`
    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading attendance overview:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencias</p>'
  }
}
