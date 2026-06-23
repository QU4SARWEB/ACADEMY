import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'

const CAT_LABELS: Record<string, string> = { general: 'General', exam: 'Examen', task: 'Tarea', behavior: 'Actitud', skill: 'Habilidad' }

export function renderCoachGradesList(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachGradesList(): Promise<void> {
  try {
    const { data: students } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord, rank').eq('role', 'student').order('full_name')
    const { data: allGrades } = await supabase.from('grades').select('profile_id, score').order('created_at', { ascending: false })
    const { data: enrolls } = await supabase.from('enrollments').select('profile_id, id')
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)
    let examScores: Record<string, number[]> = {}
    let taskScores: Record<string, number[]> = {}
    if (enrollIds.length > 0) {
      const { data: exams } = await supabase.from('exam_attempts').select('enrollment_id, score').in('enrollment_id', enrollIds).not('score', 'is', null)
      for (const e of exams ?? []) {
        const pid = (enrolls ?? []).find((en: any) => en.id === e.enrollment_id)?.profile_id
        if (!pid) continue
        if (!examScores[pid]) examScores[pid] = []
        examScores[pid].push(e.score)
      }
      const { data: tasks } = await supabase.from('task_submissions').select('enrollment_id, score').in('enrollment_id', enrollIds).not('score', 'is', null)
      for (const t of tasks ?? []) {
        const pid = (enrolls ?? []).find((en: any) => en.id === t.enrollment_id)?.profile_id
        if (!pid) continue
        if (!taskScores[pid]) taskScores[pid] = []
        taskScores[pid].push(t.score)
      }
    }
    const gradeMap: Record<string, number[]> = {}
    for (const g of allGrades ?? []) {
      if (!gradeMap[g.profile_id]) gradeMap[g.profile_id] = []
      gradeMap[g.profile_id].push(g.score)
    }

    const html = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Notas de estudiantes</h1><p class="mt-1 text-sm text-zinc-500">${(students ?? []).length} estudiantes</p></div>

      <div id="add-grade-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
        <div class="glass max-w-md w-full mx-4 my-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-heading text-lg font-bold text-white">Agregar nota</h3>
            <button id="close-grade-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
          </div>
          <input type="hidden" id="modal-student-id" />
          <form id="quick-grade-form" class="space-y-3">
            <div><label class="mb-1 block text-xs text-zinc-400">Título</label><input name="title" required maxlength="200" placeholder="Ej: Evaluación mensual" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-xs text-zinc-400">Categoría</label>
                <select name="category" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  ${Object.entries(CAT_LABELS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('')}
                </select>
              </div>
              <div><label class="mb-1 block text-xs text-zinc-400">Nota (0-20)</label><input name="score" type="number" min="0" max="20" step="0.5" required class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
            </div>
            <div><label class="mb-1 block text-xs text-zinc-400">Comentario</label><textarea name="comment" rows="2" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
            <p id="quick-grade-error" class="hidden text-xs text-red-400"></p>
            <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Guardar nota</button>
          </form>
        </div>
      </div>

      ${(students ?? []).length === 0 ? '<p class="text-zinc-500">No hay estudiantes.</p>' : `
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
        <th class="pb-3 pr-4 font-medium">Estudiante</th><th class="pb-3 pr-4 font-medium">Rango</th><th class="pb-3 pr-4 font-medium">Práctico</th><th class="pb-3 pr-4 font-medium">Exámenes</th><th class="pb-3 pr-4 font-medium">Tareas</th><th class="pb-3 pr-4 font-medium">Promedio</th><th class="pb-3 font-medium"></th>
      </tr></thead><tbody>
      ${(students ?? []).map((s: any) => {
        const manualScores = gradeMap[s.id] || []
        const eScores = examScores[s.id] || []
        const tScores = taskScores[s.id] || []
        const allS = [...manualScores, ...eScores, ...tScores]
        const avg = allS.length > 0 ? Math.round(allS.reduce((a: number, b: number) => a + b, 0) / allS.length) : null
        const displayName = [s.riot_id || s.full_name, s.social_discord].filter(Boolean).join(' | ') || s.full_name || ''
        return '<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30"><td class="py-3 pr-4"><a href="#/coaches/students/' + s.id + '/grades" class="flex items-center gap-2 text-white hover:text-[#8B5CF6] transition">' + (s.avatar_url ? '<img src="' + escapeHtml(s.avatar_url) + '" class="h-7 w-7 rounded-full object-cover" />' : '<div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">' + escapeHtml(displayName.charAt(0)) + '</div>') + '<span>' + escapeHtml(displayName) + '</span></a></td><td class="py-3 pr-4 text-zinc-400">' + escapeHtml(s.rank || '-') + '</td><td class="py-3 pr-4 text-zinc-400">' + manualScores.length + '</td><td class="py-3 pr-4 text-zinc-400">' + eScores.length + '</td><td class="py-3 pr-4 text-zinc-400">' + tScores.length + '</td><td class="py-3 pr-4">' + (avg !== null ? '<span class="rounded px-2 py-0.5 text-xs font-medium ' + (avg >= 14 ? 'bg-green-500/20 text-green-400' : avg >= 8 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400') + '">' + avg + '/20</span>' : '<span class="text-xs text-zinc-600">—</span>') + '</td><td class="py-3"><button type="button" class="add-grade-btn text-xs text-[#8B5CF6] hover:text-[#7C3AED] transition" data-id="' + s.id + '">' + Icon('plus', 12) + ' Nota</button></td></tr>'
      }).join('')}
      </tbody></table></div>`}
    `
    document.getElementById('page-content')!.innerHTML = html

    // Modal handlers
    const modal = document.getElementById('add-grade-modal')!
    document.getElementById('close-grade-modal')?.addEventListener('click', () => modal.classList.add('hidden'))
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden') })

    document.querySelectorAll('.add-grade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        (document.getElementById('modal-student-id') as HTMLInputElement).value = (btn as HTMLElement).dataset.id || ''
        modal.classList.remove('hidden')
      })
    })

    document.getElementById('quick-grade-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const profileId = (document.getElementById('modal-student-id') as HTMLInputElement).value
      const title = (fd.get('title') as string)?.trim()
      const category = fd.get('category') as string || 'general'
      const score = parseFloat(fd.get('score') as string)
      const comment = (fd.get('comment') as string)?.trim() || null
      const errEl = document.getElementById('quick-grade-error')!
      if (!profileId) { errEl.textContent = 'Error: estudiante no identificado'; errEl.classList.remove('hidden'); return }
      if (!title) { errEl.textContent = 'Escribe un título'; errEl.classList.remove('hidden'); return }
      if (isNaN(score) || score < 0 || score > 20) { errEl.textContent = 'La nota debe ser entre 0 y 20'; errEl.classList.remove('hidden'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) { errEl.textContent = 'No autenticado'; errEl.classList.remove('hidden'); return }
      const { error } = await supabase.from('grades').insert({ profile_id: profileId, coach_id: session.user.id, title, category, score, comment, source: 'manual' })
      if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return }
      toast('success', 'Nota agregada')
      const { recalcAllEnrollmentsForProfile } = await import('@/b3b32a/8abf18/grade_utils')
      await recalcAllEnrollmentsForProfile(profileId)
      modal.classList.add('hidden')
      initCoachGradesList()
    })
  } catch (err) {
    console.error('Error loading grades list:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
