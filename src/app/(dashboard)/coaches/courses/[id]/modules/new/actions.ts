'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createModule(formData: FormData) {
  const supabase = await createClient()
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').insert({
    course_id: courseId,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    month_number: parseInt(formData.get('monthNumber') as string),
    display_order: parseInt(formData.get('displayOrder') as string),
  })

  revalidatePath(`/coaches/courses/${courseId}`)
  redirect(`/coaches/courses/${courseId}`)
}
