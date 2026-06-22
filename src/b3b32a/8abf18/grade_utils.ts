import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'

export async function recalcFinalGrade(enrollmentId: string): Promise<void> {
  if (!enrollmentId) return
  const { data: enrollment } = await supabase.from('enrollments').select('id, profile_id, course_id').eq('id', enrollmentId).maybeSingle()
  if (!enrollment) return
  const profileId = enrollment.profile_id
  const scores: number[] = []

  // 1. Exam attempts via this enrollment
  const { data: exams } = await supabase.from('exam_attempts').select('score').eq('enrollment_id', enrollmentId).not('score', 'is', null)
  for (const e of exams ?? []) { if (e.score !== null) scores.push(e.score) }

  // 2. Task submissions via this enrollment
  const { data: tasks } = await supabase.from('task_submissions').select('score').eq('enrollment_id', enrollmentId).not('score', 'is', null)
  for (const t of tasks ?? []) { if (t.score !== null) scores.push(t.score) }

  // 3. Manual grades via profile_id
  const { data: grades } = await supabase.from('grades').select('score').eq('profile_id', profileId)
  for (const g of grades ?? []) { if (g.score !== null) scores.push(g.score) }

  // 4. Practical scores via practical_team_members
  const { data: members } = await supabase.from('practical_team_members').select('id').eq('enrollment_id', enrollmentId)
  const memberIds = (members ?? []).map(m => m.id)
  if (memberIds.length > 0) {
    const { data: pScores } = await supabase.from('practical_scores').select('score').in('practical_team_member_id', memberIds).not('score', 'is', null)
    for (const ps of pScores ?? []) { if (ps.score !== null) scores.push(ps.score) }
  }

  if (scores.length === 0) return
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  await supabase.from('enrollments').update({ final_grade: avg }).eq('id', enrollmentId)
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
  if (grade === null || grade < 70) return

  // Get current course's min_rank and next course
  const { data: course } = await supabase.from('courses').select('name, display_order').eq('id', courseId).maybeSingle()
  if (!course) return
  const { data: nextCourse } = await supabase
    .from('courses')
    .select('id, name, min_rank')
    .eq('is_active', true)
    .gt('display_order', course.display_order)
    .order('display_order')
    .limit(1)
    .maybeSingle()
  if (!nextCourse) return

  // Check rank requirement
  const { data: profile } = await supabase.from('profiles').select('rank').eq('id', profileId).maybeSingle()
  if (!profile?.rank) return
  const rankOk = !nextCourse.min_rank || profile.rank === nextCourse.min_rank

  if (!rankOk) return // rank not met, can't promote

  // Auto-promote: find active season and create new enrollment
  const { data: season } = await supabase.from('courses').select('id').eq('is_active', true).maybeSingle()
  if (!season) return

  await supabase.from('enrollments').update({ status: 'graduated', promoted: true }).eq('id', enrollmentId)
  await supabase.from('promotions').insert({
    enrollment_id: enrollmentId, profile_id: profileId,
    from_course_id: courseId, to_course_id: nextCourse.id,
    grade_at_time: grade, rank_at_time: profile.rank,
  })
  await supabase.from('enrollments').upsert({
    profile_id: profileId, course_id: nextCourse.id,
    type: 'student', status: 'active', current_module: 1,
  }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true })

  const dn = profileId.slice(0, 8)
  console.log(`Auto-promoted ${dn}: ${course.name} → ${nextCourse.name} (grade: ${grade}, rank: ${profile.rank})`)
}
