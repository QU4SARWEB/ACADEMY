import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'

export function renderPracticalScore(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initPracticalScore(): Promise<void> {
  try {
    const params = router.getParams()
    const examId = params.id
    if (!examId) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">ID no encontrado</p>'; return }

    let exam: any = (await supabase.from('practical_exams').select('*').eq('id', examId).maybeSingle()).data
    if (exam?.course_id) { const { data: c } = await supabase.from('courses').select('name').eq('id', exam.course_id).maybeSingle(); if (c) exam.course_name = (c as any)?.name || '' }
    if (!exam) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Examen no encontrado</p>'; return }

    if (exam.status === 'draft') await initExam(exam)
    else await renderScore(exam)

    async function initExam(exam: any) {
      const today = new Date().toISOString().split('T')[0]
      const { data: enrolls } = await supabase.from('enrollments').select('id, profile_id').eq('course_id', exam.course_id).eq('status', 'active')
      const enrollIds = (enrolls ?? []).map((e: any) => e.id)
      const { data: attRecords } = await supabase.from('attendance').select('enrollment_id, status').in('enrollment_id', enrollIds.length ? enrollIds : ['none']).eq('date', today)
      const attMap = new Map((attRecords ?? []).map((r: any) => [r.enrollment_id, r.status]))
      const presentEnrolls = (enrolls ?? []).filter((e: any) => { const s = attMap.get(e.id); return s === 'present' || s === 'late' })
      if (presentEnrolls.length < 2) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Se necesitan al menos 2 alumnos presentes para iniciar.</p>'; return }

      // Random split into 2 teams
      const shuffled = [...presentEnrolls].sort(() => Math.random() - 0.5)
      const team1 = shuffled.slice(0, Math.ceil(shuffled.length / 2))
      const team2 = shuffled.slice(Math.ceil(shuffled.length / 2))

      const t1 = (await supabase.from('practical_teams').insert({ practical_exam_id: examId, name: 'Equipo 1', order_num: 1 }).select().maybeSingle()).data
      const t2 = (await supabase.from('practical_teams').insert({ practical_exam_id: examId, name: 'Equipo 2', order_num: 2 }).select().maybeSingle()).data

      for (const e of team1) { const m = (await supabase.from('practical_team_members').insert({ practical_team_id: t1!.id, enrollment_id: e.id, team_number: 1 }).select().maybeSingle()).data; if (m) await createScoreRows(m.id, examId) }
      for (const e of team2) { const m = (await supabase.from('practical_team_members').insert({ practical_team_id: t2!.id, enrollment_id: e.id, team_number: 2 }).select().maybeSingle()).data; if (m) await createScoreRows(m.id, examId) }

      await supabase.from('practical_exams').update({ status: 'active' }).eq('id', examId)
      exam.status = 'active'
      renderScore(exam)
    }

    async function createScoreRows(memberId: string, examId: string) {
      const { data: rubrics } = await supabase.from('practical_rubrics').select('id').eq('practical_exam_id', examId)
      const phases = ['first_half', 'second_half']
      for (const r of rubrics ?? []) {
        for (const phase of phases) {
          await supabase.from('practical_scores').insert({ practical_team_member_id: memberId, practical_rubric_id: r.id, phase, score: null })
        }
      }
    }

    async function renderScore(exam: any) {
      const { data: rubrics } = await supabase.from('practical_rubrics').select('*').eq('practical_exam_id', examId).order('order_num')
      const { data: teams } = await supabase.from('practical_teams').select('*').eq('practical_exam_id', examId).order('order_num')
      const teamIds = (teams ?? []).map((t: any) => t.id)
      const { data: members } = await supabase.from('practical_team_members').select('id, team_number, practical_team_id, enrollment_id').in('practical_team_id', teamIds.length > 0 ? teamIds : ['none'])
      const enrollIds2 = [...new Set((members ?? []).map((m: any) => m.enrollment_id))]
      const { data: profs2 } = await supabase.from('enrollments').select('id, profile_id').in('id', enrollIds2.length > 0 ? enrollIds2 : ['none'])
      const profIds2 = [...new Set((profs2 ?? []).map((e: any) => e.profile_id))]
      const { data: profiles2 } = await supabase.from('profiles').select('id, full_name, riot_id, social_discord, avatar_url').in('id', profIds2.length > 0 ? profIds2 : ['none'])
      const profileMap2: Record<string, any> = {}
      for (const p of profiles2 ?? []) profileMap2[p.id] = p
      const enrollProfMap: Record<string, any> = {}
      for (const e of profs2 ?? []) enrollProfMap[e.id] = profileMap2[e.profile_id] || {}
      const membersByTeam: Record<string, any[]> = {}
      for (const m of members ?? []) {
        if (!membersByTeam[m.practical_team_id]) membersByTeam[m.practical_team_id] = []
        membersByTeam[m.practical_team_id].push({ ...m, profiles: enrollProfMap[m.enrollment_id] || {} })
      }

      const { data: scores } = await supabase.from('practical_scores').select('*')
      const scoreMap: Record<string, any> = {}; for (const s of scores ?? []) scoreMap[s.practical_team_member_id + '_' + s.practical_rubric_id + '_' + s.phase] = s

      const phases = ['first_half', 'second_half']
      if (exam.has_overtime) phases.push('overtime')
      const phaseLabels: Record<string, string> = { first_half: 'F1', second_half: 'F2', overtime: 'OT' }

      const statusBadge = exam.status === 'active' ? '<span class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Activo</span>' : '<span class="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs text-zinc-400">Cerrado</span>'

      document.getElementById('page-content')!.innerHTML = `
      <div class="mb-4"><a href="#/coaches/exams/practical" class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver</a></div>
      <div class="mb-6 flex items-center justify-between">
        <div><h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(exam.title)}</h1>        <p class="mt-1 text-sm text-zinc-500">${escapeHtml(exam.course_name || '')} · ${statusBadge}</p></div>
        <div class="flex gap-2">
          ${exam.status === 'active' ? '<button id="toggle-ot-btn" class="rounded-lg border border-orange-500/30 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10">' + Icon('zap', 12) + ' ' + (exam.has_overtime ? 'OT activado' : 'Activar OT') + '</button><button id="close-exam-btn" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Cerrar examen</button>' : ''}
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-zinc-700">${rubrics?.length ? '<th class="sticky left-0 z-10 bg-[#0A0A0A] px-3 py-2 text-left text-xs text-zinc-500 min-w-[200px]">Alumno</th>' : ''}${(rubrics ?? []).map((r: any) => phases.map(p => '<th class="px-2 py-2 text-center text-xs text-zinc-500 min-w-[60px] border-l border-zinc-800">' + escapeHtml(r.name) + '<br><span class="text-[10px]">' + phaseLabels[p] + '</span></th>')).flat().join('')}<th class="px-3 py-2 text-center text-xs text-zinc-500 min-w-[60px]">Total</th></tr>
          </thead>
          <tbody>${(teams ?? []).map((team: any) => {
            const members = membersByTeam[team.id] || []
            return '<tr class="bg-zinc-900/50"><td colspan="' + (1 + (rubrics?.length || 0) * phases.length + 1) + '" class="px-3 py-2 text-xs font-medium text-[#8B5CF6]">' + escapeHtml(team.name) + ' (' + members.length + ')</td></tr>' + members.map((m: any) => {
              const prof: any = m.profiles || {}
              const dn = [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || prof.full_name || 'Unknown'
              let cells = '<td class="sticky left-0 z-10 bg-[#0A0A0A] px-3 py-2 border-t border-zinc-800"><div class="flex items-center gap-2">' + (prof.avatar_url ? '<img src="' + escapeHtml(prof.avatar_url) + '" class="h-6 w-6 rounded-full object-cover" />' : '') + '<span class="text-xs text-white truncate max-w-[150px]">' + escapeHtml(dn) + '</span></div></td>'
              let total = 0; let count = 0
              for (const r of rubrics ?? []) {
                for (const phase of phases) {
                  const key = m.id + '_' + r.id + '_' + phase; const score = scoreMap[key]
                  const val = score?.score
                  if (val !== null && val !== undefined) { total += val; count++ }
                  cells += '<td class="px-2 py-2 text-center border-t border-zinc-800 border-l border-zinc-800">' + (exam.status === 'active' ? '<input type="number" class="score-input w-14 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" data-member="' + m.id + '" data-rubric="' + r.id + '" data-phase="' + phase + '" value="' + (val !== null && val !== undefined ? val : '') + '" min="0" max="' + r.max_score + '" step="0.5" />' : '<span class="text-xs ' + (val !== null ? 'text-white' : 'text-zinc-600') + '">' + (val !== null ? val : '—') + '</span>') + '</td>'
                }
              }
              const avg = count > 0 ? Math.round(total / count) : null
              cells += '<td class="px-3 py-2 text-center border-t border-zinc-800"><span class="text-xs font-bold ' + (avg !== null ? (avg >= 70 ? 'text-green-400' : avg >= 40 ? 'text-yellow-400' : 'text-red-400') : 'text-zinc-600') + '">' + (avg !== null ? avg + '%' : '—') + '</span></td>'
              return '<tr class="border-b border-zinc-800/50">' + cells + '</tr>'
            }).join('')
          }).join('')}</tbody>
        </table>
      </div>`

      if (exam.status === 'active') {
        // Auto-save on change
        let saveTimer: any
        document.querySelectorAll('.score-input').forEach(inp => {
          inp.addEventListener('input', () => {
            clearTimeout(saveTimer)
            saveTimer = setTimeout(async () => {
              const el = inp as HTMLInputElement; const memberId = el.dataset.member; const rubricId = el.dataset.rubric; const phase = el.dataset.phase
              const val = el.value ? parseFloat(el.value) : null
              if (val !== null && (isNaN(val) || val < 0)) return
              const key = memberId + '_' + rubricId + '_' + phase
              const existing = scoreMap[key]
              if (existing) { await supabase.from('practical_scores').update({ score: val, updated_at: new Date().toISOString() }).eq('id', existing.id) }
              else { const { data: s } = await supabase.from('practical_scores').insert({ practical_team_member_id: memberId, practical_rubric_id: rubricId, phase, score: val }).select().maybeSingle(); if (s) scoreMap[key] = s }
            }, 500)
          })
        })

        document.getElementById('toggle-ot-btn')?.addEventListener('click', async () => {
          if (exam.has_overtime) return toast('info', 'OT ya activado')
          const newOT = !exam.has_overtime
          await supabase.from('practical_exams').update({ has_overtime: newOT }).eq('id', examId)
          if (newOT) {
            const { data: rubs } = await supabase.from('practical_rubrics').select('id').eq('practical_exam_id', examId)
            const { data: members } = await supabase.from('practical_team_members').select('id').eq('practical_team_id', examId)
            for (const m of members ?? []) { for (const r of rubs ?? []) { await supabase.from('practical_scores').insert({ practical_team_member_id: m.id, practical_rubric_id: r.id, phase: 'overtime', score: null }) } }
          }
          exam.has_overtime = newOT; renderScore(exam)
        })

        document.getElementById('close-exam-btn')?.addEventListener('click', async () => {
          if (!await confirmDialog('¿Cerrar el examen? Los alumnos podrán ver sus notas.')) return
          await supabase.from('practical_exams').update({ status: 'closed' }).eq('id', examId)
          // Recalc grades for all members
          const { data: allMembers } = await supabase.from('practical_team_members').select('enrollment_id').eq('practical_team_id', examId)
          const enrollIds = [...new Set((allMembers ?? []).map((m: any) => m.enrollment_id).filter(Boolean))]
          if (enrollIds.length > 0) {
            const { recalcFinalGrade, checkAutoPromotion } = await import('@/b3b32a/8abf18/grade_utils')
            for (const eid of enrollIds) {
              await recalcFinalGrade(eid)
              const { data: enr } = await supabase.from('enrollments').select('course_id, profile_id').eq('id', eid).maybeSingle()
              if (enr) await checkAutoPromotion(eid, enr.course_id, enr.profile_id)
            }
          }
          toast('success', 'Examen cerrado'); renderScore(exam)
        })
      }
    }
  } catch (err) { console.error(err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error</p>' }
}
