'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkPromotionEligibility, promoteStudent as doPromote, getPromotionHistory } from '@/services/promotions'
import { logAudit } from '@/services/audit'

export async function checkEligibility(enrollmentId: string) {
  const supabase = await createClient()
  return checkPromotionEligibility(supabase, enrollmentId)
}

export async function promoteStudentAction(
  enrollmentId: string,
  toCourseId: string | null,
  seasonId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const result = await doPromote(supabase, enrollmentId, user.id, toCourseId, seasonId)

  if (result.success) {
    await logAudit(supabase, {
      profile_id: user.id,
      action: 'promote_student',
      module: 'promotions',
      description: `Estudiante promocionado de curso`,
      metadata: { enrollment_id: enrollmentId, to_course_id: toCourseId },
    })
  }

  revalidatePath('/coaches/students', 'layout')
  revalidatePath('/coaches/promotions', 'layout')
  return result
}

export async function fetchPromotionHistory(profileId?: string) {
  const supabase = await createClient()
  return getPromotionHistory(supabase, profileId)
}
