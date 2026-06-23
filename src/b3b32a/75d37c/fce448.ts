import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function scoreToLetter(s: number): string {
  const r = Math.round(s)
  if (r >= 18) return 'AD'
  if (r >= 14) return 'A'
  if (r >= 11) return 'B'
  if (r >= 5) return 'C'
  return 'D'
}

const LETTER_ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3, AD: 4 }

export function renderStudentGrades(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initStudentGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const profileId = session.user.id

    const { data: enrolls } = await supabase.from('enrollments').select('id, course_id, courses!course_id(name)').eq('profile_id', profileId).eq('status', 'active')
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)

    // Monthly grades
    const { data: monthlyGrades } = enrollIds.length > 0
      ? await supabase.from('monthly_grades').select('*, enrollments!inner(course_id, courses!inner(name))').in('enrollment_id', enrollIds).order('month', { ascending: false })
      : { data: [] }

    // Exam attempts
    const { data: exams } = enrollIds.length > 0
      ? await supabase.from('exam_attempts').select('score, exams!inner(title), started_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('started_at', { ascending: false })
      : { data: [] }

    // Task submissions
    const { data: tasks } = enrollIds.length > 0
      ? await supabase.from('task_submissions').select('score, tasks!inner(title, max_score), submitted_at').in('enrollment_id', enrollIds).not('score', 'is', null).order('submitted_at', { ascending: false })
      : { data: [] }

    // Calculate overall averages
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
    const finalLetter = scoreToLetter(finalScore20)

    // Group monthly grades by course
    const gradesByCourse: Record<string, any[]> = {}
    for (const g of monthlyGrades ?? []) {
      const cName = (g as any).enrollments?.courses?.name || 'Sin curso'
      if (!gradesByCourse[cName]) gradesByCourse[cName] = []
      gradesByCourse[cName].push(g)
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis Notas</h1>
        <p class="mt-1 text-sm text-zinc-500">Sistema de notas sobre 20</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-4 mb-6">
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-xs text-zinc-500 mb-1">Monthly</p>
          <p class="text-xl font-bold text-white">${monthlyAvg > 0 ? monthlyAvg.toFixed(1) : '—'}</p>
          <p class="text-xs ${monthlyAvg >= 14 ? 'text-green-400' : monthlyAvg >= 11 ? 'text-yellow-400' : 'text-zinc-500'}">${monthlyAvg > 0 ? scoreToLetter(monthlyAvg) : ''}</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-xs text-zinc-500 mb-1">Exámenes</p>
          <p class="text-xl font-bold text-white">${examAvg > 0 ? examAvg.toFixed(1) : '—'}</p>
          <p class="text-xs text-zinc-500">${examScores.length} exams</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-xs text-zinc-500 mb-1">Tareas</p>
          <p class="text-xl font-bold text-white">${taskAvg > 0 ? taskAvg.toFixed(1) : '—'}</p>
          <p class="text-xs text-zinc-500">${taskScores.length} tasks</p>
        </div>
        <div class="glass rounded-xl p-4 text-center ${finalScore20 >= 14 ? 'border border-green-500/30' : finalScore20 >= 11 ? 'border border-yellow-500/30' : ''}">
          <p class="text-xs text-zinc-500 mb-1">Final</p>
          <p class="text-2xl font-bold ${finalScore20 >= 14 ? 'text-green-400' : finalScore20 >= 11 ? 'text-yellow-400' : 'text-zinc-400'}">${finalScore20 > 0 ? finalScore20.toFixed(1) : '—'}</p>
          <p class="text-sm font-medium ${finalScore20 >= 14 ? 'text-green-400' : finalScore20 >= 11 ? 'text-yellow-400' : 'text-zinc-500'}">${finalScore20 > 0 ? finalLetter : ''}</p>
        </div>
      </div>

      ${Object.keys(gradesByCourse).length > 0 ? Object.entries(gradesByCourse).map(([cName, grades]) => `
        <div class="glass rounded-xl p-5 mb-4">
          <h2 class="font-heading text-base font-bold text-white mb-3">${escapeHtml(cName)}</h2>
          <div class="space-y-2">
            ${grades.sort((a: any, b: any) => b.month.localeCompare(a.month)).map((g: any) => {
              const [y, mo] = g.month.split('-')
              const label = MONTHS[parseInt(mo) - 1] || g.month
              const score = Number(g.score)
              return `<div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-4 py-3">
                <span class="text-sm text-zinc-300">${escapeHtml(label)} ${y}</span>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-bold text-white">${score.toFixed(1)}</span>
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full ${score >= 18 ? 'bg-green-500/20 text-green-400' : score >= 14 ? 'bg-blue-500/20 text-blue-400' : score >= 11 ? 'bg-yellow-500/20 text-yellow-400' : score >= 5 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}">${g.letter}</span>
                </div>
              </div>`
            }).join('')}
          </div>
        </div>
      `).join('') : ''}

      <div class="glass rounded-xl p-5">
        <h2 class="font-heading text-base font-bold text-white mb-3">Historial completo</h2>
        <div class="space-y-2">
          ${[...(exams ?? []).map((e: any) => ({ type: 'exam', title: e.exams?.title || '', score: e.score, date: e.started_at })),
              ...(tasks ?? []).map((t: any) => ({ type: 'task', title: t.tasks?.title || '', score: t.score, date: t.submitted_at }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((item: any) => {
            const score20 = item.type === 'exam' ? Number(item.score) : (() => {
              const max = (item as any).maxScore || 20
              return (Number(item.score) / max) * 20
            })()
            return `<div class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
              <div>
                <span class="text-xs text-zinc-500">${item.type === 'exam' ? 'Examen' : 'Tarea'}</span>
                <span class="text-sm text-zinc-300 ml-2">${escapeHtml(item.title)}</span>
              </div>
              <span class="text-xs text-zinc-500">${score20.toFixed(1)}/20</span>
            </div>`
          }).join('') || '<p class="text-sm text-zinc-500">Sin actividades registradas.</p>'}
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
