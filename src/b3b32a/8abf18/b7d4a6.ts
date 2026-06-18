import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachNewModule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewModule(): Promise<void> {
  try {
    const params = router.getParams()
    const courseId = params.id
    if (!courseId) return

    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .maybeSingle()

    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
      return
    }

    const { data: existingRaw } = await supabase
      .from('course_modules')
      .select('display_order, month_number')
      .eq('course_id', courseId)
      .order('display_order', { ascending: false })
      .limit(1)
    const existing = (existingRaw ?? []) as any[]

    const nextOrder = existing.length > 0 ? existing[0].display_order + 1 : 1
    const nextMonth = existing.length > 0 ? existing[0].month_number + 1 : 1

    const html = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>
        <h1 class="font-heading text-2xl font-bold text-white">Nuevo módulo</h1>
        <p class="mt-1 text-sm text-zinc-500">Curso: ${escapeHtml(course.name)}</p>
      </div>

      <div class="glass max-w-2xl rounded-xl p-6">
        <form id="new-module-form">
          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Nombre del módulo</label>
            <input name="name" required maxlength="200"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
              placeholder="Ej: Semana 1 — Introducción">
          </div>

          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Descripción</label>
            <textarea name="description" rows="4"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
              placeholder="Contenido del módulo..."></textarea>
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Mes</label>
              <input name="month_number" type="number" min="1" required value="${nextMonth}"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            </div>
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Orden</label>
              <input name="display_order" type="number" min="0" required value="${nextOrder}"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            </div>
          </div>

          <p id="form-error" class="mb-4 text-sm text-red-400 hidden"></p>

          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('plus', 14)} Crear módulo
            </button>
            <a href="#/coaches/courses/${escapeHtml(courseId)}"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('new-module-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)

      const payload = {
        course_id: courseId,
        name: fd.get('name'),
        description: fd.get('description'),
        month_number: parseInt(fd.get('month_number') as string),
        display_order: parseInt(fd.get('display_order') as string),
      }

      const { error } = await supabase
        .from('course_modules')
        .insert(payload)

      if (error) {
        const errEl = document.getElementById('form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
        return
      }

      toast('success', 'Módulo creado correctamente')
      router.navigate(`/coaches/courses/${escapeHtml(courseId)}`)
    })
  } catch (err) {
    console.error('Error creating module:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al crear el módulo</p>'
  }
}
