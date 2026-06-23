import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

export function renderCoachGradesList(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachGradesList(): Promise<void> {
  try {
    const { data: courses } = await supabase.from('courses').select('*').order('display_order')
    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const [{ data: exams }, { data: enrolls }, { data: tasks }] = await Promise.all([
      supabase.from('exams').select('course_id').in('course_id', idFilter),
      supabase.from('enrollments').select('course_id').in('course_id', idFilter),
      supabase.from('tasks').select('course_id').in('course_id', idFilter),
    ])
    const examCount: Record<string, number> = {}; const studentCount: Record<string, number> = {}; const taskCount: Record<string, number> = {}
    for (const e of exams ?? []) { if (!examCount[e.course_id]) examCount[e.course_id] = 0; examCount[e.course_id]++ }
    for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }
    for (const t of tasks ?? []) { if (!taskCount[t.course_id]) taskCount[t.course_id] = 0; taskCount[t.course_id]++ }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Notas</h1>
        <p class="mt-1 text-sm text-zinc-500">${(courses ?? []).length} cursos</p>
      </div>
      ${(courses ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No hay cursos creados.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${(courses ?? []).map((c: any) => `
            <a href="#/coaches/courses/${escapeHtml(c.id)}/grades"
               class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                  ${Icon('scrollText', 24)}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-white truncate">${escapeHtml(c.name)}</h3>
                  <p class="text-xs text-zinc-500">${c.duration_months || 0} meses</p>
                </div>
              </div>
              ${c.description ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(c.description.substring(0, 80))}</p>` : '<div class="flex-1"></div>'}
              <div class="space-y-1 mb-3">
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('scrollText', 12)} ${examCount[c.id] || 0} exámenes</div>
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('clipboardList', 12)} ${taskCount[c.id] || 0} tareas</div>
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('users', 12)} ${studentCount[c.id] || 0} estudiantes</div>
              </div>
              <div class="mt-auto pt-3 border-t border-zinc-800 text-xs text-zinc-500">${c.price && c.price > 0 ? `$${c.price}/mes` : 'Gratis'}</div>
            </a>
          `).join('')}
        </div>`
      }`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades list:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
