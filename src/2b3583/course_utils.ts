import { supabase } from '@/304244'

const GENERAL_COURSE_IDS = [
  'e7f7f24d-8c5a-4006-99cf-7a74907ff3b0', // CLASE GENERAL
  'aea1376e-95d2-4dec-a4ef-07b2395e8f78', // CLASE COMPLEMENTARIA
]

export async function autoEnrollGeneralCourses(profileId: string, type: string): Promise<void> {
  for (const courseId of GENERAL_COURSE_IDS) {
    const { data: exists } = await supabase.from('enrollments').select('id').eq('profile_id', profileId).eq('course_id', courseId).maybeSingle()
    if (exists) continue

    const { data: enr, error } = await supabase.from('enrollments').insert({
      profile_id: profileId, course_id: courseId, type, status: 'active',
    }).select('id').maybeSingle()
    if (error || !enr) {
      console.error('Error enrolling in general course:', courseId, error)
      continue
    }

    const { error: pe } = await supabase.from('payments').insert({
      profile_id: profileId, enrollment_id: enr.id, type, status: 'free', amount: 0,
    })
    if (pe) console.error('Error creating payment for general course:', pe)
  }
}
