import { supabase } from '@/304244'

const CLASE_GENERAL_ID = 'e7f7f24d-8c5a-4006-99cf-7a74907ff3b0'
export const CLASE_COMPLEMENTARIA_ID = 'aea1376e-95d2-4dec-a4ef-07b2395e8f78'

type CreateEnrollmentResult = { enrollmentId: string; payStatus: string } | { error: string }

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

export async function createEnrollmentWithPayment(
  profileId: string, courseId: string, type: string
): Promise<CreateEnrollmentResult> {
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', profileId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) return { error: 'Ya est\u00e1 inscrito en este curso' }

  const { data: newEnroll, error: enrError } = await supabase.from('enrollments').insert({
    profile_id: profileId, course_id: courseId, type, status: 'active',
  }).select('id').maybeSingle()

  if (enrError || !newEnroll) return { error: enrError?.message || 'Error al crear inscripci\u00f3n' }

  const { data: enrollCourse } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle()
  const coursePrice = enrollCourse?.price != null ? parseFloat(enrollCourse.price) : 4.99

  const { data: prof } = await supabase.from('profiles').select('scholarship').eq('id', profileId).maybeSingle()
  const payStatus = coursePrice === 0 ? 'free' : (prof?.scholarship ? 'scholarship' : 'pending')

  const { error: payErr } = await supabase.from('payments').insert({
    profile_id: profileId, enrollment_id: newEnroll.id, type, status: payStatus, amount: coursePrice,
  })

  if (payErr) {
    console.error('Error creating payment:', payErr, { profileId, enrollmentId: newEnroll.id, type, payStatus, coursePrice })
    return { error: payErr.message + ' (c\u00f3digo: ' + payErr.code + ')' }
  }

  if (payStatus === 'scholarship' && coursePrice > 0) {
    autoEnrollGeneralCourses(profileId, type)
    autoEnrollComplementaria(profileId, type)
  }

  return { enrollmentId: newEnroll.id, payStatus }
}

export async function autoEnrollGeneralCourses(profileId: string, type: string): Promise<void> {
  return enrollSingleFree(profileId, CLASE_GENERAL_ID, type)
}

export async function autoEnrollComplementaria(profileId: string, type: string): Promise<void> {
  return enrollSingleFree(profileId, CLASE_COMPLEMENTARIA_ID, type)
}
