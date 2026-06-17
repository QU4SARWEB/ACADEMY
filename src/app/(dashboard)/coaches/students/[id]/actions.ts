'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { promoteStudent as doPromote } from '@/services/promotions'
import { notifyUser } from '@/services/notify'

export async function promoteStudentAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const studentId = formData.get('studentId') as string
  const newCourseId = formData.get('newCourseId') as string
  const seasonId = formData.get('seasonId') as string
  const enrollmentId = formData.get('enrollmentId') as string

  if (!user) return

  const result = await doPromote(supabase, enrollmentId, user.id, newCourseId, seasonId)
  if (result.error) throw new Error(result.error)

  await notifyUser(
    studentId,
    'promotion',
    '¡Felicidades! Has sido promocionado',
    'Has avanzado al siguiente curso. Sigue así.',
    '/students/grades'
  )

  revalidatePath(`/coaches/students/${studentId}`)
  redirect(`/coaches/students/${studentId}`)
}

export async function toggleScholarshipAction(formData: FormData) {
  const supabase = await createClient()
  const studentId = formData.get('studentId') as string
  const current = formData.get('current') === 'true'

  await supabase.from('profiles').update({ scholarship: !current }).eq('id', studentId)
  revalidatePath(`/coaches/students/${studentId}`)
}

export async function toggleActiveAction(formData: FormData) {
  const supabase = await createClient()
  const studentId = formData.get('studentId') as string
  const current = formData.get('current') === 'true'

  await supabase.from('profiles').update({ is_active: !current }).eq('id', studentId)
  revalidatePath(`/coaches/students/${studentId}`)
}

export async function unenrollStudentAction(formData: FormData) {
  const supabase = await createClient()
  const enrollmentId = formData.get('enrollmentId') as string
  const studentId = formData.get('studentId') as string

  await supabase.from('enrollments').update({ status: 'dropped' }).eq('id', enrollmentId)
  revalidatePath(`/coaches/students/${studentId}`)
}
