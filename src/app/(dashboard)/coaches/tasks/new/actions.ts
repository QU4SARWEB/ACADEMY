'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyStudentsInCourse } from '@/services/notify'
import { parseDateTime } from '@/lib/parseDateTime'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const title = formData.get('title') as string

  const materialFile = formData.get('materialFile') as File | null
  let materialUrl: string | null = null
  if (materialFile && materialFile.size > 0) {
    const ext = materialFile.name.split('.').pop()
    const path = `task-materials/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, materialFile, { upsert: true, contentType: materialFile.type || 'application/octet-stream' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      materialUrl = publicUrl
    }
  }

  const { data: mod } = await supabase
    .from('course_modules')
    .select('course_id')
    .eq('id', moduleId)
    .maybeSingle()

  await supabase.from('tasks').insert({
    module_id: moduleId,
    season_id: formData.get('seasonId') as string,
    title,
    description: formData.get('description') as string,
    due_date: parseDateTime(formData.get('dueDate') as string),
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    allow_pdf: formData.get('allowPdf') === 'on',
    allow_image: formData.get('allowImage') === 'on',
    allow_video: formData.get('allowVideo') === 'on',
    allow_audio: formData.get('allowAudio') === 'on',
    allow_link: formData.get('allowLink') === 'on',
  })

  if (mod) {
    await notifyStudentsInCourse(
      mod.course_id,
      'task',
      `Nueva tarea: ${title}`,
      `Se ha asignado una nueva tarea en el curso.`,
      `/tasks`
    )
  }

  revalidatePath('/coaches/tasks')
  redirect('/coaches/tasks')
}
