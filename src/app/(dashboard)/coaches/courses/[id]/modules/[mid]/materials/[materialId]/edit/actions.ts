'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateMaterial(formData: FormData) {
  const supabase = await createClient()
  const materialId = formData.get('materialId') as string
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('materials').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    type: formData.get('type') as string,
    url: formData.get('url') as string,
    display_order: parseInt(formData.get('displayOrder') as string) || 0,
  }).eq('id', materialId)

  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
  redirect(`/coaches/courses/${courseId}/modules/${moduleId}`)
}
