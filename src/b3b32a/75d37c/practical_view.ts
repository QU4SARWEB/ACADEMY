import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { router } from '@/f3395c'

export function renderPracticalView(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initPracticalView(): Promise<void> {
  try {
    const params = router.getParams(); const examId = params.id
    if (!examId) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">ID no encontrado</p>'; return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enroll } = await supabase.from('enrollments').select('id').eq('profile_id', session.user.id).maybeSingle()
    if (!enroll) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">No estás inscrito en este curso.</p>'; return }

    const { data: exam } = await supabase.from('practical_exams').select('*').eq('id', examId).maybeSingle()
    let courseName = ''
    if (exam?.course_id) {
      const { data: c } = await supabase.from('courses').select('name').eq('id', exam.course_id).maybeSingle()
      if (c) courseName = c.name
    }
    if (!exam) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Examen no encontrado</p>'; return }

    if (exam.status !== 'closed') {
      document.getElementById('page-content')!.innerHTML = `
        <div class="mb-6"><a href="#/students/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver</a></div>
        <div class="glass rounded-xl p-8 text-center"><h2 class="font-heading text-xl font-bold text-white mb-3">${escapeHtml(exam.title)}</h2><p class="text-sm text-zinc-500">El examen está en curso. Vuelve más tarde para ver tus resultados.</p></div>`
      return
    }

    const { data: members } = await supabase.from('practical_team_members').select('*, practical_teams!inner(name), practical_scores(*)').eq('enrollment_id', enroll.id)
    const myMember = (members ?? [])[0]
    if (!myMember) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">No participaste en este examen.</p>'; return }

    const { data: rubrics } = await supabase.from('practical_rubrics').select('*').eq('practical_exam_id', examId).order('order_num')
    const { data: allScores } = await supabase.from('practical_scores').select('*').eq('practical_team_member_id', myMember.id)
    const scoreMap: Record<string, any> = {}; for (const s of allScores ?? []) scoreMap[s.practical_rubric_id + '_' + s.phase] = s

    const phases = ['first_half', 'second_half']
    if (exam.has_overtime) phases.push('overtime')
    const phaseLabels: Record<string, string> = { first_half: 'F1', second_half: 'F2', overtime: 'OT' }

    let total = 0; let count = 0

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6"><a href="#/students/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver</a>
        <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(exam.title)}</h1>
        <p class="text-sm text-zinc-500">${escapeHtml(myMember.practical_teams?.name || '')} · ${escapeHtml(courseName)}</p>
      </div>
      <div class="glass rounded-xl p-6">
        <table class="w-full text-sm"><thead><tr class="border-b border-zinc-700"><th class="pb-2 pr-4 text-left text-xs text-zinc-500">Rúbrica</th>${phases.map(p => '<th class="pb-2 px-3 text-center text-xs text-zinc-500">' + phaseLabels[p] + '</th>').join('')}<th class="pb-2 pl-3 text-center text-xs text-zinc-500">Promedio</th></tr></thead><tbody>
        ${(rubrics ?? []).map((r: any) => {
          const scores = phases.map(p => scoreMap[r.id + '_' + p])
          const vals = scores.map(s => s?.score).filter((v: any) => v !== null && v !== undefined)
          const avg = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null
          if (avg !== null) { total += avg; count++ }
          return '<tr class="border-b border-zinc-800/50"><td class="py-2 pr-4 text-white">' + escapeHtml(r.name) + '</td>' + scores.map(s => '<td class="py-2 px-3 text-center text-zinc-300">' + (s?.score !== null && s?.score !== undefined ? s.score : '—') + '</td>').join('') + '<td class="py-2 pl-3 text-center"><span class="font-bold ' + (avg !== null ? (avg >= 14 ? 'text-green-400' : avg >= 8 ? 'text-yellow-400' : 'text-red-400') : 'text-zinc-600') + '">' + (avg !== null ? avg : '—') + '</span></td></tr>'
        }).join('')}
        </tbody></table>
        <div class="mt-4 pt-4 border-t border-zinc-700 text-center"><p class="text-sm text-zinc-400">Nota final: <span class="text-2xl font-bold text-white">${count > 0 ? Math.round(total / count) : '—'}</span></p></div>
      </div>`
  } catch (err) { console.error(err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error</p>' }
}
