import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'

function scoreToLetter(score: number): string {
  const s = Math.round(score)
  if (s >= 18) return 'AD'
  if (s >= 14) return 'A'
  if (s >= 11) return 'B'
  if (s >= 5) return 'C'
  return 'D'
}

export async function recalcFinalGrade(enrollmentId: string): Promise<void> {
  if (!enrollmentId) return
  const { data: enrollment } = await supabase.from('enrollments').select('id, profile_id, course_id').eq('id', enrollmentId).maybeSingle()
  if (!enrollment) return

  // 1. Monthly grades (60%) — average score 0-20
  const { data: months } = await supabase.from('monthly_grades').select('score').eq('enrollment_id', enrollmentId)
  let monthlyAvg = 0
  if (months && months.length > 0) {
    monthlyAvg = months.reduce((s: number, m: any) => s + Number(m.score), 0) / months.length
  }

  // 2. Exam attempts (20%) — score is 0-20
  const { data: exams } = await supabase.from('exam_attempts').select('score').eq('enrollment_id', enrollmentId).not('score', 'is', null)
  let examAvg = 0
  if (exams && exams.length > 0) {
    examAvg = exams.reduce((s: number, e: any) => s + Number(e.score), 0) / exams.length
  }

  // 3. Task submissions (20%) — score relative to max_score
  const { data: tasks } = await supabase.from('task_submissions').select('score, tasks!inner(max_score)').eq('enrollment_id', enrollmentId).not('score', 'is', null)
  let taskAvg = 0
  if (tasks && tasks.length > 0) {
    const vals: number[] = []
    for (const t of tasks) {
      const maxScore = (t as any).tasks?.max_score
      if (maxScore && maxScore > 0) vals.push((Number(t.score) / Number(maxScore)) * 20)
    }
    if (vals.length > 0) taskAvg = vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const hasMonthly = months && months.length > 0
  let finalScore20: number
  if (hasMonthly) {
    finalScore20 = (monthlyAvg * 0.6) + (examAvg * 0.2) + (taskAvg * 0.2)
  } else {
    // No monthly grades yet — use only exams + tasks, normalized
    let totalWeight = 0
    let totalScore = 0
    if (exams && exams.length > 0) { totalScore += examAvg * 0.5; totalWeight += 0.5 }
    if (tasks && tasks.length > 0) { totalScore += taskAvg * 0.5; totalWeight += 0.5 }
    finalScore20 = totalWeight > 0 ? totalScore / totalWeight : 0
  }

  const finalGrade = Math.round(finalScore20)
  const letter = scoreToLetter(finalScore20)

  await supabase.from('enrollments').update({ final_grade: finalGrade }).eq('id', enrollmentId)
}

export async function recalcAllEnrollmentsForProfile(profileId: string): Promise<void> {
  const { data: enrolls } = await supabase.from('enrollments').select('id, course_id').eq('profile_id', profileId).eq('status', 'active')
  for (const e of enrolls ?? []) {
    await recalcFinalGrade(e.id)
    await checkAutoPromotion(e.id, e.course_id, profileId)
  }
}

export async function checkAutoPromotion(enrollmentId: string, courseId: string, profileId: string): Promise<void> {
  const { data: enrollment } = await supabase.from('enrollments').select('final_grade, status').eq('id', enrollmentId).maybeSingle()
  if (!enrollment || enrollment.status !== 'active') return
  const grade = enrollment.final_grade
  if (grade === null || grade < 14) return

  const { data: course } = await supabase.from('courses').select('name, display_order').eq('id', courseId).maybeSingle()
  if (!course) return
  const { data: nextCourse } = await supabase
    .from('courses').select('id, name, min_rank').eq('is_active', true)
    .gt('display_order', course.display_order).order('display_order').limit(1).maybeSingle()
  if (!nextCourse) return

  const { data: profile } = await supabase.from('profiles').select('rank').eq('id', profileId).maybeSingle()
  if (!profile?.rank) return
  const rankOk = !nextCourse.min_rank || profile.rank === nextCourse.min_rank
  if (!rankOk) return

  await supabase.from('enrollments').update({ status: 'graduated', promoted: true }).eq('id', enrollmentId)
  await supabase.from('promotions').insert({
    enrollment_id: enrollmentId, profile_id: profileId,
    from_course_id: courseId, to_course_id: nextCourse.id,
    grade_at_time: grade, rank_at_time: profile.rank,
  })
  const { data: newEnroll } = await supabase.from('enrollments').upsert({
    profile_id: profileId, course_id: nextCourse.id,
    type: 'student', status: 'active', current_module: 1,
  }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true }).select('id').maybeSingle()

  if (newEnroll) {
    const { data: promCourse } = await supabase.from('courses').select('price').eq('id', nextCourse.id).maybeSingle()
    const coursePrice = promCourse?.price ?? 1.54
    const { data: promProfile } = await supabase.from('profiles').select('scholarship').eq('id', profileId).maybeSingle()
    const hasScholarship = promProfile?.scholarship === true
    let payStatus: string
    if (coursePrice === 0) payStatus = 'free'
    else if (hasScholarship) payStatus = 'scholarship'
    else payStatus = 'pending'
    await supabase.from('payments').upsert({
      profile_id: profileId, enrollment_id: newEnroll.id,
      type: 'student', amount: coursePrice, status: payStatus,
    }, { onConflict: 'enrollment_id', ignoreDuplicates: false })
  }

  const dn = profileId.slice(0, 8)
  console.log(`Auto-promoted ${dn}: ${course.name} → ${nextCourse.name} (grade: ${grade}, rank: ${profile.rank})`)
}
