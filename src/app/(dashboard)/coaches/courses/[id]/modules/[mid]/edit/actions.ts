'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateModule(formData: FormData) {
  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    month_number: parseInt(formData.get('monthNumber') as string),
    display_order: parseInt(formData.get('displayOrder') as string),
  }).eq('id', moduleId)

  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
  redirect(`/coaches/courses/${courseId}/modules/${moduleId}`)
}

async function deleteModule(formData: FormData) {
  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').delete().eq('id', moduleId)

  revalidatePath(`/coaches/courses/${courseId}`)
  redirect(`/coaches/courses/${courseId}`)
}

export const deleteModuleAction = deleteModule
