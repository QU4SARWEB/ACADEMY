import type { SupabaseClient } from '@supabase/supabase-js'

export async function calculateFinalGrade(
  supabase: SupabaseClient,
  enrollmentId: string
) {
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*, courses!inner(id)')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollErr) console.error(enrollErr)
  if (!enrollment) return null

  const courseId = enrollment.course_id

  const { data: modules, error: modErr } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  if (modErr) console.error(modErr)
  const moduleIds = (modules ?? []).map((m: { id: string }) => m.id)

  let evalsScore = 0

  if (moduleIds.length > 0) {
    const { data: evaluations, error: evalsErr } = await supabase
      .from('evaluations')
      .select('id, max_score, weight')
      .in('module_id', moduleIds)

    if (evalsErr) console.error(evalsErr)

    for (const ev of evaluations ?? []) {
      if (ev.weight && ev.weight > 0) {
        const { data: grade, error: gradeErr } = await supabase
          .from('evaluation_results')
          .select('score')
          .eq('evaluation_id', ev.id)
          .eq('enrollment_id', enrollmentId)
          .maybeSingle()

        if (gradeErr) console.error(gradeErr)
        if (grade?.score != null && ev.max_score && ev.max_score > 0) {
          const pct = grade.score / ev.max_score
          evalsScore += pct * ev.weight
        }
      }
    }
  }

  const { count: totalSessions, error: totalErr } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)

  if (totalErr) console.error(totalErr)

  const { count: presentCount, error: presentErr } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .in('status', ['present', 'late'])

  if (presentErr) console.error(presentErr)

  const attendancePct =
    totalSessions && totalSessions > 0 ? (presentCount ?? 0) / totalSessions : 0

  const examScore = (enrollment as any).exam_score ?? 0
  const examPct = examScore / 100

  const finalGrade = examPct * 50 + evalsScore * 35 + attendancePct * 15
  const rounded = Math.round(finalGrade * 100) / 100

  const { error: updateErr } = await supabase
    .from('enrollments')
    .update({ final_grade: rounded })
    .eq('id', enrollmentId)

  if (updateErr) console.error(updateErr)

  return rounded
}

export async function getGradeBreakdown(
  supabase: SupabaseClient,
  enrollmentId: string
) {
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*, courses(name)')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollErr) console.error(enrollErr)
  if (!enrollment) return null

  const { data: modules, error: modErr } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', enrollment.course_id)

  if (modErr) console.error(modErr)

  const moduleIds = (modules ?? []).map((m: { id: string }) => m.id)

  let evalsWithGrades: any[] = []

  if (moduleIds.length > 0) {
    const { data: evaluations, error: evalsErr } = await supabase
      .from('evaluations')
      .select('id, title, max_score, weight')
      .in('module_id', moduleIds)

    if (evalsErr) console.error(evalsErr)

    evalsWithGrades = await Promise.all(
      (evaluations ?? []).map(async (ev: any) => {
        const { data: grade, error: gradeErr } = await supabase
          .from('evaluation_results')
          .select('score')
          .eq('evaluation_id', ev.id)
          .eq('enrollment_id', enrollmentId)
          .maybeSingle()
        if (gradeErr) console.error(gradeErr)
        return { ...ev, score: grade?.score ?? null }
      })
    )
  }

  const { count: totalSessions, error: totalErr } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)

  if (totalErr) console.error(totalErr)

  const { count: presentCount, error: presentErr } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .in('status', ['present', 'late'])

  if (presentErr) console.error(presentErr)

  const attendancePct =
    totalSessions && totalSessions > 0 ? ((presentCount ?? 0) / totalSessions) * 100 : 0

  const examPct = ((enrollment.exam_score ?? 0) / 100) * 50

  let evalsPct = 0
  for (const ev of evalsWithGrades) {
    if (ev.score != null && ev.max_score && ev.max_score > 0) {
      evalsPct += (ev.score / ev.max_score) * (ev.weight ?? 0)
    }
  }

  return {
    enrollment,
    examScore: enrollment.exam_score,
    examWeight: 50,
    examContribution: Math.round(examPct * 100) / 100,
    evaluations: evalsWithGrades,
    evalsWeight: 35,
    evalsContribution: Math.round(evalsPct * 100) / 100,
    attendancePct: Math.round(attendancePct * 100) / 100,
    attendanceWeight: 15,
    attendanceContribution: Math.round((attendancePct / 100) * 15 * 100) / 100,
    finalGrade: enrollment.final_grade,
  }
}
