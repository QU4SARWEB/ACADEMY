'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyUser } from '@/services/notify'

export async function gradeSubmission(formData: FormData) {
  const supabase = await createClient()
  const submissionId = formData.get('submissionId') as string
  const taskId = formData.get('taskId') as string
  const score = parseFloat(formData.get('score') as string)
  const feedback = formData.get('feedback') as string

  const { data: { user } } = await supabase.auth.getUser()

  const { data: sub } = await supabase
    .from('task_submissions')
    .select('enrollment_id, tasks(title, course_modules(course_id, courses(name)))')
    .eq('id', submissionId)
    .maybeSingle() as any

  await supabase.from('task_submissions').update({
    score,
    feedback,
    status: 'graded',
    graded_by: user?.id ?? null,
    graded_at: new Date().toISOString(),
  }).eq('id', submissionId)

  if (sub) {
    const { data: enr } = await supabase
      .from('enrollments')
      .select('profile_id')
      .eq('id', sub.enrollment_id)
      .maybeSingle()

    if (enr) {
      await notifyUser(
        enr.profile_id,
        'grade',
        `Tarea calificada: ${sub.tasks?.title}`,
        `Tu tarea fue calificada con ${score} pts.${feedback ? ` Feedback: ${feedback}` : ''}`,
        `/tasks/${taskId}`
      )
    }
  }

  revalidatePath(`/coaches/tasks/${taskId}`)
}
