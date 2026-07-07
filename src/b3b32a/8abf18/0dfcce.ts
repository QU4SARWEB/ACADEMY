import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachCourses(): void {
  ;(async () => {
    try {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .order('display_order')

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', idFilter)
    const studentCount: Record<string, number> = {}
    for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }

    const filterHtml = (courses ?? []).map((c: any) => {
      const isFree = !c.price || c.price <= 0
      const total = studentCount[c.id] || 0
      return `
      <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
        bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-course-count="${total}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
        <span class="text-zinc-500">${total}</span>
      </button>`
    }).join('')

    const tableRows = (courses ?? []).map((c: any) => {
      const total = studentCount[c.id] || 0
      const isFree = !c.price || c.price <= 0
      return `
      <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50 course-row" data-course-id="${escapeHtml(c.id)}">
        <td class="py-3 px-4">
          <a href="#/coaches/courses/${escapeHtml(c.id)}" class="text-sm font-medium text-white hover:text-[#8B5CF6] transition">${escapeHtml(c.name)}</a>
        </td>
        <td class="py-3 px-4 text-sm text-zinc-400">${c.duration_months || '—'} meses</td>
        <td class="py-3 px-4 text-sm text-zinc-400">${total}</td>
        <td class="py-3 px-4 text-sm">${isFree ? '<span class="text-green-400">Gratis</span>' : '<span class="text-zinc-300">S/. ' + c.price + '</span>'}</td>
        <td class="py-3 px-4 text-sm">${c.is_active ? '<span class="text-green-400">Activo</span>' : '<span class="text-zinc-500">Inactivo</span>'}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <a href="#/coaches/courses/${escapeHtml(c.id)}/edit" class="text-xs text-zinc-400 hover:text-white transition">${Icon('edit', 14)}</a>
            <button class="delete-course-btn text-xs text-red-400 hover:text-red-300 transition" data-id="${escapeHtml(c.id)}">${Icon('trash', 14)}</button>
          </div>
        </td>
      </tr>`
    }).join('')

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <h1 class="font-heading text-2xl font-bold text-white">Cursos</h1>
        <a href="#/coaches/courses/new"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nuevo curso
        </a>
      </div>
      <div class="mb-4 flex flex-wrap gap-2" id="course-filters">${filterHtml}</div>
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th class="py-3 px-4 font-medium">Nombre</th>
              <th class="py-3 px-4 font-medium">Duraci\u00f3n</th>
              <th class="py-3 px-4 font-medium">Inscritos</th>
              <th class="py-3 px-4 font-medium">Precio</th>
              <th class="py-3 px-4 font-medium">Estado</th>
              <th class="py-3 px-4 font-medium text-right">Acci\u00f3n</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`

    const container = document.getElementById('page-content')
    if (container) container.innerHTML = html

    // Filter toggles
    document.querySelectorAll('.course-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const courseId = (btn as HTMLElement).dataset.courseId
        const active = (btn as HTMLElement).dataset.active === '1'
        const tds = container?.querySelectorAll(`.course-row[data-course-id="${courseId}"]`)
        tds?.forEach(el => (el as HTMLElement).classList.toggle('hidden', active))
        ;(btn as HTMLElement).dataset.active = active ? '0' : '1'
        btn.classList.toggle('bg-[#8B5CF6]/15', !active)
        btn.classList.toggle('text-[#8B5CF6]', !active)
        btn.classList.toggle('border-[#8B5CF6]/30', !active)
        btn.classList.toggle('bg-zinc-800/40', active)
        btn.classList.toggle('text-zinc-500', active)
        btn.classList.toggle('border-dashed', active)
        btn.classList.toggle('border-zinc-700/50', active)
        btn.innerHTML = active
          ? `${Icon('plus', 12)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
          : `${Icon('checkCircle', 14)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
      })
    })

    // Realtime subscription
    if ((window as any).__channels?.courses) {
      supabase.removeChannel((window as any).__channels.courses)
    }
    const channel = supabase.channel('courses-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.courses = channel
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => mountCoachCourses()
      )
      .subscribe()

    document.querySelectorAll('.delete-course-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const courseId = (btn as HTMLElement).getAttribute('data-id')
        if (!courseId || !(await confirmDialog('\u00bfEliminar este curso? Se eliminar\u00e1n todos los datos asociados.'))) return
        const { error } = await supabase.from('courses').delete().eq('id', courseId)
        if (error) { toast('error', error.message); return }
        toast('success', 'Curso eliminado')
        mountCoachCourses()
      })
    })
    } catch (err) {
      console.error('Error loading courses:', err)
      const container = document.getElementById('page-content')
      if (container) container.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
    }
  })()
}
