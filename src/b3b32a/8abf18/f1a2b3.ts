import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

function scoreToLetter(s: number): string {
  const r = Math.round(s)
  if (r >= 18) return 'AD'
  if (r >= 14) return 'A'
  if (r >= 11) return 'B'
  if (r >= 5) return 'C'
  return 'D'
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function renderCoachStudentGrades(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachStudentGrades(): Promise<void> {
  try {
    const params = router.getParams()
    const studentId = params.id
    if (!studentId) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Estudiante no encontrado</p>'; return }

    const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord, rank').eq('id', studentId).maybeSingle()
    if (!profile) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Estudiante no encontrado</p>'; return }

    const { data: enrolls } = await supabase.from('enrollments').select('id, course_id, courses!inner(name), final_grade').eq('profile_id', studentId).eq('status', 'active')
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)

    const { data: monthlyGrades } = enrollIds.length > 0
      ? await supabase.from('monthly_grades').select('*').in('enrollment_id', enrollIds).order('month', { ascending: false })
      : { data: [] }

    const { data: exams } = enrollIds.length > 0
      ? await supabase.from('exam_attempts').select('score, exams!inner(title), started_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('started_at', { ascending: false })
      : { data: [] }

    const { data: tasks } = enrollIds.length > 0
      ? await supabase.from('task_submissions').select('score, tasks!inner(title, max_score), submitted_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('submitted_at', { ascending: false })
      : { data: [] }

    const displayName = [profile.riot_id || profile.full_name, profile.social_discord].filter(Boolean).join(' | ') || profile.full_name || 'Unknown'

    // Calculate averages
    const monthlyScores = (monthlyGrades ?? []).map((g: any) => Number(g.score))
    const monthlyAvg = monthlyScores.length > 0 ? monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length : 0
    const examScores = (exams ?? []).map((e: any) => Number(e.score))
    const examAvg = examScores.length > 0 ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0
    const taskScores = (tasks ?? []).map((t: any) => {
      const max = t.tasks?.max_score
      return max && max > 0 ? (Number(t.score) / Number(max)) * 20 : 0
    }).filter(Boolean)
    const taskAvg = taskScores.length > 0 ? taskScores.reduce((a, b) => a + b, 0) / taskScores.length : 0

    let finalScore20 = 0
    if (monthlyScores.length > 0) {
      finalScore20 = (monthlyAvg * 0.6) + (examAvg * 0.2) + (taskAvg * 0.2)
    } else {
      let tw = 0, ts = 0
      if (examScores.length > 0) { ts += examAvg * 0.5; tw += 0.5 }
      if (taskScores.length > 0) { ts += taskAvg * 0.5; tw += 0.5 }
      finalScore20 = tw > 0 ? ts / tw : 0
    }

    const html = `
      <div class="mb-6">
        <a href="#/coaches/students/${escapeHtml(studentId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver al estudiante</a>
        <div class="flex items-center gap-4 mb-4">
          ${profile.avatar_url ? '<img src="' + escapeHtml(profile.avatar_url) + '" class="h-12 w-12 rounded-full object-cover" />' : ''}
          <div>
            <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(displayName)}</h1>
            <p class="text-sm text-zinc-500">${profile.rank || 'Sin rango'}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-4 mb-6">
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-xs text-zinc-500">Monthly</p>
            <p class="text-lg font-bold text-white">${monthlyAvg > 0 ? monthlyAvg.toFixed(1) : '—'}</p>
          </div>
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-xs text-zinc-500">Exámenes</p>
            <p class="text-lg font-bold text-white">${examAvg > 0 ? examAvg.toFixed(1) : '—'}</p>
          </div>
          <div class="glass rounded-xl p-3 text-center">
            <p class="text-xs text-zinc-500">Tareas</p>
            <p class="text-lg font-bold text-white">${taskAvg > 0 ? taskAvg.toFixed(1) : '—'}</p>
          </div>
          <div class="glass rounded-xl p-3 text-center ${finalScore20 >= 14 ? 'border border-green-500/30' : finalScore20 >= 11 ? 'border border-yellow-500/30' : ''}">
            <p class="text-xs text-zinc-500">Final</p>
            <p class="text-lg font-bold ${finalScore20 >= 14 ? 'text-green-400' : finalScore20 >= 11 ? 'text-yellow-400' : 'text-zinc-400'}">${finalScore20 > 0 ? finalScore20.toFixed(1) : '—'}</p>
            <p class="text-xs font-medium ${finalScore20 >= 14 ? 'text-green-400' : finalScore20 >= 11 ? 'text-yellow-400' : 'text-zinc-500'}">${finalScore20 > 0 ? scoreToLetter(finalScore20) : ''}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="glass rounded-xl p-5">
          <h2 class="font-heading text-base font-bold text-white mb-3">Notas mensuales (${(monthlyGrades ?? []).length})</h2>
          ${(monthlyGrades ?? []).length === 0 ? '<p class="text-sm text-zinc-500">Sin notas mensuales.</p>' :
            '<div class="grid gap-3 sm:grid-cols-2">' + (monthlyGrades ?? []).map((g: any) => {
              const [y, mo] = g.month.split('-')
              const label = MONTHS[parseInt(mo) - 1] || g.month
              const score = Number(g.score)
              return `<div class="glass rounded-xl p-4 text-center">
                <p class="text-xs text-zinc-500 mb-1">${escapeHtml(label)} ${y}</p>
                <p class="text-2xl font-bold text-white">${score.toFixed(1)}</p>
                <div class="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${score >= 18 ? 'bg-green-500/20 text-green-400' : score >= 14 ? 'bg-blue-500/20 text-blue-400' : score >= 11 ? 'bg-yellow-500/20 text-yellow-400' : score >= 5 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}">${g.letter}</div>
              </div>`
            }).join('') + '</div>'}
        </div>

        <div class="glass rounded-xl p-5">
          <h2 class="font-heading text-base font-bold text-white mb-3">Actividades (${(exams ?? []).length + (tasks ?? []).length})</h2>
          ${(exams ?? []).length + (tasks ?? []).length === 0 ? '<p class="text-sm text-zinc-500">Sin actividades.</p>' :
            '<div class="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-1">' +
            [...(exams ?? []).map((e: any) => ({ type: 'exam', title: (e as any).exams?.title || '', score: Number(e.score), date: e.started_at })),
             ...(tasks ?? []).map((t: any) => {
               const max = (t as any).tasks?.max_score || 20
               return { type: 'task', title: t.tasks?.title || '', score: (Number(t.score) / max) * 20, date: t.submitted_at }
             })
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => `
              <div class="glass rounded-xl p-3 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg ${item.type === 'exam' ? 'bg-purple-500/20' : 'bg-blue-500/20'} shrink-0">
                  ${Icon(item.type === 'exam' ? 'scrollText' : 'clipboardList', 14)}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-zinc-500">${item.type === 'exam' ? 'Examen' : 'Tarea'}</p>
                  <p class="text-sm text-zinc-300 truncate">${escapeHtml(item.title)}</p>
                </div>
                <span class="text-sm font-bold text-white shrink-0">${item.score.toFixed(1)}</span>
              </div>
            `).join('') + '</div>'}
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
