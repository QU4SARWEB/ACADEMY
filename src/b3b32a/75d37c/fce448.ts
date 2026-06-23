import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'

const CAT_LABELS: Record<string, string> = { general: 'General', exam: 'Examen', task: 'Tarea', behavior: 'Actitud', skill: 'Habilidad' }
const CAT_COLORS: Record<string, string> = {
  general: 'text-blue-400 bg-blue-500/10 border-blue-500/30', exam: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  task: 'text-green-400 bg-green-500/10 border-green-500/30', behavior: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  skill: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
}

export function renderStudentGrades(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initStudentGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const profileId = session.user.id

    const { data: grades } = await supabase.from('grades').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })

    const { data: enrolls } = await supabase.from('enrollments').select('id, course_id, courses!inner(name), final_grade, promoted').eq('profile_id', profileId).eq('status', 'active')
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)
    let examGrades: any[] = []
    let taskGrades: any[] = []
    if (enrollIds.length > 0) {
      const { data: exams } = await supabase.from('exam_attempts').select('score, exams!inner(title), started_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('started_at', { ascending: false })
      examGrades = (exams ?? []).map((e: any) => ({ title: 'Examen: ' + (e.exams?.title || ''), category: 'exam', score: e.score, created_at: e.started_at }))
      const { data: tasks } = await supabase.from('task_submissions').select('score, tasks!inner(title), submitted_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('submitted_at', { ascending: false })
      taskGrades = (tasks ?? []).map((t: any) => ({ title: 'Tarea: ' + (t.tasks?.title || ''), category: 'task', score: t.score, created_at: t.submitted_at }))
    }

    const allGrades = [...(grades ?? []), ...examGrades, ...taskGrades].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const avg = allGrades.length > 0 ? Math.round(allGrades.reduce((s: number, g: any) => s + g.score, 0) / allGrades.length) : null

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis Notas</h1>
        <p class="mt-1 text-sm text-zinc-500">${allGrades.length} notas registradas${avg !== null ? ' · Promedio: <span class="font-semibold ' + (avg >= 70 ? 'text-green-400' : avg >= 40 ? 'text-yellow-400' : 'text-red-400') + '">' + avg + '%</span>' : ''}</p>
      </div>

      <div class="mb-6">
        <h2 class="font-heading text-base font-bold text-white mb-3">Cursos activos</h2>
        <div class="space-y-3">
          ${(enrolls ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay cursos activos.</p>' : (enrolls ?? []).map((e: any) => '<a href="#/students/courses/' + escapeHtml(e.course_id) + '" class="glass rounded-xl p-4 block transition hover:bg-zinc-800/50"><div class="flex items-center justify-between"><div><h3 class="font-medium text-white">' + escapeHtml(e.courses?.name || 'Sin curso') + '</h3></div><div class="text-right"><p class="text-lg font-bold ' + ((e.final_grade ?? 0) >= 70 ? 'text-green-400' : 'text-yellow-400') + '">' + (e.final_grade !== null ? e.final_grade + '%' : '-') + '</p><p class="text-xs text-zinc-500">Nota final</p></div></div>' + (e.promoted ? '<span class="mt-2 inline-block text-xs text-green-400">Promovido</span>' : '') + '</a>').join('')}
        </div>
      </div>

      <div class="glass rounded-xl p-6">
        <h2 class="font-heading text-base font-bold text-white mb-4">Historial de notas</h2>
        ${allGrades.length === 0 ? '<p class="text-sm text-zinc-500">No hay notas registradas.</p>' : '<div class="space-y-2">' + allGrades.map((g: any) => {
          const score = Math.round(g.score)
          const link = g.category === 'exam' ? '#/students/tasks' : g.category === 'task' ? '#/students/tasks' : ''
          const titleHtml = link ? '<a href="' + link + '" class="text-sm font-medium text-white truncate hover:text-[#8B5CF6] transition">' + escapeHtml(g.title) + '</a>' : '<span class="text-sm font-medium text-white truncate">' + escapeHtml(g.title) + '</span>'
          return '<div class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2">' + titleHtml + '<span class="rounded-full border px-2 py-0.5 text-[10px] ' + (CAT_COLORS[g.category] || CAT_COLORS.general) + '">' + (CAT_LABELS[g.category] || g.category) + '</span>' + (g.source === 'exam' || g.source === 'task' ? '<span class="text-[10px] text-zinc-500">auto</span>' : '') + '</div>' + (g.comment ? '<p class="mt-0.5 text-xs text-zinc-500">' + escapeHtml(g.comment) + '</p>' : '') + '<p class="mt-0.5 text-[10px] text-zinc-600">' + formatDate(g.created_at) + '</p></div><div class="ml-3 shrink-0"><span class="inline-flex h-8 w-10 items-center justify-center rounded-lg text-sm font-bold ' + (score >= 70 ? 'bg-green-500/20 text-green-400' : score >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400') + '">' + score + '</span></div></div>'
        }).join('') + '</div>'}
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
