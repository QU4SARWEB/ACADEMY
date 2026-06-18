import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachGrades(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
      return
    }

    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, name')
      .eq('course_id', id)
      .order('display_order')

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name, display_name, rank)')
      .eq('course_id', id)
      .order('created_at')

    const moduleIds = (modules ?? []).map((m: any) => m.id)

    const { data: allExams } = moduleIds.length > 0
      ? await supabase.from('exams').select('id, title, module_id, max_score, weight').in('module_id', moduleIds).order('title')
      : { data: [] }

    const examIds = (allExams ?? []).map((e: any) => e.id)

    const { data: allAttempts } = examIds.length > 0
      ? await supabase.from('exam_attempts').select('*').in('exam_id', examIds.length > 0 ? examIds : ['none'])
      : { data: [] }

    const resultsByEnrollment: Record<string, any[]> = {}
    for (const r of allAttempts ?? []) {
      if (!resultsByEnrollment[r.enrollment_id]) resultsByEnrollment[r.enrollment_id] = []
      resultsByEnrollment[r.enrollment_id].push(r)
    }

    const html = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(id)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>
        <h1 class="font-heading text-2xl font-bold text-white">Notas — ${escapeHtml(course.name)}</h1>
        <p class="mt-1 text-sm text-zinc-500">${(allExams ?? []).length} evaluaciones · ${(enrollments ?? []).length} estudiantes</p>
      </div>

      ${(allExams ?? []).length > 0 && (enrollments ?? []).length > 0 ? `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-700 text-left text-xs text-zinc-500">
                <th class="whitespace-nowrap px-3 py-2 font-medium">Estudiante</th>
                ${(allExams ?? []).map((ev: any) => `
                  <th class="whitespace-nowrap px-3 py-2 font-medium text-center" title="${escapeHtml(ev.title)}">
                    <div class="max-w-[100px] truncate">${escapeHtml(ev.title)}</div>
                    <div class="text-[10px] text-zinc-600">/${ev.max_score} (${ev.weight}%)</div>
                  </th>
                `).join('')}
                <th class="whitespace-nowrap px-3 py-2 font-medium text-center">Nota final</th>
                <th class="whitespace-nowrap px-3 py-2 font-medium text-center">Promovido</th>
              </tr>
            </thead>
            <tbody>
              ${(enrollments ?? []).map((enr: any) => {
                const name = enr.profiles?.display_name || enr.profiles?.full_name || 'Desconocido'
                const enrResults = resultsByEnrollment[enr.id] || []
                return `
                  <tr class="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td class="whitespace-nowrap px-3 py-3 text-white">${escapeHtml(name)}</td>
                    ${(allExams ?? []).map((ev: any) => {
                      const result = enrResults.find((r: any) => r.exam_id === ev.id)
                      const score = result?.score
                      return `<td class="px-3 py-3 text-center ${score !== null && score !== undefined ? (score >= ev.max_score / 2 ? 'text-green-400' : 'text-red-400') : 'text-zinc-600'}">${score !== null && score !== undefined ? score : '—'}</td>`
                    }).join('')}
                    <td class="px-3 py-3 text-center font-semibold text-white">
                      ${enr.final_grade !== null ? enr.final_grade : '—'}
                    </td>
                    <td class="px-3 py-3 text-center">
                      ${enr.promoted
                        ? '<span class="text-green-400">${Icon("checkCircle", 14)}</span>'
                        : '<span class="text-zinc-600">—</span>'
                      }
                    </td>
                  </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="mt-8 glass max-w-xl rounded-xl p-6">
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Actualizar nota final</h2>
          <p class="mb-4 text-xs text-zinc-500">Selecciona un estudiante y modifica su nota final o estado de promoción.</p>
          <form id="grade-form">
            <div class="mb-4">
              <label class="mb-1 block text-sm text-zinc-400">Estudiante</label>
              <select name="enrollment_id" required
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">— Seleccionar —</option>
                ${(enrollments ?? []).map((enr: any) => {
                  const name = enr.profiles?.display_name || enr.profiles?.full_name || 'Desconocido'
                  return `<option value="${escapeHtml(enr.id)}">${escapeHtml(name)}</option>`
                }).join('')}
              </select>
            </div>
            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Nota final</label>
                <input name="final_grade" type="number" min="0" max="100" step="0.01"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input name="promoted" type="checkbox"
                    class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                  <span class="text-sm text-zinc-400">Promovido</span>
                </label>
              </div>
            </div>
            <p id="grade-form-error" class="mb-4 text-sm text-red-400 hidden"></p>
            <button type="submit"
              class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('edit', 14)} Guardar
            </button>
          </form>
        </div>
      ` : `
        <div class="glass rounded-xl p-8 text-center">
          <p class="text-zinc-500">
            ${(allExams ?? []).length === 0
              ? 'No hay evaluaciones en este curso. Crea evaluaciones en los módulos para ver notas.'
              : 'No hay estudiantes inscritos en este curso.'
            }
          </p>
        </div>
      `}`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('grade-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const enrollmentId = fd.get('enrollment_id') as string
      if (!enrollmentId) return

      const finalGrade = fd.get('final_grade')
      const payload: Record<string, any> = {}
      if (finalGrade !== '') payload.final_grade = parseFloat(finalGrade as string)
      payload.promoted = fd.get('promoted') === 'on'

      const { error } = await supabase
        .from('enrollments')
        .update(payload)
        .eq('id', enrollmentId)

      if (error) {
        const errEl = document.getElementById('grade-form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
        return
      }

      toast('success', 'Nota actualizada correctamente')
      initCoachGrades()
    })
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
