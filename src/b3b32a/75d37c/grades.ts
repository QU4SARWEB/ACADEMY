import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import {
  meetsRank,
  GRADE_WEIGHTS,
  COMPONENT_LABELS,
  buildRawScores,
  hasPendingRecovery,
  computeComponents,
  weightedFinal,
  gradeStatus,
} from '@/2b3583/grades_utils'
import { getStudentEnrollments, isStudentPreview } from '@/2b3583/student_view'

export function renderStudentGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id

    const [{ data: profile }, enrollments] = await Promise.all([
      supabase.from('profiles').select('rank').eq('id', uid).maybeSingle(),
      getStudentEnrollments(uid),
    ])

    if (!enrollments || enrollments.length === 0) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex flex-col items-center justify-center min-h-[50vh]"><p class="text-zinc-500">No tienes cursos activos.</p></div>'
      return
    }

    const uniqueCourses = new Map<string, any>()
    for (const e of enrollments) {
      if (!uniqueCourses.has(e.course_id)) {
        uniqueCourses.set(e.course_id, { id: e.course_id, ...e.courses })
      }
    }

    const courseParam = new URLSearchParams(location.hash.split('?')[1] || '').get('course') || ''
    if (courseParam) {
      for (const cid of [...uniqueCourses.keys()]) {
        if (cid !== courseParam) uniqueCourses.delete(cid)
      }
      if (uniqueCourses.size === 0) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-sm text-zinc-500">Curso no encontrado. <a class="text-[#A78BFA] underline" href="#/students/grades">Volver a mis notas</a></p>'
        return
      }
    }

    const courseIds = [...uniqueCourses.keys()]
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const studentRank = profile?.rank || ''

    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('id, course_id')
      .in('course_id', idFilter)
    const scheduleIds = (allSchedules ?? []).map((s: any) => s.id)
    const schedFilter = scheduleIds.length > 0 ? scheduleIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: allClassGrades }, { data: allTasks }, { data: allExams }] = await Promise.all([
      supabase.from('class_grades').select('*').in('schedule_id', schedFilter),
      supabase.from('course_tasks').select('id, course_id, due_date, is_recovery').in('course_id', idFilter),
      supabase.from('exams').select('id, course_id, is_final, is_recovery').in('course_id', idFilter),
    ])

    const examIdFilter = (allExams ?? []).length > 0 ? (allExams as any[]).map((x: any) => x.id) : ['00000000-0000-0000-0000-000000000000']
    const taskIds = (allTasks ?? []).map((t: any) => t.id)
    const taskIdFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']
    const [{ data: allResults }, { data: allSubmissions }] = await Promise.all([
      supabase.from('exam_results').select('exam_id, student_id, total_score, status').in('exam_id', examIdFilter),
      supabase.from('task_submissions').select('*').in('task_id', taskIdFilter),
    ])

    const { data: allEnrolls } = await supabase
      .from('enrollments')
      .select('profile_id, course_id, final_grade')
      .in('course_id', idFilter)
      .eq('status', 'active')

    const finalByCourse = new Map<string, number | null>()
    for (const en of allEnrolls ?? []) {
      if (en.final_grade != null) finalByCourse.set(en.course_id, parseFloat(en.final_grade))
    }
    const manualBySid = new Map<string, number | null>()
    for (const en of allEnrolls ?? []) {
      if (en.final_grade != null) manualBySid.set(en.profile_id, parseFloat(en.final_grade))
    }

    const schedIdsByCourse = new Map<string, string[]>()
    for (const s of allSchedules ?? []) {
      if (!schedIdsByCourse.has(s.course_id)) schedIdsByCourse.set(s.course_id, [])
      schedIdsByCourse.get(s.course_id)!.push(s.id)
    }

    const statusMeta: Record<string, { label: string; cls: string }> = {
      approved: { label: 'Aprobado', cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
      recovery: { label: 'En recuperación', cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
      failed: { label: 'Reprobado', cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
      none: { label: 'Sin notas aún', cls: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/30' },
    }

    const coursesHtml = [...uniqueCourses.entries()].map(([courseId, course]) => {
      const minRank = course.min_rank || ''
      const okRank = meetsRank(studentRank, minRank)
      const minPass = course.min_pass_grade ?? 14

      const courseSchedIds = schedIdsByCourse.get(courseId) || []
      const courseTasks = (allTasks ?? []).filter((t: any) => t.course_id === courseId)
      const courseExams = (allExams ?? []).filter((x: any) => x.course_id === courseId)
      const ref = {
        scheduleIds: courseSchedIds,
        tasks: courseTasks.map((t: any) => ({ id: t.id, due_date: t.due_date, is_recovery: !!t.is_recovery })),
        exams: courseExams.map((x: any) => ({ id: x.id, is_final: !!x.is_final, is_recovery: !!x.is_recovery })),
      }

      const raw = buildRawScores(ref, allClassGrades ?? [], allSubmissions ?? [], allResults ?? [], uid)
      const comp = computeComponents(raw)
      const pendingRec = hasPendingRecovery(ref, allResults ?? [], allSubmissions ?? [], uid)
      const computed = weightedFinal(comp)
      const coachGrade = finalByCourse.get(courseId) ?? null
      const isManual = coachGrade !== null && !isNaN(coachGrade)
      const finalGrade = isManual ? coachGrade : computed
      const status = gradeStatus(finalGrade, minPass, pendingRec)
      const statusMetaItem = statusMeta[status]

      const rankHtml = `
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <span class="text-sm text-zinc-400">Rango requerido: ${escapeHtml(minRank || 'Ninguno')}</span>
          <span class="text-sm text-zinc-400">·</span>
          <span class="text-sm text-zinc-400">Tu rango: ${escapeHtml(studentRank || 'Sin rango')}</span>
          ${okRank
            ? `<span class="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">${Icon('checkCircle', 12)} Cumples el rango</span>`
            : `<span class="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">${Icon('xCircle', 12)} No cumples el rango</span>`
          }
        </div>`

      const componentDefs: { key: 'classes' | 'tasks' | 'exams' | 'final'; icon: string }[] = [
        { key: 'classes', icon: 'bookOpen' },
        { key: 'tasks', icon: 'clipboardList' },
        { key: 'exams', icon: 'scrollText' },
        { key: 'final', icon: 'trophy' },
      ]

      const cardsHtml = componentDefs.map(({ key, icon }) => {
        const value = comp[key]
        const isRecovery = (key === 'tasks' && raw.recoveryTaskScores.length > 0) || (key === 'exams' && raw.recoveryExamScores.length > 0)
        const displayValue = value !== null ? `${value.toFixed(1)}/20` : '—'
        const colorClass = value !== null
          ? (value >= 14 ? 'text-green-400' : value >= 11 ? 'text-yellow-400' : 'text-red-400')
          : 'text-zinc-500'
        return `
          <div class="glass rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                ${Icon(icon, 20)}
              </div>
              <div>
                <p class="text-sm text-zinc-400">${COMPONENT_LABELS[key]}${isRecovery ? ' <span class="text-xs text-yellow-400 font-medium">· Rec</span>' : ''}</p>
                <p class="text-lg font-bold ${colorClass}">${displayValue}</p>
              </div>
            </div>
            <span class="text-sm text-zinc-500">${GRADE_WEIGHTS[key]}%</span>
          </div>`
      }).join('')

      const considered = (['classes', 'tasks', 'exams', 'final'] as const)
        .filter(k => comp[k] !== null && comp[k] !== undefined)
        .map(k => COMPONENT_LABELS[k])
      const weightsNote = considered.length > 0
        ? `<p class="text-xs text-zinc-500">Componentes considerados: ${considered.join(' · ')} — el peso se reparte automáticamente entre ellos.</p>`
        : ''

      let finalHtml = ''
      if (!okRank) {
        finalHtml = `<div class="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-2xl font-bold text-red-400">NP — Rango insuficiente</p>
        </div>`
      } else if (finalGrade === null) {
        finalHtml = `<div class="mt-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-2xl font-bold text-zinc-500">—</p>
        </div>`
      } else {
        const colorCls = finalGrade >= 14 ? 'text-green-400' : finalGrade >= 11 ? 'text-yellow-400' : 'text-red-400'
        finalHtml = `<div class="mt-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-3xl font-bold ${colorCls}">${finalGrade.toFixed(1)}/20</p>
          <span class="mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMetaItem.cls}">${statusMetaItem.label}</span>
          <p class="mt-1 text-xs text-zinc-500">Mínimo para aprobar: ${minPass}/20</p>
          ${isManual ? '<p class="mt-1 text-xs text-zinc-500">Asignada por tu coach</p>' : ''}
        </div>`
      }

      let rankingHtml = ''
      if (okRank && finalGrade !== null) {
        const courseStudents = (allEnrolls ?? []).filter((en: any) => en.course_id === courseId).map((en: any) => en.profile_id)
        const finals: number[] = []
        for (const sid of courseStudents) {
          const r = buildRawScores(ref, allClassGrades ?? [], allSubmissions ?? [], allResults ?? [], sid)
          const manual = manualBySid.get(sid)
          const f = manual !== null && manual !== undefined && !isNaN(manual) ? manual : weightedFinal(computeComponents(r))
          if (f !== null) finals.push(f)
        }
        const sorted = [...finals].sort((a, b) => b - a)
        const position = sorted.findIndex((f: number) => f === finalGrade) + 1
        const total = sorted.length
        if (total > 0) {
          const pct = Math.round((position / total) * 100)
          rankingHtml = `
            <div class="mt-4 rounded-xl border border-zinc-800 bg-[#111] p-4">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm text-zinc-400">${Icon('trophy', 14)} Posición en el curso</p>
                <p class="text-sm font-bold text-white">#${position} de ${total}</p>
              </div>
              <div class="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1]" style="width:${pct}%"></div>
              </div>
            </div>`
        }
      }

      return `
        <div class="mb-8">
          <h2 class="font-heading text-xl font-bold text-white mb-2">${escapeHtml(course.name || 'Curso')}</h2>
          ${rankHtml}
          <div class="space-y-3">
            ${cardsHtml}
          </div>
          ${weightsNote}
          ${finalHtml}
          ${rankingHtml}
        </div>`
    }).join('')

    const previewBanner = isStudentPreview()
      ? `<div class="mb-6 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-4 text-sm text-[#A78BFA]">${Icon('eye', 15)} Vista previa como alumno — notas calculadas sin tus entregas.</div>`
      : ''

    const html = `
      <div class="mb-6">
        <span class="kicker">Rendimiento académico</span>
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('scrollText', 22)} Mis notas</h1>
        <p class="mt-1 text-sm text-zinc-500">Clases 30% · Tareas 20% · Exámenes 25% · Examen final 25%</p>
      </div>
      ${previewBanner}
      ${coursesHtml}`

    document.getElementById('page-content')!.innerHTML = html

  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
