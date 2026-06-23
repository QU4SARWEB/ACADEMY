import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

const GRADE_CATEGORIES: Record<string, string> = { general: 'General', exam: 'Examen', task: 'Tarea', behavior: 'Actitud', skill: 'Habilidad' }
const CAT_COLORS: Record<string, string> = {
  general: 'text-blue-400 bg-blue-500/10 border-blue-500/30', exam: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  task: 'text-green-400 bg-green-500/10 border-green-500/30', behavior: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  skill: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
}

export function renderCoachStudentGrades(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachStudentGrades(): Promise<void> {
  try {
    const params = router.getParams()
    const studentId = params.id
    if (!studentId) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Estudiante no encontrado</p>'; return }

    const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord, rank').eq('id', studentId).maybeSingle()
    if (!profile) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Estudiante no encontrado</p>'; return }

    const { data: grades } = await supabase.from('grades').select('*').eq('profile_id', studentId).order('created_at', { ascending: false })

    const { data: enrolls } = await supabase.from('enrollments').select('id').eq('profile_id', studentId)
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)
    let examGrades: any[] = []
    let taskGrades: any[] = []
    if (enrollIds.length > 0) {
      const { data: exams } = await supabase.from('exam_attempts').select('score, exams!inner(title), started_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('started_at', { ascending: false })
      examGrades = (exams ?? []).map((e: any) => ({ id: '', profile_id: studentId, coach_id: '', title: 'Examen: ' + (e.exams?.title || ''), category: 'exam', score: e.score, comment: null, source: 'exam', source_id: null, created_at: e.started_at }))
      const { data: tasks } = await supabase.from('task_submissions').select('score, submitted_at').in('enrollment_id', enrollIds).not('score', 'is', null)
      taskGrades = (tasks ?? []).map((t: any) => ({ id: '', profile_id: studentId, coach_id: '', title: 'Tarea', category: 'task', score: t.score, comment: null, source: 'task', source_id: null, created_at: t.submitted_at }))
    }

    const allGrades = [...(grades ?? []), ...examGrades, ...taskGrades].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const avg = allGrades.length > 0 ? Math.round(allGrades.reduce((s: number, g: any) => s + g.score, 0) / allGrades.length) : 0
    const displayName = [profile.riot_id || profile.full_name, profile.social_discord].filter(Boolean).join(' | ') || profile.full_name || 'Unknown'

    const html = `
      <div class="mb-6">
        <a href="#/coaches/students/${escapeHtml(studentId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver al estudiante</a>
        <div class="flex items-center gap-4 mb-6">
          ${profile.avatar_url ? '<img src="' + escapeHtml(profile.avatar_url) + '" class="h-12 w-12 rounded-full object-cover" />' : ''}
          <div>
            <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(displayName)}</h1>
            <p class="text-sm text-zinc-500">${profile.rank || 'Sin rango'} · ${allGrades.length} notas · Promedio: <span class="font-semibold ' + (avg >= 70 ? 'text-green-400' : avg >= 40 ? 'text-yellow-400' : 'text-red-400') + '">${avg}%</span></p>
          </div>
        </div>
      </div>

      <div class="flex gap-6 items-start">
        <div class="w-[500px] shrink-0">
          <div class="glass rounded-xl p-6">
            <h2 class="font-heading text-base font-bold text-white mb-4">Agregar nota</h2>
            <form id="add-grade-form" class="space-y-3">
              <div><label class="mb-1 block text-xs text-zinc-400">Título</label><input name="title" required maxlength="200" placeholder="Ej: Evaluación mensual" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="mb-1 block text-xs text-zinc-400">Categoría</label>
                  <select name="category" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    ${Object.entries(GRADE_CATEGORIES).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('')}
                  </select>
                </div>
                <div><label class="mb-1 block text-xs text-zinc-400">Nota (0-100)</label><input name="score" type="number" min="0" max="100" step="0.5" required class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
              </div>
              <div><label class="mb-1 block text-xs text-zinc-400">Comentario</label><textarea name="comment" rows="2" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
              <p id="grade-error" class="hidden text-xs text-red-400"></p>
              <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Agregar nota</button>
            </form>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="glass rounded-xl p-6">
            <h2 class="font-heading text-base font-bold text-white mb-4">Historial de notas (${allGrades.length})</h2>
            ${allGrades.length === 0 ? '<p class="text-sm text-zinc-500">No hay notas registradas.</p>' : '<div class="space-y-2 max-h-[600px] overflow-y-auto pr-1">' + allGrades.map((g: any) => {
              const score = Math.round(g.score)
              return '<div class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-sm font-medium text-white truncate">' + escapeHtml(g.title) + '</span><span class="rounded-full border px-2 py-0.5 text-[10px] ' + (CAT_COLORS[g.category] || CAT_COLORS.general) + '">' + (GRADE_CATEGORIES[g.category] || g.category) + '</span>' + (g.source === 'exam' || g.source === 'task' ? '<span class="text-[10px] text-zinc-500">auto</span>' : '') + '</div>' + (g.comment ? '<p class="mt-0.5 text-xs text-zinc-500 truncate">' + escapeHtml(g.comment) + '</p>' : '') + '<p class="mt-0.5 text-[10px] text-zinc-600">' + (g.created_at ? formatDate(g.created_at) : '—') + '</p></div><div class="ml-3 shrink-0"><span class="inline-flex h-8 w-10 items-center justify-center rounded-lg text-sm font-bold ' + (score >= 70 ? 'bg-green-500/20 text-green-400' : score >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400') + '">' + score + '</span></div></div>'
            }).join('') + '</div>'}
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('add-grade-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const title = (fd.get('title') as string)?.trim()
      const category = fd.get('category') as string || 'general'
      const score = parseFloat(fd.get('score') as string)
      const comment = (fd.get('comment') as string)?.trim() || null
      if (!title) { const el = document.getElementById('grade-error')!; el.textContent = 'Escribe un título'; el.classList.remove('hidden'); return }
      if (isNaN(score) || score < 0 || score > 100) { const el = document.getElementById('grade-error')!; el.textContent = 'La nota debe ser entre 0 y 100'; el.classList.remove('hidden'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) { const el = document.getElementById('grade-error')!; el.textContent = 'No autenticado'; el.classList.remove('hidden'); return }
      const { error } = await supabase.from('grades').insert({ profile_id: studentId, coach_id: session.user.id, title, category, score, comment, source: 'manual' })
      if (error) { const el = document.getElementById('grade-error')!; el.textContent = error.message; el.classList.remove('hidden'); return }
      toast('success', 'Nota agregada')
      const { recalcAllEnrollmentsForProfile } = await import('@/b3b32a/8abf18/grade_utils')
      await recalcAllEnrollmentsForProfile(studentId)
      initCoachStudentGrades()
    })
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
