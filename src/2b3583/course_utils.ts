import { supabase } from '@/304244'

const CLASE_GENERAL_ID = 'e7f7f24d-8c5a-4006-99cf-7a74907ff3b0'
export const CLASE_COMPLEMENTARIA_ID = 'aea1376e-95d2-4dec-a4ef-07b2395e8f78'

async function enrollSingleFree(profileId: string, courseId: string, type: string): Promise<void> {
  const { data: exists } = await supabase.from('enrollments').select('id').eq('profile_id', profileId).eq('course_id', courseId).maybeSingle()
  if (exists) return

  const { data: enr, error } = await supabase.from('enrollments').insert({
    profile_id: profileId, course_id: courseId, type, status: 'active',
  }).select('id').maybeSingle()
  if (error || !enr) {
    console.error('Error enrolling in free course:', courseId, error)
    return
  }

  const { error: pe } = await supabase.from('payments').insert({
    profile_id: profileId, enrollment_id: enr.id, type, status: 'free', amount: 0,
  })
  if (pe) console.error('Error creating payment for free course:', pe)
}

export async function autoEnrollGeneralCourses(profileId: string, type: string): Promise<void> {
  return enrollSingleFree(profileId, CLASE_GENERAL_ID, type)
}

export async function autoEnrollComplementaria(profileId: string, type: string): Promise<void> {
  return enrollSingleFree(profileId, CLASE_COMPLEMENTARIA_ID, type)
}
