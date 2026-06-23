import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderPracticalExams(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initPracticalExams(): Promise<void> {
  try {
    const { data: courses } = await supabase.from('courses').select('*').eq('is_active', true).order('display_order')
    const courseIds = (courses ?? []).map(c => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const [{ data: exams }, { data: enrolls }, { data: tasks }] = await Promise.all([
      supabase.from('practical_exams').select('course_id').in('course_id', idFilter),
      supabase.from('enrollments').select('course_id').in('course_id', idFilter),
      supabase.from('tasks').select('course_id').in('course_id', idFilter),
    ])
    const examCount: Record<string, number> = {}; const studentCount: Record<string, number> = {}; const taskCount: Record<string, number> = {}
    for (const e of exams ?? []) { if (!examCount[e.course_id]) examCount[e.course_id] = 0; examCount[e.course_id]++ }
    for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }
    for (const t of tasks ?? []) { if (!taskCount[t.course_id]) taskCount[t.course_id] = 0; taskCount[t.course_id]++ }

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div><h1 class="font-heading text-2xl font-bold text-white">Exámenes Prácticos</h1><p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes · ${(enrolls ?? []).length} inscripciones</p></div>
        <a href="#/coaches/exams/practical/new" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo práctico</a>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${(courses ?? []).map(c => {
          return '<button class="course-practical-btn glass rounded-xl p-5 flex flex-col text-left transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group" data-course-id="' + c.id + '" data-course-name="' + escapeHtml(c.name) + '"><div class="flex items-center gap-3 mb-4"><div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">' + Icon('target', 24) + '</div><div class="min-w-0 flex-1"><h3 class="font-medium text-white truncate">' + escapeHtml(c.name) + '</h3><p class="text-xs text-zinc-500">' + (c.duration_months || 0) + ' meses</p></div></div>' + (c.description ? '<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">' + escBr(c.description.substring(0, 80)) + '</p>' : '<div class="flex-1"></div>') + '<div class="space-y-1 mb-3"><div class="flex items-center gap-2 text-xs text-zinc-400">' + Icon('target', 12) + ' ' + (examCount[c.id] || 0) + ' prácticos</div><div class="flex items-center gap-2 text-xs text-zinc-400">' + Icon('clipboardList', 12) + ' ' + (taskCount[c.id] || 0) + ' tareas</div><div class="flex items-center gap-2 text-xs text-zinc-400">' + Icon('users', 12) + ' ' + (studentCount[c.id] || 0) + ' estudiantes</div></div><div class="mt-auto pt-3 border-t border-zinc-800 text-xs text-zinc-500">' + (c.price && c.price > 0 ? '$' + c.price + '/mes' : 'Gratis') + '</div></button>'
        }).join('')}
      </div>`

    document.querySelectorAll('.course-practical-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const courseId = (btn as HTMLElement).dataset.courseId
        const courseName = (btn as HTMLElement).dataset.courseName
        const { data: exams } = await supabase.from('practical_exams').select('*').eq('course_id', courseId).order('created_at', { ascending: false })
        const statusBadge: Record<string, string> = { draft: 'bg-yellow-500/20 text-yellow-400', active: 'bg-green-500/20 text-green-400', closed: 'bg-zinc-500/20 text-zinc-400' }
        const statusLabel: Record<string, string> = { draft: 'Borrador', active: 'Activo', closed: 'Cerrado' }
        document.getElementById('page-content')!.innerHTML = `
        <div class="mb-4"><button id="back-practical-grid" class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Todos los cursos</button></div>
        <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(courseName || '')}</h1><p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes prácticos</p></div>
        <div class="flex gap-6 items-start">
          <div class="w-[600px] shrink-0">
            <div class="glass rounded-xl p-6">
              <h2 class="font-heading text-base font-bold text-white mb-4">Crear examen práctico</h2>
              <a href="#/coaches/exams/practical/new" class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] inline-flex items-center gap-2">${Icon('plus', 14)} Nuevo</a>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="glass rounded-xl p-6">
              <h2 class="font-heading text-base font-bold text-white mb-4">Exámenes (${(exams ?? []).length})</h2>
              ${(exams ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay exámenes prácticos en este curso.</p>' : '<div class="grid gap-3 sm:grid-cols-2">' + (exams ?? []).map((e: any) => '<div class="glass rounded-xl p-5 flex flex-col"><div class="flex items-center gap-3 mb-4"><div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">' + Icon('target', 24) + '</div><div class="min-w-0 flex-1"><h3 class="font-medium text-white text-sm truncate">' + escapeHtml(e.title) + '</h3><span class="rounded-full px-2 py-0.5 text-[10px] ' + (statusBadge[e.status] || '') + '">' + (statusLabel[e.status] || e.status) + '</span></div></div>' + (e.description ? '<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">' + escapeHtml(e.description.substring(0, 80)) + '</p>' : '<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">Sin descripción</p>') + '<div class="flex items-center gap-2 text-xs text-zinc-400 mb-3">' + Icon('calendar', 12) + ' ' + formatDate(e.created_at) + '</div><div class="flex flex-wrap gap-2 mt-auto pt-3 border-t border-zinc-800">' + (e.status === 'draft' ? '<a href="#/coaches/exams/practical/' + e.id + '" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('edit', 12) + ' Iniciar</a>' : '<a href="#/coaches/exams/practical/' + e.id + '" class="rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-xs text-[#8B5CF6] hover:bg-[#8B5CF6]/30">' + Icon('edit', 12) + ' Puntuación</a>') + '<button class="del-practical-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30" data-id="' + e.id + '">' + Icon('trash', 12) + '</button></div></div>').join('') + '</div>'}
            </div>
          </div>
        </div>`
        document.getElementById('back-practical-grid')?.addEventListener('click', () => initPracticalExams())
        document.querySelectorAll('.del-practical-btn').forEach(delBtn => { delBtn.addEventListener('click', async () => { const id = (delBtn as HTMLElement).dataset.id; if (!id || !(await confirmDialog('¿Eliminar?'))) return; await supabase.from('practical_exams').delete().eq('id', id); initPracticalExams() }) })
      })
    })
  } catch (err) { console.error('Practical exams error:', err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>' }
}
