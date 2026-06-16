import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/services/notifications'
import type { NotificationType } from '@/types'

export async function notifyUser(
  profileId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
) {
  const supabase = await createClient()
  await createNotification(supabase, { profile_id: profileId, type, title, body, link })
}

export async function notifyMultipleUsers(
  profileIds: string[],
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
) {
  const supabase = await createClient()
  for (const pid of profileIds) {
    await createNotification(supabase, { profile_id: pid, type, title, body, link })
  }
}

export async function notifyStudentsInCourse(
  courseId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string,
  excludeCoach?: boolean
) {
  const supabase = await createClient()
  const { data: students, error } = await supabase
    .from('enrollments')
    .select('profile_id')
    .eq('course_id', courseId)
    .eq('status', 'active')

  if (error) console.error(error)

  for (const s of students ?? []) {
    await createNotification(supabase, { profile_id: s.profile_id, type, title, body, link })
  }
}
