import type { SupabaseClient } from '@supabase/supabase-js'

const RANK_ORDER: Record<string, number> = {
  Unranked: 0,
  Iron: 1,
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Platinum: 5,
  Diamond: 6,
  Ascendant: 7,
  Immortal: 8,
  Radiant: 9,
  Rookie: 1,
  Trainee: 2,
  Amateur: 3,
  Competitor: 4,
  Elite: 5,
  'Semi-Pro': 6,
  Pro: 7,
}

export function rankValue(rank: string): number {
  return RANK_ORDER[rank] ?? 0
}

export function meetsRankRequirement(studentRank: string, minRank: string): boolean {
  return rankValue(studentRank) >= rankValue(minRank)
}

export async function checkPromotionEligibility(
  supabase: SupabaseClient,
  enrollmentId: string
) {
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*, profiles!inner(rank, full_name), courses!inner(name, min_rank)')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollErr) console.error(enrollErr)
  if (!enrollment) return { eligible: false, reason: 'Inscripción no encontrada' }

  const grade = enrollment.final_grade
  const studentRank = enrollment.profiles?.rank ?? 'Unranked'
  const minRank = enrollment.courses?.min_rank ?? 'Unranked'

  const gradeOk = grade != null && grade >= 80
  const rankOk = meetsRankRequirement(studentRank, minRank)
  const alreadyPromoted = enrollment.promoted === true

  if (alreadyPromoted) {
    return { eligible: false, reason: 'Este estudiante ya fue promocionado en este curso' }
  }

  if (!gradeOk) {
    return {
      eligible: false,
      reason: `Nota insuficiente: ${grade ?? '—'}/100 (mínimo 80)`,
      grade,
      minGrade: 80,
      studentRank,
      minRank,
      gradeOk,
      rankOk,
    }
  }

  if (!rankOk) {
    return {
      eligible: false,
      reason: `Rango insuficiente: ${studentRank} (mínimo ${minRank})`,
      grade,
      minGrade: 80,
      studentRank,
      minRank,
      gradeOk,
      rankOk,
    }
  }

  return {
    eligible: true,
    reason: 'Cumple todos los requisitos',
    grade,
    minGrade: 80,
    studentRank,
    minRank,
    gradeOk,
    rankOk,
  }
}

export async function promoteStudent(
  supabase: SupabaseClient,
  enrollmentId: string,
  promotedBy: string,
  toCourseId: string | null,
  seasonId: string
) {
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*, profiles(rank)')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollErr) console.error(enrollErr)
  if (!enrollment) return { error: 'Inscripción no encontrada' }

  const eligibility = await checkPromotionEligibility(supabase, enrollmentId)
  if (!eligibility.eligible) {
    return { error: eligibility.reason }
  }

  const { error: updateErr } = await supabase
    .from('enrollments')
    .update({ status: 'graduated', promoted: true })
    .eq('id', enrollmentId)

  if (updateErr) console.error(updateErr)

  const { error: promoErr } = await supabase.from('promotions').insert({
    enrollment_id: enrollmentId,
    profile_id: enrollment.profile_id,
    from_course_id: enrollment.course_id,
    to_course_id: toCourseId,
    promoted_by: promotedBy,
    grade_at_time: enrollment.final_grade,
    rank_at_time: enrollment.profiles?.rank,
  })

  if (promoErr) console.error(promoErr)

  if (toCourseId) {
    const { error: newEnrollErr } = await supabase.from('enrollments').insert({
      profile_id: enrollment.profile_id,
      season_id: seasonId,
      course_id: toCourseId,
      type: 'student',
      status: 'active',
      current_module: 1,
    })
    if (newEnrollErr) console.error(newEnrollErr)
  }

  return { success: true }
}

export async function getPromotionHistory(supabase: SupabaseClient, profileId?: string) {
  let query = supabase
    .from('promotions')
    .select('*, from_course:from_course_id(name), to_course:to_course_id(name), profiles(full_name, avatar_url), promoter:promoted_by(full_name)')
    .order('created_at', { ascending: false })

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query
  if (error) console.error(error)
  return data ?? []
}
