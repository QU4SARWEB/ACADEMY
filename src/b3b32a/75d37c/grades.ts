import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderStudentGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id

    const [{ data: profile }, { data: enrollments }] = await Promise.all([
      supabase.from('profiles').select('rank').eq('id', uid).maybeSingle(),
      supabase.from('enrollments').select('*, courses(name, min_rank)').eq('profile_id', uid).eq('status', 'active').order('enrolled_at', { ascending: false }),
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

    const courseIds = [...uniqueCourses.keys()]
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const studentRank = profile?.rank || ''

    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('id, course_id')
      .in('course_id', idFilter)

    const scheduleIds = (allSchedules ?? []).map((s: any) => s.id)
    const schedFilter = scheduleIds.length > 0 ? scheduleIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: allClassGrades }, { data: allCourseTasks }, { data: allExamResults }, { data: allAttendance }] = await Promise.all([
      supabase.from('class_grades').select('*').in('schedule_id', schedFilter).eq('student_id', uid),
      supabase.from('course_tasks').select('id, course_id').in('course_id', idFilter),
      supabase.from('exam_results').select('*').in('course_id', idFilter).eq('student_id', uid),
      supabase.from('attendance').select('*').in('schedule_id', schedFilter).eq('student_id', uid),
    ])

    const taskIds = (allCourseTasks ?? []).map((t: any) => t.id)
    const taskIdFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']
    const { data: allSubmissions } = await supabase
      .from('task_submissions')
      .select('*')
      .in('task_id', taskIdFilter)
      .eq('student_id', uid)

    const submissions = allSubmissions ?? []

    const schedIdsByCourse = new Map<string, string[]>()
    for (const s of allSchedules ?? []) {
      if (!schedIdsByCourse.has(s.course_id)) schedIdsByCourse.set(s.course_id, [])
      schedIdsByCourse.get(s.course_id)!.push(s.id)
    }

    const taskIdsByCourse = new Map<string, string[]>()
    for (const t of allCourseTasks ?? []) {
      if (!taskIdsByCourse.has(t.course_id)) taskIdsByCourse.set(t.course_id, [])
      taskIdsByCourse.get(t.course_id)!.push(t.id)
    }

    const coursesHtml = [...uniqueCourses.entries()].map(([courseId, course]) => {
      const minRank = course.min_rank || ''
      const meetsRank = !minRank || studentRank === minRank

      const rankHtml = `
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <span class="text-sm text-zinc-400">Rango requerido: ${escapeHtml(minRank || 'Ninguno')}</span>
          <span class="text-sm text-zinc-400">·</span>
          <span class="text-sm text-zinc-400">Tu rango: ${escapeHtml(studentRank || 'Sin rango')}</span>
          ${meetsRank
            ? `<span class="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">${Icon('checkCircle', 12)} Cumples el rango</span>`
            : `<span class="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">${Icon('xCircle', 12)} No cumples el rango</span>`
          }
        </div>`

      const courseSchedIds = schedIdsByCourse.get(courseId) || []
      const classGrades = (allClassGrades ?? []).filter((g: any) => courseSchedIds.includes(g.schedule_id))
      const classScores = classGrades.map((g: any) => parseFloat(g.theory_score || '0') + parseFloat(g.practice_score || '0'))
      const classAvg = classScores.length > 0 ? classScores.reduce((a: number, b: number) => a + b, 0) / classScores.length : null

      const courseTaskIds = taskIdsByCourse.get(courseId) || []
      const taskSubmissions = submissions.filter((s: any) => courseTaskIds.includes(s.task_id) && s.score != null)
      const taskScores = taskSubmissions.map((s: any) => parseFloat(s.score))
      const taskAvg = taskScores.length > 0 ? taskScores.reduce((a: number, b: number) => a + b, 0) / taskScores.length : null

      const exams = (allExamResults ?? []).filter((e: any) => e.course_id === courseId && !e.is_final)
      const examScores = exams.map((e: any) => parseFloat(e.score))
      const examAvg = examScores.length > 0 ? examScores.reduce((a: number, b: number) => a + b, 0) / examScores.length : null

      const finalExam = (allExamResults ?? []).find((e: any) => e.course_id === courseId && e.is_final)
      const finalScore = finalExam ? parseFloat(finalExam.score) : null

      const attendanceRecords = (allAttendance ?? []).filter((a: any) => courseSchedIds.includes(a.schedule_id))
      const attendanceValues: number[] = []
      for (const a of attendanceRecords) {
        if (a.status === 'present') attendanceValues.push(20)
        else if (a.status === 'late') attendanceValues.push(10)
        else if (a.status === 'justified') attendanceValues.push(12)
        else if (a.status === 'absent') attendanceValues.push(0)
      }
      const attendanceAvg = attendanceValues.length > 0 ? attendanceValues.reduce((a: number, b: number) => a + b, 0) / attendanceValues.length : null

      const components = [
        { icon: 'bookOpen', label: 'Clases', value: classAvg, weightLabel: '25%' },
        { icon: 'clipboardList', label: 'Tareas', value: taskAvg, weightLabel: '15%' },
        { icon: 'scrollText', label: 'Exámenes', value: examAvg, weightLabel: '20%' },
        { icon: 'trophy', label: 'Examen final', value: finalScore, weightLabel: '20%' },
        { icon: 'checkCircle', label: 'Asistencia', value: attendanceAvg, weightLabel: '10%' },
      ]

      const cardsHtml = components.map(c => {
        const displayValue = c.value !== null ? `${c.value.toFixed(1)}/20` : '—'
        const colorClass = c.value !== null
          ? (c.value >= 14 ? 'text-green-400' : c.value >= 11 ? 'text-yellow-400' : 'text-red-400')
          : 'text-zinc-500'
        return `
          <div class="glass rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                ${Icon(c.icon, 20)}
              </div>
              <div>
                <p class="text-sm text-zinc-400">${c.label}</p>
                <p class="text-lg font-bold ${colorClass}">${displayValue}</p>
              </div>
            </div>
            <span class="text-sm text-zinc-500">${c.weightLabel}</span>
          </div>`
      }).join('')

      const allPresent = components.every(c => c.value !== null)
      let finalGradeHtml = ''
      if (!meetsRank) {
        finalGradeHtml = `<div class="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-2xl font-bold text-red-400">NP — Rango insuficiente</p>
        </div>`
      } else if (!allPresent) {
        finalGradeHtml = `<div class="mt-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-2xl font-bold text-zinc-500">—</p>
        </div>`
      } else if (finalScore === null) {
        finalGradeHtml = `<div class="mt-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-2xl font-bold text-yellow-400">Pendiente</p>
        </div>`
      } else {
        const finalGrade = (classAvg! * 0.25) + (taskAvg! * 0.15) + (examAvg! * 0.20) + (finalScore * 0.20) + (attendanceAvg! * 0.10)
        const finalColor = finalGrade >= 14 ? 'text-green-400' : finalGrade >= 11 ? 'text-yellow-400' : 'text-red-400'
        finalGradeHtml = `<div class="mt-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 p-4 text-center">
          <p class="text-sm text-zinc-400">Nota final</p>
          <p class="text-3xl font-bold ${finalColor}">${finalGrade.toFixed(1)}/20</p>
        </div>`
      }

      return `
        <div class="mb-8">
          <h2 class="font-heading text-xl font-bold text-white mb-2">${escapeHtml(course.name || 'Curso')}</h2>
          ${rankHtml}
          <div class="space-y-3">
            ${cardsHtml}
          </div>
          ${finalGradeHtml}
        </div>`
    }).join('')

    const html = `
      <div class="mb-6">
        <span class="kicker">Rendimiento académico</span>
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('scrollText', 22)} Mis notas</h1>
        <p class="mt-1 text-sm text-zinc-500">Resumen de calificaciones por curso</p>
      </div>
      ${coursesHtml}`

    document.getElementById('page-content')!.innerHTML = html

  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
