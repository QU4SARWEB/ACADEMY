'use server'

import { createClient } from '@/lib/supabase/server'
import { getGradeBreakdown as getBreakdown, calculateFinalGrade as calcGrade } from '@/services/grades'
import { revalidatePath } from 'next/cache'

export async function getGradeBreakdown(enrollmentId: string) {
  const supabase = await createClient()
  return getBreakdown(supabase, enrollmentId)
}

export async function calculateFinalGrade(enrollmentId: string) {
  const supabase = await createClient()
  const result = await calcGrade(supabase, enrollmentId)
  revalidatePath('/coaches/courses', 'layout')
  return result
}
